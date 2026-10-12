<?php
/**
 * The whole test framework: assertions, an HTTP client, and token minting.
 *
 * Trongate has no test tooling and no Composer to fetch one, so this is
 * written to need nothing but PHP and the curl and sodium extensions.
 */

final class Assertion_failed extends RuntimeException {
}

final class Test_kit {

    /** @var array{kid: string, secret: string, public: string} */
    public array $test_key;

    public function __construct(
        public readonly string $base_url,
        public readonly PDO $db,
    ) {
        $pair = sodium_crypto_sign_keypair();
        $this->test_key = [
            'kid' => 'test-key',
            'secret' => sodium_crypto_sign_secretkey($pair),
            'public' => sodium_crypto_sign_publickey($pair),
        ];
    }

    // -- assertions ---------------------------------------------------------

    public static function same(mixed $expected, mixed $actual, string $message = ''): void {
        if ($expected !== $actual) {
            throw new Assertion_failed(($message !== '' ? "{$message}\n" : '')
                . 'expected: ' . self::show($expected) . "\n  actual: " . self::show($actual));
        }
    }

    public static function true(bool $condition, string $message): void {
        if (!$condition) {
            throw new Assertion_failed($message);
        }
    }

    private static function show(mixed $value): string {
        return is_string($value) ? var_export($value, true) : json_encode($value, JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_PRETTY_PRINT);
    }

    // -- http ---------------------------------------------------------------

    /**
     * @param array<string, string> $headers
     * @return array{status: int, headers: array<string, list<string>>, body: string, json: mixed}
     */
    public function request(string $method, string $path, array $headers = [], ?string $body = null): array {
        $curl = curl_init($this->base_url . $path);
        $response_headers = [];
        $header_lines = [];
        foreach ($headers as $name => $value) {
            $header_lines[] = "{$name}: {$value}";
        }

        curl_setopt_array($curl, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_NOBODY => $method === 'HEAD',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $header_lines,
            CURLOPT_HEADERFUNCTION => static function ($curl, string $line) use (&$response_headers): int {
                $parts = explode(':', $line, 2);
                if (count($parts) === 2) {
                    $response_headers[strtolower(trim($parts[0]))][] = trim($parts[1]);
                }
                return strlen($line);
            },
        ]);
        if ($body !== null) {
            curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
        }

        $response_body = curl_exec($curl);
        if ($response_body === false) {
            throw new RuntimeException('request failed: ' . curl_error($curl));
        }
        $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);

        return [
            'status' => $status,
            'headers' => $response_headers,
            'body' => $response_body,
            'json' => json_decode($response_body, true),
        ];
    }

    public function get(string $path, ?string $token = null): array {
        return $this->request('GET', $path, $token === null ? [] : ['Authorization' => "Bearer {$token}"]);
    }

    // -- auth ---------------------------------------------------------------

    /**
     * Signs a token with the test key. Every claim can be overridden, and a
     * claim set to null is dropped, so each rule can be broken one at a time.
     *
     * @param array<string, mixed> $claims
     * @param array<string, mixed> $header
     */
    public function mint(array $claims = [], array $header = [], ?string $secret = null): string {
        $now = time();
        $claims = array_filter($claims + [
            'sub' => '00000000-0000-7000-8000-000000000000',
            'iss' => 'athletos-api',
            'aud' => 'athletos',
            'exp' => $now + 900,
            'iat' => $now,
            'jti' => self::uuid(),
        ], static fn ($value) => $value !== null);
        $header = array_filter($header + ['typ' => 'JWT', 'alg' => 'EdDSA', 'kid' => $this->test_key['kid']], static fn ($value) => $value !== null);

        $signing_input = self::b64(json_encode($header)) . '.' . self::b64(json_encode($claims));
        $signature = sodium_crypto_sign_detached($signing_input, $secret ?? $this->test_key['secret']);
        return $signing_input . '.' . self::b64($signature);
    }

    /**
     * Inserts a live athlete and returns its id.
     */
    public function athlete(): string {
        $id = self::uuid();
        $this->db->prepare('insert into athletes (id, email, display_name, password_hash) values (?, ?, ?, ?)')
            ->execute([$id, "{$id}@example.com", 'Test Athlete', 'not-a-real-hash']);
        return $id;
    }

    /** A random UUIDv7-shaped id. */
    public static function uuid(): string {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x70);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    public static function b64(string $bytes): string {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    public static function fixture(string $name): mixed {
        return json_decode(file_get_contents(__DIR__ . '/../fixtures/' . $name), true, 512, JSON_THROW_ON_ERROR);
    }
}
