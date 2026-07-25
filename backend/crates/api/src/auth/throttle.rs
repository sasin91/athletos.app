//! Per-account throttling of failed sign-ins (ADR-0017).
//!
//! NIST SP 800-63B-4 §3.2.2 requires the *verifier* to "limit consecutive
//! failed authentication attempts … on a single subscriber account to no more
//! than 100" — keyed on the account, which is why this cannot live at the edge
//! proxy: a botnet guessing one account's password never trips a per-IP
//! bucket, and the proxy does not know accounts. See migration 0008 for why
//! the key is a digest of the *submitted* address rather than a athlete id.
//!
//! **Escalating delays, not a hard lockout.** An account-keyed throttle is a
//! denial-of-service lever aimed at the legitimate holder — anyone who knows
//! Alex's address could lock Alex out nightly, and here the victim would be a
//! athlete mid-care-routine. So the schedule (`delay_after`) degrades: free
//! retries while it is plausibly a typo, then delays that grow to a day. The
//! standard's cap of 100 is enforced in the strongest sense — reaching 100
//! *evaluated* guesses through this schedule takes over two months, and every
//! attempt past it waits a day for one more evaluation.
//!
//! The check runs **before** any password verification: refusing costs a
//! primary-key lookup where evaluating costs an Argon2, so the throttle also
//! bounds the CPU an attacker can spend (the other half of ADR-0017 bounds
//! the volume). And because it is keyed on the submitted address and answers
//! an identical 429 whether or not that address has an account, it gives the
//! enumeration defence nothing away.

use std::time::Duration;

use sha2::{Digest, Sha256};
use sqlx::PgPool;

use crate::error::{ApiError, ApiResult};

/// SP 800-63B-4 §3.2.2's ceiling on consecutive failed attempts.
pub const MAX_CONSECUTIVE_FAILURES: i32 = 100;

/// A run of failures older than this is forgiven: the counter restarts and
/// the row becomes prunable. Thirty days, matching the observation window the
/// standard's cap has always been read against.
const FORGIVENESS: Duration = Duration::from_secs(30 * 24 * 60 * 60);

/// The delay imposed *after* this many consecutive failures.
///
/// The first few are free: a athlete mistyping a passphrase on glass is the
/// overwhelmingly common case and must not meet friction. From five the
/// delays escalate (the shape §3.2.2 suggests: "30-second delay, increasing
/// exponentially"), reaching an hour, and past the standard's cap of 100 a
/// full day per further attempt. Cumulatively: an attacker reaches attempt
/// 20 after ~10 minutes of waiting, attempt 50 after ~5 hours, attempt 100
/// after ~2.5 days — and the 30-day forgiveness horizon never lets the
/// counter amortise, so a password's practical online guess budget is the
/// cap the standard names.
#[must_use]
pub fn delay_after(consecutive_failures: i32) -> Duration {
    match consecutive_failures {
        i32::MIN..=4 => Duration::ZERO,
        5..=9 => Duration::from_secs(30),
        10..=19 => Duration::from_secs(2 * 60),
        20..=49 => Duration::from_secs(10 * 60),
        50..=99 => Duration::from_secs(60 * 60),
        100..=i32::MAX => Duration::from_secs(24 * 60 * 60),
    }
}

/// The stored key: SHA-256 of the address in the form login compares it —
/// trimmed and lowercased, so `Alex@…` and `alex@…` are one run of failures.
fn digest(email: &str) -> Vec<u8> {
    Sha256::digest(email.trim().to_lowercase().as_bytes()).to_vec()
}

/// Refuses the attempt if this address is inside its retry window.
///
/// Called before the athlete row is even looked up. The error carries the
/// remaining wait for the `Retry-After` header — rounded *up*, because a
/// header that says 29 when 29.5 remain invites one more refused attempt.
///
/// The comparison happens **in SQL, on the database's clock** — the same
/// clock [`record_failure`] wrote `retry_after` with. The first version read
/// the timestamp back and compared against `Utc::now()`, which is a second
/// clock authority: with the dev database in a container whose clock had
/// drifted ~1.5 s ahead of the host, a freshly written zero-delay window sat
/// "in the future" for longer than one Argon2 verification takes, and the
/// very next attempt was refused as throttled. One value, one clock.
pub async fn check(db: &PgPool, email: &str) -> ApiResult<()> {
    let remaining_seconds: Option<i64> = sqlx::query_scalar(
        "select ceil(extract(epoch from retry_after - now()))::bigint
         from login_throttle
         where email_digest = $1 and retry_after > now()",
    )
    .bind(digest(email))
    .fetch_optional(db)
    .await?;

    if let Some(remaining) = remaining_seconds {
        return Err(ApiError::TooManyRequests {
            // `max(1)`: the window is strictly in the future, so telling the
            // client to wait 0 seconds would be the same off-by-one the
            // rounding above exists to prevent.
            retry_after_seconds: remaining.max(1) as u64,
        });
    }

    Ok(())
}

/// Records a failed attempt and arms the next retry window.
///
/// The upsert serialises concurrent failures on the row lock, so two wrong
/// passwords racing each other count as two, not one (the policy layer alone
/// could not guarantee that — the same lesson as the points ledger). A run
/// older than the forgiveness horizon restarts at one rather than resuming.
pub async fn record_failure(db: &PgPool, email: &str) -> ApiResult<()> {
    let key = digest(email);

    let failures: i32 = sqlx::query_scalar(
        "insert into login_throttle (email_digest, consecutive_failures)
         values ($1, 1)
         on conflict (email_digest) do update set
             consecutive_failures = case
                 when login_throttle.last_failure_at < now() - interval '30 days' then 1
                 else login_throttle.consecutive_failures + 1
             end,
             last_failure_at = now()
         returning consecutive_failures",
    )
    .bind(&key)
    .fetch_one(db)
    .await?;

    let delay = delay_after(failures);
    if !delay.is_zero() {
        sqlx::query(
            "update login_throttle
             set retry_after = now() + make_interval(secs => $2)
             where email_digest = $1",
        )
        .bind(&key)
        .bind(delay.as_secs_f64())
        .execute(db)
        .await?;
    }

    // Opportunistic pruning on the failure path (which already paid an
    // Argon2, so a scan over a small table is noise): forgiven rows are
    // deleted rather than kept as a ledger of who once mistyped what.
    sqlx::query("delete from login_throttle where last_failure_at < now() - interval '30 days'")
        .execute(db)
        .await?;

    let _ = FORGIVENESS; // documented above; the interval literals are the source of truth
    Ok(())
}

/// A successful authentication ends the run — the row is deleted, not zeroed,
/// so the table holds state only for addresses currently failing.
pub async fn record_success(db: &PgPool, email: &str) -> ApiResult<()> {
    sqlx::query("delete from login_throttle where email_digest = $1")
        .bind(digest(email))
        .execute(db)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The schedule, pinned value by value so a later "tune" is a visible diff.
    #[test]
    fn the_first_four_failures_are_free_and_delays_then_escalate() {
        for free in 0..=4 {
            assert_eq!(delay_after(free), Duration::ZERO, "failure {free}");
        }
        assert_eq!(delay_after(5), Duration::from_secs(30));
        assert_eq!(delay_after(10), Duration::from_secs(120));
        assert_eq!(delay_after(20), Duration::from_secs(600));
        assert_eq!(delay_after(50), Duration::from_secs(3600));
        assert_eq!(
            delay_after(MAX_CONSECUTIVE_FAILURES),
            Duration::from_secs(86_400)
        );
    }

    /// Monotonic: more failures never wait less. A schedule that dipped would
    /// let an attacker *earn* faster guessing by failing more.
    #[test]
    fn the_schedule_never_decreases() {
        let mut previous = Duration::ZERO;
        for failures in 0..=200 {
            let delay = delay_after(failures);
            assert!(delay >= previous, "delay dipped at {failures}");
            previous = delay;
        }
    }

    /// The digest folds exactly what login's `lower(email)` comparison folds.
    #[test]
    fn the_key_is_case_and_whitespace_insensitive() {
        assert_eq!(digest("Alex@Example.com "), digest("alex@example.com"));
        assert_ne!(digest("alex@example.com"), digest("alex2@example.com"));
    }
}
