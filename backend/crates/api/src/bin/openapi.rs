//! Prints the OpenAPI document to stdout, or writes it to a file.
//!
//! ADR-0014 makes the SvelteKit BFF's TypeScript client a build artefact
//! generated from the Rust DTOs (D-11). Generating it must therefore be
//! possible from a checkout alone — no `DATABASE_URL`, no Postgres, no bound
//! port. The document lives entirely in the type system (`openapi::ApiDoc`), so
//! this binary touches none of that: it serialises the doc and exits.
//!
//! It is a separate `[[bin]]` rather than a flag on `api` deliberately. A
//! `--dump-openapi` flag would have to short-circuit `main` *before* config,
//! the signing key, the pool, and the listener — leaving the real server's
//! entry point carrying a branch that exists only for the build pipeline.
//! Keeping them apart means `main.rs` stays a straight line, and this binary
//! cannot accidentally acquire a dependency on a running service.
//!
//! ```text
//! cargo run -p athletos-api --bin openapi                  # to stdout
//! cargo run -p athletos-api --bin openapi -- openapi.json  # to a file
//! ```

use std::io::Write;

use athletos_api::openapi::ApiDoc;
use utoipa::OpenApi;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Pretty-printed rather than compact: the document is diffable output that
    // a human reads when the generated client changes shape unexpectedly.
    let document = ApiDoc::openapi().to_pretty_json()?;

    match std::env::args().nth(1) {
        Some(path) => {
            if let Some(parent) = std::path::Path::new(&path).parent() {
                if !parent.as_os_str().is_empty() {
                    std::fs::create_dir_all(parent)?;
                }
            }
            std::fs::write(&path, document)?;
            // To stderr, so `--bin openapi > file` stays byte-exact.
            eprintln!("wrote OpenAPI document to {path}");
        }
        None => {
            let mut stdout = std::io::stdout().lock();
            stdout.write_all(document.as_bytes())?;
            stdout.write_all(b"\n")?;
        }
    }

    Ok(())
}
