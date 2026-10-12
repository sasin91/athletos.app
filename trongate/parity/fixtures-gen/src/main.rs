//! Writes the JSON the Rust API answers with for every catalogue endpoint the
//! Trongate port has taken over, so the PHP tests can assert byte-for-byte
//! parity without a running Rust server or a Postgres.
//!
//! Run from `trongate/`: `cargo run --manifest-path parity/fixtures-gen/Cargo.toml -- tests/fixtures`

use std::{env, fs, path::PathBuf};

use std::time::Duration;

use athletos_api::auth::keys::KeyRing;
use athletos_api::auth::token::issue_access_token;
use athletos_api::config::AuthConfig;
use athletos_api::routes::exercises::{ExerciseCatalogue, ExerciseSummary};
use athletos_api::routes::programs::{ProgramCatalogue, ProgramSummary};
use athletos_training::{exercise, programs};

fn write(dir: &PathBuf, name: &str, value: &impl serde::Serialize) {
    let body = serde_json::to_string_pretty(value).expect("serialisable");
    fs::write(dir.join(name), body + "\n").expect("fixture written");
}

fn main() {
    let dir = PathBuf::from(env::args().nth(1).expect("usage: fixtures-gen <dir>"));
    fs::create_dir_all(&dir).expect("fixture dir");

    let catalogue = ProgramCatalogue {
        programs: programs::REGISTRY
            .iter()
            .map(|program| ProgramSummary::from(program.meta()))
            .collect(),
    };
    write(&dir, "v1_programs.json", &catalogue);
    for program in programs::REGISTRY {
        let meta = program.meta();
        write(&dir, &format!("v1_programs_{}.json", meta.key), &ProgramSummary::from(meta));
    }

    let exercises = ExerciseCatalogue {
        exercises: exercise::REGISTRY.iter().map(ExerciseSummary::from).collect(),
    };
    write(&dir, "v1_exercises.json", &exercises);

    write(&dir, "rust_access_token.json", &rust_access_token());
}

/// An access token minted by the Rust API's own signer, so the PHP verifier is
/// tested against the real wire format rather than against itself.
///
/// The key is derived from a fixed, public seed and the lifetime is a century:
/// this credential is a test vector, committed on purpose, and is only ever
/// trusted by a test run that configures its public key.
fn rust_access_token() -> serde_json::Value {
    use ed25519_dalek::pkcs8::{EncodePrivateKey, spki::der::pem::LineEnding};
    use ed25519_dalek::SigningKey;

    let signing_key = SigningKey::from_bytes(&[7u8; 32]);
    let pem = signing_key.to_pkcs8_pem(LineEnding::LF).expect("pem");
    let mut config = AuthConfig::ephemeral_for_development();
    config.signing_key_pem = Some(pem.to_string());
    config.signing_key_id = Some("parity-fixture".to_owned());
    config.access_token_ttl = Duration::from_secs(100 * 365 * 24 * 60 * 60);

    let keys = KeyRing::from_config(&config).expect("key ring");
    let athlete_id = uuid::Uuid::parse_str("0199d6a0-0000-7000-8000-000000000001").unwrap();
    let (token, _) = issue_access_token(&keys, &config, athlete_id).expect("token");
    let jwks = serde_json::to_value(keys.jwks()).expect("jwks");

    serde_json::json!({
        "note": "Test vector, not a credential: signed with a key derived from a public, fixed seed, and trusted only by a test run that configures this public key.",
        "kid": "parity-fixture",
        "public_key": jwks["keys"][0]["x"],
        "athlete_id": athlete_id,
        "token": token,
    })
}
