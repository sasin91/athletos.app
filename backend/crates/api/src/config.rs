//! Process configuration, read once from the environment at startup.

use std::net::SocketAddr;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub database_max_connections: u32,
    pub bind_addr: SocketAddr,
    pub auth: AuthConfig,
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

        Ok(Self {
            database_url,
            database_max_connections,
            bind_addr,
            auth: AuthConfig::from_env()?,
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

        Ok(Self {
            signing_key_pem,
            signing_key_id,
            additional_verification_keys,
            allow_ephemeral_signing_key,
            is_production,
            access_token_ttl,
            refresh_token_ttl,
            issuer: optional("AUTH_ISSUER").unwrap_or_else(|| "athletos-api".to_owned()),
            audience: optional("AUTH_AUDIENCE").unwrap_or_else(|| "athletos".to_owned()),
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
            issuer: "athletos-api".to_owned(),
            audience: "athletos".to_owned(),
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
