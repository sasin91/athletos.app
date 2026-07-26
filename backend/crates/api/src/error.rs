//! The single error type returned by handlers, rendered as RFC 9457 problem
//! details.
//!
//! Internal failures are logged in full but reported to the client only as a
//! generic message: error bodies must never leak schema details, ids, or
//! driver text.

use athletos_training::ProgramError;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("not found")]
    NotFound,

    #[error("{0}")]
    Validation(String),

    #[error("{0}")]
    Conflict(String),

    /// The request body is larger than the endpoint accepts. Distinct from
    /// [`Self::Validation`] because the caller can act on it — 413 says "send
    /// less", 422 says "send something else".
    #[error("{0}")]
    PayloadTooLarge(String),

    /// Too many consecutive failed sign-in attempts for an address
    /// (`auth::throttle`, ADR-0017). Carries the remaining
    /// wait so the response can set `Retry-After` (RFC 9110 §10.2.3) —
    /// advice a client can act on, where a bare 429 only invites immediate
    /// retries. The client-facing text is deliberately scenario-neutral (it
    /// says nothing about sign-in vs. quota, or whether an address exists);
    /// frontend copy is i18n-keyed by status code.
    #[error("too many requests — wait before trying again")]
    TooManyRequests { retry_after_seconds: u64 },

    #[error("authentication required")]
    Unauthenticated,

    #[error("not permitted")]
    Forbidden,

    #[error(transparent)]
    Database(#[from] sqlx::Error),

    /// A failure that is our fault, not the caller's — a broken signing key, a
    /// panicking blocking task. Carries context for the log only; the client is
    /// told nothing beyond "an internal error occurred".
    #[error("internal failure: {0}")]
    Internal(String),
}

/// A program refusing to work is nearly always something the caller can fix,
/// and the engine already names the fix precisely — so translating its errors
/// here, once, is what keeps every handler that touches a program from either
/// inventing its own wording or falling back on a 500.
///
/// The `MissingMax` case is the one that matters. The engine refuses to start a
/// program the athlete has no number for (5/3/1 needs four lifts, Smolov Jr
/// three), and answering that with "an internal error occurred" would leave the
/// athlete with a form to fill in and no way to learn which field. So the
/// exercise key travels into the message together with the endpoint that
/// accepts it: 422, and actionable.
impl From<ProgramError> for ApiError {
    fn from(error: ProgramError) -> Self {
        match error {
            ProgramError::MissingMax { exercise } => Self::Validation(format!(
                "this program needs a one-rep max for {exercise}; \
                 set it with PUT /v1/athlete/maxes and enrol again"
            )),

            // Not the caller's fault and not fixable by them, but not a
            // malformed request either: the block is simply over.
            ProgramError::Finished => Self::Conflict(
                "this program has no session left to prescribe; the block is finished".to_owned(),
            ),

            // Only reachable when a row written by an older build of a program
            // is read back by a newer one, which is our problem and not
            // something to explain to a client.
            ProgramError::UnreadableState { reason } => Self::Internal(format!(
                "a stored program state could not be read: {reason}"
            )),
        }
    }
}

/// RFC 9457 problem details. `type` is omitted until we publish stable problem
/// type URIs; consumers should branch on `status` plus `title` for now.
#[derive(Debug, Serialize, ToSchema)]
pub struct ProblemDetails {
    /// Short, human-readable summary of the problem type.
    #[schema(example = "Not Found")]
    pub title: String,
    /// HTTP status code, repeated in the body per RFC 9457.
    #[schema(example = 404)]
    pub status: u16,
    /// Human-readable explanation specific to this occurrence.
    pub detail: String,
}

impl ApiError {
    fn status(&self) -> StatusCode {
        match self {
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::Validation(_) => StatusCode::UNPROCESSABLE_ENTITY,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::PayloadTooLarge(_) => StatusCode::PAYLOAD_TOO_LARGE,
            Self::TooManyRequests { .. } => StatusCode::TOO_MANY_REQUESTS,
            Self::Unauthenticated => StatusCode::UNAUTHORIZED,
            Self::Forbidden => StatusCode::FORBIDDEN,
            Self::Database(_) | Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = self.status();

        // Retry-After (RFC 9110 §10.2.3) rides alongside the 429 body: the
        // one machine-readable fact a throttled client needs.
        let retry_after_seconds = match &self {
            Self::TooManyRequests {
                retry_after_seconds,
            } => Some(*retry_after_seconds),
            _ => None,
        };

        let detail = if status == StatusCode::INTERNAL_SERVER_ERROR {
            // Log the real cause; return something deliberately uninformative.
            tracing::error!(error = ?self, "request failed with an internal error");
            "An internal error occurred.".to_owned()
        } else {
            self.to_string()
        };

        let body = ProblemDetails {
            title: status.canonical_reason().unwrap_or("Error").to_owned(),
            status: status.as_u16(),
            detail,
        };

        let mut response = (status, Json(body)).into_response();
        if let Some(seconds) = retry_after_seconds {
            if let Ok(value) = seconds.to_string().parse() {
                response.headers_mut().insert("retry-after", value);
            }
        }
        response
    }
}

pub type ApiResult<T> = Result<T, ApiError>;
