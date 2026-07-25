//! Authentication (ADR-0003): short-lived Ed25519 JWT access tokens served
//! alongside a JWKS, paired with opaque, revocable, DB-backed refresh tokens.
//!
//! This is deliberately *not* OAuth2. Every client is first-party, so there is
//! no authorization server, no scopes, no consent screen and no client
//! registry — but the token format is asymmetric from day one, so becoming an
//! OAuth2 server later is additive rather than a migration.

pub mod audit;
pub mod denylist;
pub mod extractor;
pub mod keys;
pub mod password;
pub mod refresh;
pub mod secret;
pub mod throttle;
pub mod token;

pub use extractor::AuthenticatedAthlete;
