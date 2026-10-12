<?php
// Access-token verification, mirroring the Rust API's `AuthConfig`.
//
// This app verifies tokens and does not yet issue them: until the auth slice is
// ported, tokens come from the Rust API, and the keys below are its public keys
// in the same `kid:<base64url-32-bytes>` list format as the Rust API's
// AUTH_ADDITIONAL_VERIFICATION_KEYS.
$config['auth'] = [
    'issuer' => getenv('AUTH_ISSUER') ?: 'athletos-api',
    'audience' => getenv('AUTH_AUDIENCE') ?: 'athletos',
    'verification_keys' => getenv('AUTH_VERIFICATION_KEYS') ?: '',
    // Tolerance for clock skew, in seconds. The Rust verifier uses 5.
    'leeway' => 5,
];
