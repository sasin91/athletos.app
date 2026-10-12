<?php
/**
 * Verifies the Rust API's access tokens: Ed25519-signed JWTs (ADR-0003).
 *
 * A port of `auth::token::verify_access_token` and the `jsonwebtoken`
 * validation it configures. Every way a token can be unacceptable returns
 * null; telling a client "expired" rather than "forged" buys an attacker
 * information and buys us nothing.
 *
 * Pure: no database, no clock of its own (the caller passes `$now`), so the
 * rules can be tested without either.
 */
final class Access_token_verifier {

    /**
     * @param array<string, string> $keys `kid` => raw 32-byte Ed25519 public key.
     */
    public function __construct(
        private readonly array $keys,
        private readonly string $issuer,
        private readonly string $audience,
        private readonly int $leeway,
    ) {
    }

    /**
     * Builds a verifier from `$config['auth']`.
     *
     * @param array<string, mixed> $config
     */
    public static function from_config(array $config): self {
        $keys = [];
        foreach (explode(',', (string) $config['verification_keys']) as $entry) {
            $entry = trim($entry);
            if ($entry === '') {
                continue;
            }

            $parts = explode(':', $entry, 2);
            $kid = trim($parts[0]);
            $key = self::base64url_decode(trim($parts[1] ?? ''));
            if ($kid === '' || $key === null || strlen($key) !== SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES) {
                throw new RuntimeException('AUTH_VERIFICATION_KEYS must be a comma-separated list of `kid:base64url-public-key`');
            }
            $keys[$kid] = $key;
        }

        return new self($keys, (string) $config['issuer'], (string) $config['audience'], (int) $config['leeway']);
    }

    /**
     * The token's claims if it is acceptable at $now, else null.
     *
     * @return array{sub: string, jti: string, exp: int, iat: int, iss: string, aud: string}|null
     */
    public function verify(string $token, int $now): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$encoded_header, $encoded_claims, $encoded_signature] = $parts;

        $header = self::decode_json($encoded_header);
        if ($header === null || ($header['alg'] ?? null) !== 'EdDSA' || !is_string($header['kid'] ?? null)) {
            return null;
        }

        // The `kid` selects exactly one key. An unknown `kid` fails rather than
        // falling back to trying every key, so a retired key can be dropped and
        // immediately stop being trusted.
        $key = $this->keys[$header['kid']] ?? null;
        $signature = self::base64url_decode($encoded_signature);
        if ($key === null || $signature === null || strlen($signature) !== SODIUM_CRYPTO_SIGN_BYTES) {
            return null;
        }
        if (!sodium_crypto_sign_verify_detached($signature, $encoded_header . '.' . $encoded_claims, $key)) {
            return null;
        }

        $claims = self::decode_json($encoded_claims);
        if ($claims === null) {
            return null;
        }

        // The shape `AccessClaims` deserialises: every field present, typed.
        $sub = self::uuid($claims['sub'] ?? null);
        $jti = self::uuid($claims['jti'] ?? null);
        if ($sub === null || $jti === null
            || !is_string($claims['iss'] ?? null) || !is_string($claims['aud'] ?? null)
            || !is_int($claims['exp'] ?? null) || !is_int($claims['iat'] ?? null)) {
            return null;
        }

        if ($claims['iss'] !== $this->issuer || $claims['aud'] !== $this->audience) {
            return null;
        }

        // jsonwebtoken rejects when `exp < now - leeway`.
        if ($claims['exp'] < $now - $this->leeway) {
            return null;
        }

        return [
            'sub' => $sub,
            'jti' => $jti,
            'exp' => $claims['exp'],
            'iat' => $claims['iat'],
            'iss' => $claims['iss'],
            'aud' => $claims['aud'],
        ];
    }

    /**
     * Base64url without padding, as RFC 7515 requires and the Rust signer
     * writes. Anything else is refused rather than leniently decoded.
     */
    private static function base64url_decode(string $value): ?string {
        if ($value === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $value)) {
            return null;
        }
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        return $decoded === false ? null : $decoded;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function decode_json(string $segment): ?array {
        $raw = self::base64url_decode($segment);
        if ($raw === null) {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) && !array_is_list($decoded) ? $decoded : null;
    }

    /**
     * A hyphenated UUID, lowercased; anything else is not one.
     *
     * Stricter than Rust's parser, which also takes the simple, braced and
     * URN forms. Only this API's signer writes these claims, and it writes the
     * hyphenated form.
     */
    private static function uuid(mixed $value): ?string {
        if (!is_string($value) || !preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/', $value)) {
            return null;
        }
        return strtolower($value);
    }
}
