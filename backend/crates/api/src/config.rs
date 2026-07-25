//! Process configuration, read once from the environment at startup.

use std::net::SocketAddr;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub database_max_connections: u32,
    pub bind_addr: SocketAddr,
    pub auth: AuthConfig,
    pub object_storage: ObjectStorageConfig,
    pub mail: MailConfig,
}

/// The SMTP relay invitations go out through (`mail.rs`). Mailpit in
/// development; any EU provider in production — SMTP is the boundary that
/// keeps the provider choice a credentials decision rather than a code one.
#[derive(Debug, Clone)]
pub struct MailConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub tls: SmtpTls,
    /// Optional as a *pair* — Mailpit needs none, every real relay needs both,
    /// and half a credential is a misconfiguration, not a choice.
    pub username: Option<String>,
    pub password: Option<String>,
    /// The From header, e.g. `PixMyDay <no-reply@pixmyday.example>`. Parsed
    /// (and therefore vetted) when the transport is built at startup.
    pub from: String,
    /// Where the frontend lives, for the accept link. Explicit because the API
    /// must never guess the origin it is served behind — a wrong guess mails
    /// working credentials pointing at the wrong site.
    pub public_url: String,
}

/// How the SMTP connection is protected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SmtpTls {
    /// Plaintext. Refused in production by `MailConfig::from_env` — allowed at
    /// all only because Mailpit on localhost has nothing to encrypt.
    None,
    /// Plaintext connect, upgrade via STARTTLS (typically port 587).
    StartTls,
    /// TLS from the first byte (typically port 465).
    Implicit,
}

/// Where image bytes live (ADR-0010): any S3-compatible endpoint — MinIO in
/// development, Hetzner Object Storage (EU) in production (ADR-0011).
#[derive(Debug, Clone)]
pub struct ObjectStorageConfig {
    /// Full endpoint URL, e.g. `http://localhost:9000`. Always explicit: there
    /// is no AWS default to fall back to, and a deployment that forgot to set
    /// this must not end up talking to Amazon.
    pub endpoint: String,
    pub region: String,
    pub bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,

    /// MinIO and most self-hosted gateways serve `endpoint/bucket/key` rather
    /// than `bucket.endpoint/key`, and virtual-host style additionally needs
    /// wildcard DNS. Defaults to true because that is what works everywhere the
    /// project actually deploys; set `S3_FORCE_PATH_STYLE=false` for a provider
    /// that requires virtual-host addressing.
    pub force_path_style: bool,

    /// Prepended to every object key. Empty in production; tests set a unique
    /// value per test so parallel runs against one shared bucket cannot collide
    /// or delete each other's objects.
    pub key_prefix: String,
}

/// Everything needed to issue and verify tokens (ADR-0003).
#[derive(Debug, Clone)]
pub struct AuthConfig {
    /// PKCS#8 PEM of the Ed25519 signing key, and the `kid` published for it in
    /// the JWKS. `None` means "no key configured" — only usable in development,
    /// and only with `allow_ephemeral_signing_key` explicitly turned on.
    pub signing_key_pem: Option<String>,
    pub signing_key_id: Option<String>,

    /// Retired public keys that must still verify, as `kid:<base64url-32-bytes>`
    /// pairs. Rotation is therefore: publish the new key as the signer, keep the
    /// old one here until every access token signed by it has expired.
    pub additional_verification_keys: Vec<(String, String)>,

    /// Deliberately opt-in and never defaulted to true. Combined with
    /// `is_production` below, generating a throwaway key in a real deployment
    /// takes two independent mistakes rather than one.
    pub allow_ephemeral_signing_key: bool,
    pub is_production: bool,

    pub access_token_ttl: Duration,
    pub refresh_token_ttl: Duration,

    /// How long a athlete invitation stays acceptable (ADR-0016).
    ///
    /// Seven days by default: long enough to survive a holiday and a forwarded
    /// mail, short enough that a link left in an inbox does not stay an
    /// account-creation credential indefinitely. It is the *only* way an account
    /// is created now, so this bound is doing real work.
    pub invitation_ttl: Duration,

    pub issuer: String,
    pub audience: String,

    /// Whether choosing a password additionally consults Have I Been Pwned's
    /// k-anonymity range API (`auth::password`).
    ///
    /// Off unless a deployment says otherwise, and that default is the point:
    /// the bundled corpus is checked either way, so leaving this alone costs no
    /// security posture, while turning it on adds an outbound request to a
    /// third party every time a password is chosen. ADR-0011 keeps the sub-processor list
    /// deliberately short and the default deployment self-contained, and a flag
    /// that quietly opted every operator into a foreign API call would undo
    /// that without anyone deciding to.
    pub hibp_enabled: bool,

    /// How long that lookup may take before it is abandoned and the password
    /// is judged on the bundled corpus alone. Short by design — it sits in the
    /// path that creates an account.
    pub hibp_timeout: Duration,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("required environment variable {0} is not set")]
    Missing(&'static str),
    #[error("environment variable {name} has an invalid value: {source}")]
    Invalid {
        name: &'static str,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
}

impl Config {
    /// Reads configuration from the environment.
    ///
    /// `DATABASE_URL` is required and deliberately has no default: a silent
    /// fallback to a local database is the kind of thing that quietly points a
    /// deployment at the wrong data.
    pub fn from_env() -> Result<Self, ConfigError> {
        let database_url =
            std::env::var("DATABASE_URL").map_err(|_| ConfigError::Missing("DATABASE_URL"))?;

        let database_max_connections = parse_env("DATABASE_MAX_CONNECTIONS", 10)?;
        let bind_addr = parse_env("BIND_ADDR", SocketAddr::from(([0, 0, 0, 0], 8080)))?;

        let auth = AuthConfig::from_env()?;
        let mail = MailConfig::from_env(auth.is_production)?;

        Ok(Self {
            database_url,
            database_max_connections,
            bind_addr,
            auth,
            object_storage: ObjectStorageConfig::from_env()?,
            mail,
        })
    }
}

impl MailConfig {
    /// Reads the mail configuration. Everything is required, `DATABASE_URL`
    /// style: invitations are the only way an account is created (ADR-0016),
    /// so a deployment that cannot send them must fail at startup, not at the
    /// first invite.
    pub fn from_env(is_production: bool) -> Result<Self, ConfigError> {
        let tls = match required("SMTP_TLS")?.to_ascii_lowercase().as_str() {
            "none" => SmtpTls::None,
            "starttls" => SmtpTls::StartTls,
            "implicit" => SmtpTls::Implicit,
            other => {
                return Err(ConfigError::Invalid {
                    name: "SMTP_TLS",
                    source: format!("expected none, starttls or implicit, got `{other}`").into(),
                })
            }
        };

        // The two-mistakes posture, exactly as the ephemeral signing key:
        // plaintext relay credentials in production would hand the invitation
        // token to anyone on the path.
        if is_production && tls == SmtpTls::None {
            return Err(ConfigError::Invalid {
                name: "SMTP_TLS",
                source: "plaintext SMTP is not allowed in production".into(),
            });
        }

        let username = optional("SMTP_USERNAME");
        let password = optional("SMTP_PASSWORD");
        match (&username, &password) {
            (Some(_), None) => return Err(ConfigError::Missing("SMTP_PASSWORD")),
            (None, Some(_)) => return Err(ConfigError::Missing("SMTP_USERNAME")),
            _ => {}
        }

        Ok(Self {
            smtp_host: required("SMTP_HOST")?,
            smtp_port: parse_env("SMTP_PORT", 587)?,
            tls,
            username,
            password,
            from: required("MAIL_FROM")?,
            // Trimmed once here so `mail::accept_url` can concatenate blindly.
            public_url: required("APP_PUBLIC_URL")?.trim_end_matches('/').to_owned(),
        })
    }
}

impl ObjectStorageConfig {
    /// Reads the object-storage configuration.
    ///
    /// Every value is required for the same reason `DATABASE_URL` is: the
    /// endpoint, bucket, and credentials together decide *whose* storage holds
    /// photographs of vulnerable people, and there is no default for that which
    /// is safe to guess. Region is the one exception — it is meaningless to
    /// MinIO and to most non-AWS providers, but SigV4 has to sign *something*,
    /// so it defaults rather than blocking startup.
    pub fn from_env() -> Result<Self, ConfigError> {
        Ok(Self {
            endpoint: required("S3_ENDPOINT")?,
            region: optional("S3_REGION").unwrap_or_else(|| "us-east-1".to_owned()),
            bucket: required("S3_BUCKET")?,
            access_key_id: required("S3_ACCESS_KEY_ID")?,
            secret_access_key: required("S3_SECRET_ACCESS_KEY")?,
            force_path_style: optional("S3_FORCE_PATH_STYLE")
                .map(|value| value != "false")
                .unwrap_or(true),
            key_prefix: optional("S3_KEY_PREFIX").unwrap_or_default(),
        })
    }
}

impl AuthConfig {
    /// Reads the authentication configuration.
    ///
    /// Nothing security-relevant is silently defaulted: the signing key and its
    /// `kid` are either both present or both absent, and their absence is only
    /// tolerated when development explicitly asks for a throwaway key.
    pub fn from_env() -> Result<Self, ConfigError> {
        let signing_key_pem = optional("AUTH_SIGNING_KEY_PEM");
        let signing_key_id = optional("AUTH_SIGNING_KEY_ID");

        match (&signing_key_pem, &signing_key_id) {
            (Some(_), None) => return Err(ConfigError::Missing("AUTH_SIGNING_KEY_ID")),
            (None, Some(_)) => return Err(ConfigError::Missing("AUTH_SIGNING_KEY_PEM")),
            _ => {}
        }

        let additional_verification_keys = parse_verification_keys(
            &optional("AUTH_ADDITIONAL_VERIFICATION_KEYS").unwrap_or_default(),
        )?;

        let is_production = optional("APP_ENV")
            .map(|value| value.eq_ignore_ascii_case("production"))
            .unwrap_or(false);

        let allow_ephemeral_signing_key = optional("AUTH_ALLOW_EPHEMERAL_SIGNING_KEY")
            .map(|value| value == "true")
            .unwrap_or(false);

        let access_token_ttl =
            Duration::from_secs(parse_env("AUTH_ACCESS_TOKEN_TTL_SECONDS", 900)?);
        let refresh_token_ttl = Duration::from_secs(parse_env(
            "AUTH_REFRESH_TOKEN_TTL_SECONDS",
            60 * 60 * 24 * 30,
        )?);
        let invitation_ttl =
            Duration::from_secs(parse_env("AUTH_INVITATION_TTL_SECONDS", 60 * 60 * 24 * 7)?);

        Ok(Self {
            signing_key_pem,
            signing_key_id,
            additional_verification_keys,
            allow_ephemeral_signing_key,
            is_production,
            access_token_ttl,
            refresh_token_ttl,
            invitation_ttl,
            issuer: optional("AUTH_ISSUER").unwrap_or_else(|| "pixmyday-api".to_owned()),
            audience: optional("AUTH_AUDIENCE").unwrap_or_else(|| "pixmyday".to_owned()),
            // Compared against the literal `true` rather than "anything that is
            // not false", so a typo leaves the outbound call switched off.
            hibp_enabled: optional("AUTH_HIBP_ENABLED")
                .map(|value| value == "true")
                .unwrap_or(false),
            hibp_timeout: Duration::from_millis(parse_env("AUTH_HIBP_TIMEOUT_MS", 2000)?),
        })
    }

    /// The configuration a test or local `cargo run` uses: an ephemeral key,
    /// short lifetimes, and never mistakable for production.
    pub fn ephemeral_for_development() -> Self {
        Self {
            signing_key_pem: None,
            signing_key_id: None,
            additional_verification_keys: Vec::new(),
            allow_ephemeral_signing_key: true,
            is_production: false,
            access_token_ttl: Duration::from_secs(900),
            refresh_token_ttl: Duration::from_secs(60 * 60 * 24 * 30),
            invitation_ttl: Duration::from_secs(60 * 60 * 24 * 7),
            issuer: "pixmyday-api".to_owned(),
            audience: "pixmyday".to_owned(),
            // Never in a test: the suite must not depend on an internet
            // connection, and a fake range source is injected where the HIBP
            // path itself is under test.
            hibp_enabled: false,
            hibp_timeout: Duration::from_millis(2000),
        }
    }
}

/// Treats an empty variable as unset, so a blank value in a `.env` or a
/// compose file cannot half-configure a key.
fn optional(name: &'static str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

/// A variable with no safe default: absent or blank is a configuration error,
/// not something to guess at.
fn required(name: &'static str) -> Result<String, ConfigError> {
    optional(name).ok_or(ConfigError::Missing(name))
}

fn parse_verification_keys(raw: &str) -> Result<Vec<(String, String)>, ConfigError> {
    const NAME: &str = "AUTH_ADDITIONAL_VERIFICATION_KEYS";

    raw.split(',')
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(|entry| {
            entry
                .split_once(':')
                .map(|(kid, key)| (kid.trim().to_owned(), key.trim().to_owned()))
                .filter(|(kid, key)| !kid.is_empty() && !key.is_empty())
                .ok_or_else(|| ConfigError::Invalid {
                    name: NAME,
                    source: "expected a comma-separated list of `kid:base64url-public-key`".into(),
                })
        })
        .collect()
}

fn parse_env<T>(name: &'static str, default: T) -> Result<T, ConfigError>
where
    T: std::str::FromStr,
    T::Err: std::error::Error + Send + Sync + 'static,
{
    match std::env::var(name) {
        Err(_) => Ok(default),
        Ok(raw) => raw.parse().map_err(|source| ConfigError::Invalid {
            name,
            source: Box::new(source),
        }),
    }
}
