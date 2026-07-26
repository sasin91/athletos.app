//! Shared application state handed to every handler.

use std::sync::Arc;

use sqlx::PgPool;

use crate::auth::keys::{KeyError, KeyRing};
use crate::auth::password::PasswordPolicy;
use crate::config::AuthConfig;

/// Token settings, key material and the password policy, resolved once at
/// startup.
///
/// Shared behind an `Arc` because `KeyRing` holds prepared signing state that
/// is expensive to rebuild and must not be cloned per request. The same applies
/// to `PasswordPolicy`: it owns the decompressed breach corpus and, when
/// enabled, a connection-pooling HTTP client.
#[derive(Debug)]
pub struct AuthContext {
    pub config: AuthConfig,
    pub keys: KeyRing,
    pub passwords: PasswordPolicy,
}

impl AuthContext {
    pub fn new(config: AuthConfig) -> Result<Self, KeyError> {
        let keys = KeyRing::from_config(&config)?;
        let passwords = PasswordPolicy::from_config(&config);
        Ok(Self {
            config,
            keys,
            passwords,
        })
    }
}

#[derive(Debug, Clone)]
pub struct AppState {
    pub db: PgPool,
    pub auth: Arc<AuthContext>,
}

impl AppState {
    pub fn new(db: PgPool, auth: Arc<AuthContext>) -> Self {
        Self { db, auth }
    }

    /// State for tests and local experiments: a throwaway signing key that
    /// lives and dies with the process. Never reachable from `Config::from_env`
    /// without an explicit opt-in and a non-production `APP_ENV`.
    pub fn with_ephemeral_auth(db: PgPool) -> Self {
        let auth = AuthContext::new(AuthConfig::ephemeral_for_development())
            .expect("an ephemeral key ring is always constructible");
        Self::new(db, Arc::new(auth))
    }
}
