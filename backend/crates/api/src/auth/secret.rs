//! Bearer secrets that are stored only as a digest.
//!
//! The opaque refresh token (ADR-0003) has this shape, and any bearer secret
//! added later should too: full-entropy CSPRNG output, and a database that
//! holds the digest rather than the secret. Writing the generator and the
//! digest more than once would be more chances to get a security primitive
//! subtly wrong, so it is written here and nowhere else.
//!
//! Nothing in this module ever logs a secret.

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine as _;
use rand::TryRngCore as _;
use sha2::{Digest, Sha256};

use crate::error::{ApiError, ApiResult};

/// 256 bits, which is the whole security argument: the secret is unguessable,
/// so the database never needs to defend a guess space.
const SECRET_BYTES: usize = 32;

/// Mints a new secret. This is the only copy that will ever exist outside the
/// holder — the digest is all that is stored.
pub fn generate() -> ApiResult<String> {
    let mut bytes = [0u8; SECRET_BYTES];
    rand::rngs::OsRng
        .try_fill_bytes(&mut bytes)
        .map_err(|error| ApiError::Internal(format!("no OS entropy available: {error}")))?;
    Ok(URL_SAFE_NO_PAD.encode(bytes))
}

/// SHA-256, not Argon2. The input is full-entropy random, so there is no guess
/// space for a slow hash to protect, and both lookups sit on a request path.
///
/// Public because a test has to be able to plant a row — an expired or revoked
/// token — whose secret it also holds.
pub fn digest(secret: &str) -> Vec<u8> {
    Sha256::digest(secret.as_bytes()).to_vec()
}
