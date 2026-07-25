//! Ed25519 signing and verification keys, and the JWKS derived from them.
//!
//! ADR-0003 chose an asymmetric algorithm now, before anything external needs
//! it, so that a future "Login with PixMyDay" is additive rather than a token
//! format migration. That decision lives here: one signing key plus any number
//! of verification keys, keyed by `kid`.

use std::collections::HashMap;

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine as _;
use ed25519_dalek::pkcs8::{DecodePrivateKey, EncodePrivateKey};
use ed25519_dalek::SigningKey;
use jsonwebtoken::{DecodingKey, EncodingKey};
use rand::TryRngCore as _;
use serde::Serialize;
use utoipa::ToSchema;

use crate::config::AuthConfig;

#[derive(Debug, thiserror::Error)]
pub enum KeyError {
    #[error("AUTH_SIGNING_KEY_PEM is not a valid PKCS#8 Ed25519 private key")]
    InvalidSigningKey,
    #[error("the signing key could not be re-encoded for the JWT signer")]
    UnusableSigningKey,
    #[error("verification key {kid} is not 32 base64url-encoded bytes")]
    InvalidVerificationKey { kid: String },
    #[error(
        "no signing key is configured. Set AUTH_SIGNING_KEY_PEM and AUTH_SIGNING_KEY_ID, or, \
         for local development only, set AUTH_ALLOW_EPHEMERAL_SIGNING_KEY=true"
    )]
    NoSigningKey,
    #[error("AUTH_ALLOW_EPHEMERAL_SIGNING_KEY must never be set when APP_ENV=production")]
    EphemeralKeyInProduction,
    #[error("the operating system random number generator is unavailable")]
    NoEntropy,
}

/// One public key, in every representation the process needs it in.
struct VerificationKey {
    decoding: DecodingKey,
    public_bytes: [u8; 32],
}

/// The process's key material. Cheap to share; never logged.
pub struct KeyRing {
    signing_kid: String,
    encoding: EncodingKey,
    verification: HashMap<String, VerificationKey>,
}

impl std::fmt::Debug for KeyRing {
    /// Hand-written so that no `#[derive(Debug)]` anywhere upstream can ever
    /// print key material into a log line.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("KeyRing")
            .field("signing_kid", &self.signing_kid)
            .field("verification_kids", &self.verification.len())
            .finish()
    }
}

impl KeyRing {
    /// Builds the key ring described by `config`.
    ///
    /// Falling back to a generated key requires an explicit opt-in *and* a
    /// non-production `APP_ENV`; the two together make it hard to reach by
    /// accident, and it announces itself loudly when it happens.
    pub fn from_config(config: &AuthConfig) -> Result<Self, KeyError> {
        let mut verification = HashMap::new();

        for (kid, encoded) in &config.additional_verification_keys {
            let bytes = decode_public_key(encoded)
                .ok_or_else(|| KeyError::InvalidVerificationKey { kid: kid.clone() })?;
            verification.insert(kid.clone(), VerificationKey::new(bytes));
        }

        let (signing_kid, signing_key) = match (&config.signing_key_pem, &config.signing_key_id) {
            (Some(pem), Some(kid)) => (
                kid.clone(),
                // A PEM travels through env tooling that hosts love to
                // round-trip (dotenv parse → re-serialize, quote-stripping,
                // .env rewriting — Dokploy does all three), and a value with
                // real newlines does not survive that. The robust wire format
                // is a single line with literal `\n` escapes, so those are
                // expanded here. Base64 never contains a backslash, so this
                // cannot corrupt a PEM that already has real newlines.
                SigningKey::from_pkcs8_pem(&pem.replace("\\n", "\n"))
                    .map_err(|_| KeyError::InvalidSigningKey)?,
            ),
            _ => {
                if config.is_production {
                    return Err(KeyError::EphemeralKeyInProduction);
                }
                if !config.allow_ephemeral_signing_key {
                    return Err(KeyError::NoSigningKey);
                }

                let key = generate_signing_key()?;
                let kid = format!("ephemeral-{}", uuid::Uuid::now_v7().simple());

                tracing::warn!(
                    kid = %kid,
                    "NO SIGNING KEY CONFIGURED — generated an ephemeral Ed25519 keypair. \
                     Every access token becomes invalid when this process restarts and no other \
                     instance can verify them. Development only; set AUTH_SIGNING_KEY_PEM for \
                     anything else."
                );

                (kid, key)
            }
        };

        let encoding = EncodingKey::from_ed_der(
            signing_key
                .to_pkcs8_der()
                .map_err(|_| KeyError::UnusableSigningKey)?
                .as_bytes(),
        );

        // The signing key verifies too, and wins over any same-`kid` entry in
        // the retired list — the active key is authoritative for its own id.
        verification.insert(
            signing_kid.clone(),
            VerificationKey::new(signing_key.verifying_key().to_bytes()),
        );

        Ok(Self {
            signing_kid,
            encoding,
            verification,
        })
    }

    pub fn signing_kid(&self) -> &str {
        &self.signing_kid
    }

    pub fn encoding_key(&self) -> &EncodingKey {
        &self.encoding
    }

    /// Looks up the verification key a token's `kid` names. Returns `None` for
    /// an unknown `kid`, which the caller must treat as "not authenticated"
    /// rather than falling back to trying every key.
    pub fn decoding_key(&self, kid: &str) -> Option<&DecodingKey> {
        self.verification.get(kid).map(|key| &key.decoding)
    }

    /// The JWKS document. Every verification key is published, not just the
    /// signer, so a token minted before a rotation still resolves for anyone
    /// fetching the document afterwards.
    pub fn jwks(&self) -> Jwks {
        let mut keys: Vec<Jwk> = self
            .verification
            .iter()
            .map(|(kid, key)| Jwk {
                kty: "OKP",
                crv: "Ed25519",
                alg: "EdDSA",
                r#use: "sig",
                kid: kid.clone(),
                x: URL_SAFE_NO_PAD.encode(key.public_bytes),
            })
            .collect();

        // HashMap iteration order is randomised per process; sorting keeps the
        // document byte-stable so caches and tests are not at its mercy.
        keys.sort_by(|a, b| a.kid.cmp(&b.kid));

        Jwks { keys }
    }
}

impl VerificationKey {
    fn new(public_bytes: [u8; 32]) -> Self {
        Self {
            decoding: DecodingKey::from_ed_der(&public_bytes),
            public_bytes,
        }
    }
}

fn decode_public_key(encoded: &str) -> Option<[u8; 32]> {
    URL_SAFE_NO_PAD.decode(encoded).ok()?.try_into().ok()
}

fn generate_signing_key() -> Result<SigningKey, KeyError> {
    // Seeded from raw OS entropy rather than `SigningKey::generate`, because
    // ed25519-dalek and `rand` are on different `rand_core` majors.
    let mut seed = [0u8; 32];
    rand::rngs::OsRng
        .try_fill_bytes(&mut seed)
        .map_err(|_| KeyError::NoEntropy)?;
    Ok(SigningKey::from_bytes(&seed))
}

/// A JSON Web Key Set (RFC 7517).
#[derive(Debug, Serialize, ToSchema)]
pub struct Jwks {
    pub keys: Vec<Jwk>,
}

/// An Ed25519 public key as an OKP JWK (RFC 8037).
#[derive(Debug, Serialize, ToSchema)]
pub struct Jwk {
    /// Key type; always `OKP` for Ed25519.
    #[schema(example = "OKP")]
    pub kty: &'static str,
    /// Curve; always `Ed25519`.
    #[schema(example = "Ed25519")]
    pub crv: &'static str,
    /// Algorithm the key is used with; always `EdDSA`.
    #[schema(example = "EdDSA")]
    pub alg: &'static str,
    /// Public key use; always `sig`.
    #[serde(rename = "use")]
    #[schema(rename = "use", example = "sig")]
    pub r#use: &'static str,
    /// Key id, matching the `kid` header of tokens signed with it.
    pub kid: String,
    /// The 32-byte public key, base64url-encoded without padding.
    pub x: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::token::{issue_access_token, verify_access_token};

    fn pem_config() -> (AuthConfig, String) {
        let key = generate_signing_key().expect("entropy is available");
        let pem = key
            .to_pkcs8_pem(ed25519_dalek::pkcs8::spki::der::pem::LineEnding::LF)
            .expect("the key encodes as PKCS#8 PEM")
            .to_string();

        let mut config = AuthConfig::ephemeral_for_development();
        config.allow_ephemeral_signing_key = false;
        config.signing_key_pem = Some(pem.clone());
        config.signing_key_id = Some("test-2026-07".to_owned());

        (config, pem)
    }

    /// The path every real deployment takes, which the feature tests do not
    /// exercise because they run on ephemeral keys.
    #[test]
    fn a_configured_pem_key_signs_tokens_that_verify_against_its_own_jwks() {
        let (config, _) = pem_config();
        let keys = KeyRing::from_config(&config).expect("the PEM key should load");

        assert_eq!(keys.signing_kid(), "test-2026-07");

        let athlete_id = uuid::Uuid::now_v7();
        let (token, _) = issue_access_token(&keys, &config, athlete_id).expect("signing works");
        let claims = verify_access_token(&keys, &config, &token).expect("verification works");
        assert_eq!(claims.sub, athlete_id);

        let jwks = keys.jwks();
        assert_eq!(jwks.keys.len(), 1);
        assert_eq!(jwks.keys[0].kid, "test-2026-07");
    }

    /// The single-line form a mangled deployment env actually delivers:
    /// literal `\n` escapes instead of newlines. It must load, and it must
    /// load as the same key as the multi-line original.
    #[test]
    fn a_pem_with_literal_newline_escapes_is_unescaped() {
        let (config, pem) = pem_config();

        let mut escaped_config = config.clone();
        escaped_config.signing_key_pem = Some(pem.trim_end().replace('\n', "\\n"));

        let from_multiline = KeyRing::from_config(&config).unwrap().jwks();
        let from_escaped = KeyRing::from_config(&escaped_config).unwrap().jwks();

        assert_eq!(from_multiline.keys[0].x, from_escaped.keys[0].x);
    }

    /// The same key material must load identically twice — otherwise a restart
    /// would silently invalidate every outstanding token.
    #[test]
    fn the_same_pem_produces_the_same_public_key() {
        let (config, _) = pem_config();

        let first = KeyRing::from_config(&config).unwrap().jwks();
        let second = KeyRing::from_config(&config).unwrap().jwks();

        assert_eq!(first.keys[0].x, second.keys[0].x);
    }

    #[test]
    fn an_unconfigured_key_is_refused_unless_development_explicitly_opts_in() {
        let mut config = AuthConfig::ephemeral_for_development();
        config.allow_ephemeral_signing_key = false;

        assert!(matches!(
            KeyRing::from_config(&config),
            Err(KeyError::NoSigningKey)
        ));
    }

    /// Two independent mistakes should still not produce a throwaway key in
    /// production.
    #[test]
    fn an_ephemeral_key_is_refused_in_production_even_when_opted_in() {
        let mut config = AuthConfig::ephemeral_for_development();
        config.is_production = true;

        assert!(matches!(
            KeyRing::from_config(&config),
            Err(KeyError::EphemeralKeyInProduction)
        ));
    }

    #[test]
    fn half_a_key_pair_of_settings_is_not_silently_accepted() {
        let (mut config, _) = pem_config();
        config.signing_key_id = None;

        // Falls through to the ephemeral branch, which is closed here.
        assert!(matches!(
            KeyRing::from_config(&config),
            Err(KeyError::NoSigningKey)
        ));
    }

    #[test]
    fn a_malformed_verification_key_is_rejected_by_kid() {
        let (mut config, _) = pem_config();
        config.additional_verification_keys =
            vec![("old".to_owned(), "not-base64url!!".to_owned())];

        assert!(matches!(
            KeyRing::from_config(&config),
            Err(KeyError::InvalidVerificationKey { kid }) if kid == "old"
        ));
    }
}
