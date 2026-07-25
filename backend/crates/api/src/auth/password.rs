//! Password policy and hashing.
//!
//! Argon2id is the current recommendation for password storage: memory-hard, so
//! GPU and ASIC attacks lose most of their advantage. That memory-hardness is
//! precisely why every call here goes through `spawn_blocking` — a hash takes
//! tens of milliseconds of solid CPU and would stall the async runtime's worker
//! thread if run inline.
//!
//! The other half of the module is the guessability policy of NIST SP
//! 800-63B-4 §3.1.1.2: a candidate is compared against a bundled corpus of
//! breached and commonly-used passwords, against repetitive and sequential
//! patterns, and against context-specific words — the service's own name, the
//! athlete's email address and their display name. A deployment may
//! additionally consult Have I Been Pwned's range API, which is off unless
//! configured (see [`PasswordPolicy`] and ADR-0011).

use std::future::Future;
use std::io::Read;
use std::pin::Pin;
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::{Algorithm, Argon2, Params, Version};
use flate2::read::GzDecoder;
use sha1::{Digest, Sha1};

use crate::config::AuthConfig;
use crate::error::{ApiError, ApiResult};

/// OWASP's Argon2id baseline: 19 MiB, 2 passes, 1 lane. Stated explicitly
/// rather than taken from `Params::default()` so a dependency bump cannot
/// quietly weaken stored hashes.
const MEMORY_KIB: u32 = 19 * 1024;
const ITERATIONS: u32 = 2;
const PARALLELISM: u32 = 1;

/// NIST SP 800-63B-4 §3.1.1.2: verifiers SHALL require at least 8 characters
/// and SHOULD require at least 15. We follow the SHOULD — a memorable
/// passphrase clears 15 easily, and length is the only property that reliably
/// buys resistance to offline guessing.
pub const MIN_PASSWORD_LENGTH: usize = 15;

/// The same clause requires accepting at least 64 characters and forbids
/// truncation. The cap is far above that floor and exists only so a
/// pathologically large body cannot buy an attacker unbounded Argon2 work; an
/// over-long password is rejected outright rather than silently shortened.
pub const MAX_PASSWORD_LENGTH: usize = 256;

/// How long a run of identical, ascending or descending characters is tolerated
/// before the whole secret is treated as a pattern. Six is long enough that no
/// ordinary word or phrase reaches it and short enough to catch `123456…` and
/// `aaaaaa…` well before they pad a secret out to the length floor.
const MAX_RUN_LENGTH: usize = 6;

/// A secret that is some short unit repeated to fill the length floor —
/// `abababababababab` — is that unit's entropy, not the whole string's.
const MAX_REPEATED_UNIT: usize = 4;

/// Context words shorter than this are not searched for inside the candidate:
/// three-letter fragments occur inside ordinary words often enough that the
/// rule would reject good passphrases for no gain.
const MIN_CONTEXT_TOKEN: usize = 4;

/// The single message every guessability failure returns.
///
/// Deliberately one message for all of them. Telling the caller *which* check
/// fired — bundled corpus, HIBP, or their own name — would confirm to whoever
/// is holding the form that a particular string is in a particular list, and
/// (for the HIBP case) would advertise that the outbound lookup is enabled. It
/// is also phrased as advice rather than as a reprimand, because the caller has
/// to produce a *different* password and needs to know what a good one looks
/// like, not that they were careless.
const TOO_GUESSABLE: &str =
    "that password is too easy to guess — a phrase of several unrelated words, \
     not based on your name or email, works well";

/// The bundled corpus, gzipped. See `assets/README.md` for provenance and
/// licence.
const CORPUS_GZ: &[u8] = include_bytes!("../../assets/common-passwords.txt.gz");

// --- the bundled corpus ---------------------------------------------------

/// The breached-password corpus, in the folded form comparisons use.
///
/// Stored as one blob plus sorted `(offset, length)` pairs rather than a
/// `HashSet<String>`: 143k separate `String` allocations would cost roughly 7 MB
/// and 143k trips to the allocator, where this is the 1.2 MB of text plus 8
/// bytes per entry — about 2.4 MB resident — built once and searched by binary
/// search thereafter.
#[derive(Debug)]
pub struct BreachCorpus {
    blob: String,
    entries: Vec<(u32, u32)>,
}

impl BreachCorpus {
    fn load(gzipped: &[u8]) -> Self {
        let mut raw = String::new();
        GzDecoder::new(gzipped)
            .read_to_string(&mut raw)
            .expect("the bundled password corpus is valid gzip");

        let mut blob = String::with_capacity(raw.len());
        let mut entries: Vec<(u32, u32)> = Vec::with_capacity(150_000);

        for line in raw.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            // Folded on the way in so a lookup never has to fold 143k entries,
            // and so entries that differ only by case or leetspeak collapse.
            let folded = fold(line);
            let start = blob.len() as u32;
            blob.push_str(&folded);
            entries.push((start, folded.len() as u32));
        }

        // Sorted here rather than shipped sorted: the ordering that matters is
        // Rust's byte ordering of the *folded* text, which the asset does not
        // know about, and a mis-sorted asset would silently break lookups.
        entries.sort_unstable_by(|left, right| slice(&blob, *left).cmp(slice(&blob, *right)));
        entries.dedup_by(|left, right| slice(&blob, *left) == slice(&blob, *right));
        entries.shrink_to_fit();

        Self { blob, entries }
    }

    /// Whether the corpus contains this already-[`fold`]ed string.
    fn contains_folded(&self, folded: &str) -> bool {
        self.entries
            .binary_search_by(|entry| slice(&self.blob, *entry).cmp(folded))
            .is_ok()
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

fn slice(blob: &str, (start, length): (u32, u32)) -> &str {
    &blob[start as usize..(start + length) as usize]
}

static CORPUS: OnceLock<BreachCorpus> = OnceLock::new();

/// The corpus, decompressed and indexed on first use.
///
/// `PasswordPolicy::from_config` touches it at startup, so the ~40 ms of
/// decompressing and sorting is paid while the process is booting rather than
/// by whoever happens to register first.
pub fn corpus() -> &'static BreachCorpus {
    CORPUS.get_or_init(|| BreachCorpus::load(CORPUS_GZ))
}

// --- normalisation --------------------------------------------------------

/// Reduces a secret to the form comparisons happen in.
///
/// Two transformations, and no more than two, because every one of them is a
/// deliberate loss of information that widens what gets rejected:
///
/// * **Unicode lowercasing.** `Password123` and `password123` are the same
///   guess, and an attacker's list is not case-sensitive.
/// * **Leetspeak de-substitution.** `P@ssw0rd` is `password` with a costume on.
///   A single canonical mapping is applied — not every ambiguous alternative —
///   and it is applied to the corpus as well as to the candidate, so the
///   comparison stays symmetric. It can only ever match *more* than an exact
///   comparison would.
///
/// Deliberately *not* applied: whitespace trimming, because a leading space is
/// part of the secret we hash and pretending otherwise would compare something
/// other than what we store; and NFKC normalisation, which SP 800-63B-4
/// suggests but which would need another dependency to reject compatibility
/// spellings of an overwhelmingly ASCII corpus.
fn fold(raw: &str) -> String {
    raw.chars()
        .flat_map(char::to_lowercase)
        .map(de_leet)
        .collect()
}

fn de_leet(character: char) -> char {
    match character {
        '0' => 'o',
        '1' | '!' | '|' => 'i',
        '3' => 'e',
        '4' | '@' => 'a',
        '5' | '$' => 's',
        '7' => 't',
        '8' => 'b',
        '9' => 'g',
        other => other,
    }
}

// --- the policy -----------------------------------------------------------

/// What the service knows about the person choosing the password.
///
/// SP 800-63B-4 asks for "context-specific words" to be refused, and for an
/// account these are not abstract: the address and the name on the account are
/// the first two things anyone guessing tries.
#[derive(Debug, Clone, Copy)]
pub struct PasswordContext<'a> {
    pub email: &'a str,
    pub display_name: &'a str,
}

/// A boxed future, because a trait with an `async fn` is not dyn-compatible and
/// the whole point of [`PwnedRangeSource`] is that a test can substitute one.
type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

/// A source of Pwned Passwords range results.
///
/// **The signature is the security control.** It takes a five-hex-character
/// prefix and nothing else, so there is no argument through which a password —
/// or its full hash — could reach an implementation, whatever that
/// implementation later decides to do with what it is given. The SHA-1 is
/// computed in [`PasswordPolicy::check`], split there, and the tail of it never
/// crosses this boundary; matching happens locally in
/// [`range_response_contains`]. Guaranteeing that by making it unrepresentable
/// is worth more than a comment asking implementors to be careful.
pub trait PwnedRangeSource: std::fmt::Debug + Send + Sync {
    /// The raw `SUFFIX:COUNT` body for this prefix, or `None` if it could not
    /// be obtained. Errors are collapsed into `None` on purpose: the caller's
    /// decision is the same for a timeout, a 503 and a DNS failure.
    fn suffixes<'a>(&'a self, prefix: &'a str) -> BoxFuture<'a, Option<String>>;
}

/// The guessability policy, resolved once at startup and shared by every
/// request.
#[derive(Debug, Clone)]
pub struct PasswordPolicy {
    /// `None` — the default — means the bundled corpus is the whole check and
    /// nothing leaves the deployment.
    pwned_range: Option<Arc<dyn PwnedRangeSource>>,
}

impl PasswordPolicy {
    /// The default posture: bundled corpus only, no outbound call, no new
    /// sub-processor (ADR-0011).
    pub fn offline_only() -> Self {
        // Force the corpus now so the cost lands at startup.
        let _ = corpus();
        Self { pwned_range: None }
    }

    /// Reads the policy out of the auth configuration. HIBP is consulted only
    /// when `AUTH_HIBP_ENABLED=true` was set explicitly.
    pub fn from_config(config: &AuthConfig) -> Self {
        let mut policy = Self::offline_only();

        if config.hibp_enabled {
            tracing::info!(
                timeout_ms = config.hibp_timeout.as_millis(),
                "the optional Have I Been Pwned range lookup is enabled; \
                 choosing a password will make an outbound call to api.pwnedpasswords.com"
            );
            policy.pwned_range = Some(Arc::new(HibpRangeApi::new(config.hibp_timeout)));
        }

        policy
    }

    /// Substitutes the range source. Exists for tests, which must never reach
    /// the network.
    pub fn with_range_source(source: Arc<dyn PwnedRangeSource>) -> Self {
        let _ = corpus();
        Self {
            pwned_range: Some(source),
        }
    }

    pub fn consults_hibp(&self) -> bool {
        self.pwned_range.is_some()
    }

    /// The full check applied to a password the caller is *choosing*.
    ///
    /// A password is chosen in exactly two places: accepting an invitation
    /// (ADR-0016) and the one-shot `bootstrap`. There is no password-change or
    /// password-reset endpoint yet, and both must call this when they land.
    /// Login deliberately does not: re-checking at
    /// authentication time would lock out an account whose password only became
    /// breached after it was set, which SP 800-63B-4 does not ask for and which
    /// would turn a third party's data release into a denial of service.
    pub async fn check(&self, password: &str, context: PasswordContext<'_>) -> ApiResult<()> {
        validate_password(password, context)?;

        let Some(source) = &self.pwned_range else {
            return Ok(());
        };

        // The password is hashed here and split here. Only `prefix` is passed
        // on; `suffix` stays in this frame.
        let hash = sha1_hex(password);
        let (prefix, suffix) = hash.split_at(5);

        match source.suffixes(prefix).await {
            Some(body) if range_response_contains(&body, suffix) => {
                Err(ApiError::Validation(TOO_GUESSABLE.to_owned()))
            }
            Some(_) => Ok(()),
            None => {
                // **Fail open, deliberately.** An account creation that cannot
                // complete is a product failure the caller cannot work around
                // and which affects everyone for as long as the third party is
                // down; a password that slips past *this* check is still one
                // that cleared the length floor, the 143k-entry bundled corpus,
                // the pattern rules and the context rules, so the marginal
                // security loss is small and bounded. Fail-closed would hand
                // api.pwnedpasswords.com the ability to stop PixMyDay taking
                // on new athletes, which is exactly the dependency ADR-0011 keeps
                // the default deployment free of. Logged at warn so an operator
                // who turned this on can see it is not working.
                tracing::warn!(
                    "the Have I Been Pwned range lookup failed; \
                     accepting the password on the bundled corpus alone"
                );
                Ok(())
            }
        }
    }
}

/// Checks a candidate password against everything that needs no network.
///
/// Deliberately absent: composition rules. SP 800-63B-4 §3.1.1.2 states that
/// verifiers SHALL NOT impose them — "must contain a symbol" pushes users
/// toward predictable substitutions and shorter secrets, which is a net loss.
///
/// Present, in the order they are cheapest to apply: the length floor and
/// ceiling; the bundled corpus of breached and commonly-used passwords,
/// including the case where the secret is one corpus entry repeated to reach
/// the floor (`hunter2hunter2hunter2`); repetitive and sequential runs; and
/// context-specific words — the service's name, and the caller's own email
/// address and display name.
///
/// Worth being honest about the interaction between the first two: with a
/// 15-character floor, only a few hundred of the 143k corpus entries are long
/// enough to be reachable at all. The corpus still earns its place — it is what
/// catches the long-but-known secrets and the repeated units, and it is what
/// the standard asks for — but for most rejections in practice the pattern and
/// context rules are doing the work.
///
/// Lengths are counted in Unicode scalar values, not bytes, so a passphrase in
/// a non-Latin script is not penalised for its UTF-8 encoding.
pub fn validate_password(password: &str, context: PasswordContext<'_>) -> ApiResult<()> {
    let characters: Vec<char> = password.chars().collect();

    if characters.len() < MIN_PASSWORD_LENGTH {
        return Err(ApiError::Validation(format!(
            "password must be at least {MIN_PASSWORD_LENGTH} characters"
        )));
    }

    if characters.len() > MAX_PASSWORD_LENGTH {
        return Err(ApiError::Validation(format!(
            "password must be at most {MAX_PASSWORD_LENGTH} characters"
        )));
    }

    let too_guessable = || ApiError::Validation(TOO_GUESSABLE.to_owned());

    if is_patterned(&characters) {
        return Err(too_guessable());
    }

    if is_commonly_used(password, &characters) {
        return Err(too_guessable());
    }

    if matches_context(password, context) {
        return Err(too_guessable());
    }

    Ok(())
}

/// Whether the corpus knows this secret, either whole or as the unit it repeats.
fn is_commonly_used(password: &str, characters: &[char]) -> bool {
    let corpus = corpus();

    if corpus.contains_folded(&fold(password)) {
        return true;
    }

    // `hunter2hunter2hunter2` is a 21-character secret with seven characters of
    // entropy. Every whole-number repetition is checked, not just the shortest,
    // because the corpus may know `abcabc` without knowing `abc`.
    repeated_units(characters)
        .into_iter()
        .any(|unit| corpus.contains_folded(&fold(&unit)))
}

/// The units this string is an exact repetition of, shortest first.
fn repeated_units(characters: &[char]) -> Vec<String> {
    let length = characters.len();

    (1..=length / 2)
        .filter(|unit| length.is_multiple_of(*unit))
        .filter(|unit| {
            characters
                .chunks(*unit)
                .all(|chunk| chunk == &characters[..*unit])
        })
        .map(|unit| characters[..unit].iter().collect())
        .collect()
}

/// Repetitive and sequential characters, the two patterns SP 800-63B-4 names.
///
/// Applied to the lowercased text and *not* to the leetspoken fold: folding
/// turns `1` into `i` and `3` into `e`, which would hide `1234567890123456` from
/// exactly the check meant to catch it.
fn is_patterned(characters: &[char]) -> bool {
    let lowered: Vec<char> = characters
        .iter()
        .flat_map(|character| character.to_lowercase())
        .collect();

    if repeated_units(&lowered)
        .first()
        .is_some_and(|unit| unit.chars().count() <= MAX_REPEATED_UNIT)
    {
        return true;
    }

    // A run is a stretch over which the codepoint delta is constant at -1, 0 or
    // +1: `aaaaaa`, `abcdef`, `987654`. Anything else resets it.
    let mut run = 1usize;
    let mut delta: Option<i64> = None;

    for pair in lowered.windows(2) {
        let step = pair[1] as i64 - pair[0] as i64;

        if matches!(step, -1..=1) && delta == Some(step) {
            run += 1;
        } else if matches!(step, -1..=1) {
            delta = Some(step);
            run = 2;
        } else {
            delta = None;
            run = 1;
        }

        if run >= MAX_RUN_LENGTH {
            return true;
        }
    }

    false
}

/// Whether the password is built out of the words this account is named after.
///
/// Containment in either direction, because both `bergberg-2026-summer` and a
/// password that is merely a fragment of the display name are the same guess to
/// anyone who has seen the account.
fn matches_context(password: &str, context: PasswordContext<'_>) -> bool {
    let folded = fold(password);

    context_tokens(context)
        .iter()
        .any(|token| folded.contains(token.as_str()) || token.contains(folded.as_str()))
}

fn context_tokens(context: PasswordContext<'_>) -> Vec<String> {
    let mut tokens = vec!["pixmyday".to_owned()];

    let email = fold(context.email);
    // The local part only. The domain is usually a mail provider rather than
    // anything about this person, and rejecting every password containing
    // `gmail` would cost more than it buys.
    let local = email.split('@').next().unwrap_or_default().to_owned();
    tokens.push(email);
    tokens.extend(split_words(&local));
    tokens.push(local);

    let name = fold(context.display_name);
    tokens.extend(split_words(&name));
    // The name with its spacing removed: `alexberg` is the obvious contraction.
    tokens.push(name.split_whitespace().collect::<String>());

    tokens.retain(|token| token.chars().count() >= MIN_CONTEXT_TOKEN);
    tokens
}

/// Splits on anything that is not a letter, so `alex.berg+news` yields `alex`,
/// `berg` and `news`.
fn split_words(raw: &str) -> Vec<String> {
    raw.split(|character: char| !character.is_alphabetic())
        .filter(|word| !word.is_empty())
        .map(str::to_owned)
        .collect()
}

// --- Have I Been Pwned, k-anonymity ---------------------------------------

/// Uppercase hex SHA-1, the only form the Pwned Passwords index is keyed on.
///
/// SHA-1 appears in this file for this one purpose and is never used to store
/// or verify a credential — that is Argon2id's job, below.
fn sha1_hex(password: &str) -> String {
    let digest = Sha1::digest(password.as_bytes());
    digest
        .iter()
        .map(|byte| format!("{byte:02X}"))
        .collect::<String>()
}

/// Whether a range response actually lists this suffix.
///
/// The body is `SUFFIX:COUNT` per line, CRLF-separated. Two details matter:
///
/// * With `Add-Padding: true` the response is bulked out with decoy hashes so
///   its size says nothing about the prefix. Those decoys carry a count of
///   zero, so a zero count is not a match — treating one as a hit would reject
///   passwords at random.
/// * The comparison is case-insensitive; HIBP returns uppercase hex, but
///   depending on that is a needless way to fail silently.
fn range_response_contains(body: &str, suffix: &str) -> bool {
    body.lines().any(|line| {
        let Some((listed, count)) = line.trim().split_once(':') else {
            return false;
        };

        listed.eq_ignore_ascii_case(suffix)
            && count
                .trim()
                .parse::<u64>()
                .is_ok_and(|occurrences| occurrences > 0)
    })
}

/// The real range API. Constructed only when a deployment has opted in.
#[derive(Debug)]
pub struct HibpRangeApi {
    client: reqwest::Client,
}

impl HibpRangeApi {
    pub fn new(timeout: Duration) -> Self {
        let client = reqwest::Client::builder()
            // A short timeout, because this sits in the account-creation path
            // and the fail-open branch above is a perfectly good outcome. Waiting
            // 30 seconds to reach the same conclusion is not.
            .timeout(timeout)
            .user_agent("pixmyday-api")
            .build()
            .expect("a default reqwest client is always constructible");

        Self { client }
    }
}

impl PwnedRangeSource for HibpRangeApi {
    fn suffixes<'a>(&'a self, prefix: &'a str) -> BoxFuture<'a, Option<String>> {
        Box::pin(async move {
            let response = self
                .client
                .get(format!("https://api.pwnedpasswords.com/range/{prefix}"))
                // Without this the response length is a strong hint about which
                // prefix was asked for, which gives back much of what
                // k-anonymity was supposed to buy.
                .header("Add-Padding", "true")
                .send()
                .await
                .ok()?
                .error_for_status()
                .ok()?;

            // `bytes` then a lossy decode rather than `text`: the body is hex
            // and colons, so charset negotiation is dead weight.
            let body = response.bytes().await.ok()?;
            Some(String::from_utf8_lossy(&body).into_owned())
        })
    }
}

// --- hashing --------------------------------------------------------------

fn hasher() -> Argon2<'static> {
    let params = Params::new(MEMORY_KIB, ITERATIONS, PARALLELISM, None)
        .expect("the compiled-in Argon2 parameters are valid");
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
}

/// Hashes a password, returning a PHC string that carries its own salt and
/// parameters — so raising the parameters later does not invalidate old hashes.
pub async fn hash_password(password: String) -> ApiResult<String> {
    blocking(move || {
        let salt = SaltString::generate(&mut argon2::password_hash::rand_core::OsRng);
        hasher()
            .hash_password(password.as_bytes(), &salt)
            .map(|hash| hash.to_string())
            .map_err(|error| ApiError::Internal(format!("failed to hash a password: {error}")))
    })
    .await
}

/// Verifies a password against a stored PHC hash.
///
/// A malformed stored hash returns `false` rather than an error: it must not be
/// distinguishable from a wrong password by an unauthenticated caller.
pub async fn verify_password(password: String, phc_hash: String) -> ApiResult<bool> {
    blocking(move || {
        let Ok(parsed) = PasswordHash::new(&phc_hash) else {
            tracing::error!("a stored password hash is not a valid PHC string");
            return Ok(false);
        };

        Ok(hasher()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok())
    })
    .await
}

async fn blocking<T, F>(work: F) -> ApiResult<T>
where
    F: FnOnce() -> ApiResult<T> + Send + 'static,
    T: Send + 'static,
{
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|error| ApiError::Internal(format!("password hashing task failed: {error}")))?
}

#[cfg(test)]
mod tests {
    use super::*;

    const EMAIL: &str = "alex.berg@example.com";
    const DISPLAY_NAME: &str = "Alex Berg";

    fn context() -> PasswordContext<'static> {
        PasswordContext {
            email: EMAIL,
            display_name: DISPLAY_NAME,
        }
    }

    fn check(password: &str) -> ApiResult<()> {
        validate_password(password, context())
    }

    fn rejected(password: &str) -> bool {
        matches!(check(password), Err(ApiError::Validation(_)))
    }

    /// A guessability rejection must not say which list matched.
    fn rejected_as_guessable(password: &str) -> bool {
        matches!(check(password), Err(ApiError::Validation(message)) if message == TOO_GUESSABLE)
    }

    #[test]
    fn the_bundled_corpus_loaded() {
        let corpus = corpus();
        assert!(
            corpus.len() > 100_000,
            "expected a corpus on the order of 100k entries, got {}",
            corpus.len()
        );
        assert!(corpus.contains_folded(&fold("password")));
    }

    #[test]
    fn a_breached_password_long_enough_to_reach_the_corpus_is_rejected() {
        // Both are in the bundled corpus and both clear the 15-character floor,
        // so the corpus is the only thing that can be rejecting them.
        assert!(rejected_as_guessable("30secondstomars"));
        assert!(rejected_as_guessable("1qaz2wsx3edc4rfv"));
    }

    #[test]
    fn case_and_leetspeak_variants_of_a_breached_password_are_rejected() {
        for variant in [
            "30SECONDSTOMARS",
            "30SecondsToMars",
            "30secondsToMaRs",
            "3os3condstomars",
        ] {
            assert!(
                rejected_as_guessable(variant),
                "{variant} should be refused"
            );
        }
    }

    /// The case the old doc comment called out by name: a short corpus entry
    /// repeated until it clears the length floor.
    #[test]
    fn a_corpus_entry_repeated_to_reach_the_floor_is_rejected() {
        assert!(rejected_as_guessable("hunter2hunter2hunter2"));
        assert!(rejected_as_guessable("passwordpassword"));
    }

    #[test]
    fn a_long_passphrase_of_unrelated_words_is_accepted() {
        for good in [
            "purple raincoat vault seventeen",
            "many long words strung together",
            "correct horse battery staple",
        ] {
            assert!(check(good).is_ok(), "{good} should be accepted");
        }
    }

    #[test]
    fn repetitive_and_sequential_strings_are_rejected() {
        for patterned in [
            "aaaaaaaaaaaaaaaa",
            "1234567890123456",
            "abcdefghijklmnop",
            "abababababababab",
            "9876543210987654",
        ] {
            assert!(
                rejected_as_guessable(patterned),
                "{patterned} should be refused"
            );
        }
    }

    #[test]
    fn the_callers_own_email_and_display_name_are_rejected() {
        for contextual in [
            "alex.berg@example.com",
            "berg is my name ok",
            "AlexBerg forever and ever",
            "my athlete alex account",
            "pixmyday is a lovely app",
        ] {
            assert!(
                rejected_as_guessable(contextual),
                "{contextual} should be refused"
            );
        }

        // The same phrase is fine for somebody not called Berg.
        assert!(validate_password(
            "berg is my name ok",
            PasswordContext {
                email: "someone@example.com",
                display_name: "Someone Else",
            }
        )
        .is_ok());
    }

    /// The length rules keep their own specific messages — they are actionable
    /// and reveal nothing — while everything else collapses into one.
    #[test]
    fn the_length_rules_still_apply_and_say_why() {
        let short = check("short");
        assert!(
            matches!(short, Err(ApiError::Validation(message)) if message.contains("at least"))
        );

        let long = check(&"ünicode".repeat(100));
        assert!(matches!(long, Err(ApiError::Validation(message)) if message.contains("at most")));

        // Counted in scalar values, not bytes: 20 characters of Japanese is a
        // 60-byte string and is neither too short nor too long.
        assert!(!rejected("ねこいぬとりうまさるくまきつねしかたぬき"));
    }

    // --- the HIBP range path, without a network -------------------------

    /// A canned body in the shape HIBP returns for `Add-Padding: true`: real
    /// hits with positive counts, decoys with a count of zero.
    const RANGE_BODY: &str = "\
0018A45C4D1DEF81644B54AB7F969B88D65:1\r
00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2\r
011053FD0102E94D6AE2F8B83D76FAF94F6:0\r
012A7CA357541F0AC487871FEEC1891C49C:0\r
0136E006E24E7D152139815FB0FC6A50B15:3\r
";

    #[test]
    fn a_range_response_matches_a_listed_suffix() {
        assert!(range_response_contains(
            RANGE_BODY,
            "0018A45C4D1DEF81644B54AB7F969B88D65"
        ));
        assert!(range_response_contains(
            RANGE_BODY,
            "0136e006e24e7d152139815fb0fc6a50b15"
        ));
    }

    /// The padding case, and the one that would silently reject real passwords
    /// if it were wrong: a zero count is a decoy, not a hit.
    #[test]
    fn a_padded_zero_count_entry_is_not_a_match() {
        assert!(!range_response_contains(
            RANGE_BODY,
            "011053FD0102E94D6AE2F8B83D76FAF94F6"
        ));
        assert!(!range_response_contains(
            RANGE_BODY,
            "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
        ));
        assert!(!range_response_contains("nonsense\r\n", "ABC"));
    }

    #[test]
    fn the_sha1_prefix_is_five_hex_characters_of_the_upper_case_digest() {
        // The canonical example from the HIBP documentation.
        let hash = sha1_hex("P@ssw0rd");
        assert_eq!(hash, "21BD12DC183F740EE76F27B78EB39C8AD972A757");
        let (prefix, suffix) = hash.split_at(5);
        assert_eq!(prefix, "21BD1");
        assert_eq!(suffix, "2DC183F740EE76F27B78EB39C8AD972A757");
    }

    /// A range source that answers from a fixed body and records what it was
    /// asked. It cannot be handed the password: the trait will not carry one.
    #[derive(Debug)]
    struct FakeRange {
        body: Option<String>,
        asked: std::sync::Mutex<Vec<String>>,
    }

    impl FakeRange {
        fn answering(body: &str) -> Arc<Self> {
            Arc::new(Self {
                body: Some(body.to_owned()),
                asked: std::sync::Mutex::new(Vec::new()),
            })
        }

        fn unreachable() -> Arc<Self> {
            Arc::new(Self {
                body: None,
                asked: std::sync::Mutex::new(Vec::new()),
            })
        }
    }

    impl PwnedRangeSource for FakeRange {
        fn suffixes<'a>(&'a self, prefix: &'a str) -> BoxFuture<'a, Option<String>> {
            self.asked.lock().unwrap().push(prefix.to_owned());
            let body = self.body.clone();
            Box::pin(async move { body })
        }
    }

    /// Not in the bundled corpus, not patterned, not contextual — so only HIBP
    /// can reject it, which is what makes the next three tests mean something.
    const UNKNOWN_BUT_PWNED: &str = "quintessential wombat parade";

    #[tokio::test]
    async fn the_hibp_lookup_is_off_unless_configured() {
        let default = PasswordPolicy::from_config(&AuthConfig::ephemeral_for_development());
        assert!(!default.consults_hibp());
        assert!(!PasswordPolicy::offline_only().consults_hibp());

        // And with it off, a password HIBP would have flagged is accepted.
        assert!(default.check(UNKNOWN_BUT_PWNED, context()).await.is_ok());
    }

    #[tokio::test]
    async fn an_enabled_lookup_rejects_a_password_the_range_reports() {
        let hash = sha1_hex(UNKNOWN_BUT_PWNED);
        let (prefix, suffix) = hash.split_at(5);

        let range = FakeRange::answering(&format!(
            "011053FD0102E94D6AE2F8B83D76FAF94F6:0\r\n{suffix}:42\r\n"
        ));
        let policy = PasswordPolicy::with_range_source(range.clone());

        let result = policy.check(UNKNOWN_BUT_PWNED, context()).await;
        assert!(matches!(result, Err(ApiError::Validation(message)) if message == TOO_GUESSABLE));

        // Only the five-character prefix was ever handed over.
        let asked = range.asked.lock().unwrap().clone();
        assert_eq!(asked, vec![prefix.to_owned()]);
        assert_eq!(asked[0].len(), 5);
    }

    #[tokio::test]
    async fn an_enabled_lookup_accepts_a_password_the_range_does_not_report() {
        let policy = PasswordPolicy::with_range_source(FakeRange::answering(RANGE_BODY));
        assert!(policy.check(UNKNOWN_BUT_PWNED, context()).await.is_ok());
    }

    /// The documented fail-open decision, asserted so it cannot drift.
    #[tokio::test]
    async fn an_unreachable_range_api_does_not_block_account_creation() {
        let policy = PasswordPolicy::with_range_source(FakeRange::unreachable());
        assert!(policy.check(UNKNOWN_BUT_PWNED, context()).await.is_ok());

        // ...but the offline checks still run, so it is not a bypass.
        let result = policy.check("hunter2hunter2hunter2", context()).await;
        assert!(matches!(result, Err(ApiError::Validation(message)) if message == TOO_GUESSABLE));
    }
}
