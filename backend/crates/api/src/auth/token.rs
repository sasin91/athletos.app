//! Access tokens: short-lived, Ed25519-signed JWTs (ADR-0003).

use chrono::Utc;
use jsonwebtoken::{Algorithm, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::keys::KeyRing;
use crate::config::AuthConfig;

/// Small tolerance for clock skew between the API and whatever verifies a
/// token. Deliberately far shorter than the token's own lifetime.
const CLOCK_SKEW_LEEWAY_SECONDS: u64 = 5;

/// The access token payload. Registered claim names only — a first-party token
/// still has no reason to invent its own vocabulary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessClaims {
    /// The authenticated athlete's id.
    pub sub: Uuid,
    pub iss: String,
    pub aud: String,
    /// Expiry, seconds since the Unix epoch.
    pub exp: i64,
    /// Issued-at, seconds since the Unix epoch.
    pub iat: i64,
    /// Unique token id, so a specific token can be named in an audit record
    /// without reproducing the token itself.
    pub jti: Uuid,
}

#[derive(Debug, thiserror::Error)]
pub enum TokenError {
    #[error("the token could not be signed")]
    Signing,
    /// One error for every way a token can fail to be acceptable. The client is
    /// told only "unauthenticated"; distinguishing "expired" from "forged" for
    /// them buys an attacker information and buys us nothing.
    #[error("the token is not valid")]
    Invalid,
}

/// Signs an access token for `athlete_id` using the current signing key.
pub fn issue_access_token(
    keys: &KeyRing,
    config: &AuthConfig,
    athlete_id: Uuid,
) -> Result<(String, i64), TokenError> {
    let issued_at = Utc::now();
    let expires_at = issued_at
        + chrono::Duration::from_std(config.access_token_ttl).map_err(|_| TokenError::Signing)?;

    let claims = AccessClaims {
        sub: athlete_id,
        iss: config.issuer.clone(),
        aud: config.audience.clone(),
        exp: expires_at.timestamp(),
        iat: issued_at.timestamp(),
        jti: Uuid::now_v7(),
    };

    let mut header = Header::new(Algorithm::EdDSA);
    // The `kid` is what lets a verifier pick the right key out of the JWKS, and
    // therefore what makes rotation possible without a flag day.
    header.kid = Some(keys.signing_kid().to_owned());

    let token = jsonwebtoken::encode(&header, &claims, keys.encoding_key())
        .map_err(|_| TokenError::Signing)?;

    Ok((token, config.access_token_ttl.as_secs() as i64))
}

/// Verifies an access token and returns its claims.
///
/// The `kid` selects exactly one key; an unknown `kid` fails rather than
/// falling back to trying every key, so a retired key can be dropped from the
/// ring and immediately stop being trusted.
pub fn verify_access_token(
    keys: &KeyRing,
    config: &AuthConfig,
    token: &str,
) -> Result<AccessClaims, TokenError> {
    let header = jsonwebtoken::decode_header(token).map_err(|_| TokenError::Invalid)?;
    let kid = header.kid.ok_or(TokenError::Invalid)?;
    let key = keys.decoding_key(&kid).ok_or(TokenError::Invalid)?;

    let mut validation = Validation::new(Algorithm::EdDSA);
    validation.leeway = CLOCK_SKEW_LEEWAY_SECONDS;
    validation.set_issuer(&[&config.issuer]);
    validation.set_audience(&[&config.audience]);
    validation.set_required_spec_claims(&["exp", "iss", "aud", "sub"]);

    jsonwebtoken::decode::<AccessClaims>(token, key, &validation)
        .map(|data| data.claims)
        .map_err(|_| TokenError::Invalid)
}
