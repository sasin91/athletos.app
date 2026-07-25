//! Shared application state handed to every handler.

use std::sync::Arc;

use sqlx::PgPool;

use crate::auth::keys::{KeyError, KeyRing};
use crate::auth::password::PasswordPolicy;
use crate::config::AuthConfig;
use crate::mail::Mailer;
use crate::storage::ObjectStore;

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

    /// Where image bytes live (ADR-0010).
    ///
    /// Optional so that a test about scheduling or authentication does not have
    /// to stand up a bucket to construct the router. It is `None` only in that
    /// case: `main` always configures one, and `Config::from_env` refuses to
    /// start without the `S3_*` variables — so a real deployment cannot reach
    /// the `None` arm. The image handlers say so explicitly rather than
    /// unwrapping.
    pub objects: Option<Arc<ObjectStore>>,

    /// Where invitation mail goes out (`mail.rs`). `Option` on exactly the
    /// same reasoning as `objects`: a test about scheduling should not have to
    /// configure SMTP, `main` always attaches one, and `Config::from_env`
    /// refuses to start without the `SMTP_*` variables.
    pub mailer: Option<Arc<dyn Mailer>>,
}

impl AppState {
    pub fn new(db: PgPool, auth: Arc<AuthContext>) -> Self {
        Self {
            db,
            auth,
            objects: None,
            mailer: None,
        }
    }

    /// Attaches the bucket. Separate from [`Self::new`] so adding image storage
    /// did not change the signature every existing call site uses.
    pub fn with_object_store(mut self, objects: Arc<ObjectStore>) -> Self {
        self.objects = Some(objects);
        self
    }

    /// Attaches outbound mail, on the same builder shape as the bucket.
    pub fn with_mailer(mut self, mailer: Arc<dyn Mailer>) -> Self {
        self.mailer = Some(mailer);
        self
    }

    /// The mailer, or the error the invitation handler returns when the
    /// process was started without one.
    pub fn mailer(&self) -> Result<&dyn Mailer, crate::error::ApiError> {
        self.mailer.as_deref().ok_or_else(|| {
            crate::error::ApiError::Internal("outbound mail is not configured".to_owned())
        })
    }

    /// The bucket, or the error the image handlers return when the process was
    /// started without one.
    pub fn objects(&self) -> Result<&ObjectStore, crate::error::ApiError> {
        self.objects.as_deref().ok_or_else(|| {
            crate::error::ApiError::Internal("object storage is not configured".to_owned())
        })
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
