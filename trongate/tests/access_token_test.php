<?php
/**
 * The authenticator, end to end: every way a token can be refused is a 401
 * with the Rust API's exact body, and a token the Rust API signed is accepted.
 */

$unauthenticated = ['title' => 'Unauthorized', 'status' => 401, 'detail' => 'authentication required'];

$refused = static function (Test_kit $t, array $response, string $why) use ($unauthenticated): void {
    Test_kit::same(401, $response['status'], $why);
    Test_kit::same($unauthenticated, $response['json'], $why);
};

return [
    'a token the Rust API signed is accepted' => static function (Test_kit $t): void {
        $rust = Test_kit::fixture('rust_access_token.json');
        $t->db->prepare('insert into athletes (id, email, display_name, password_hash) values (?, ?, ?, ?)')
            ->execute([$rust['athlete_id'], 'rust@example.com', 'Rust', 'x']);

        Test_kit::same(200, $t->get('/v1/exercises', $rust['token'])['status']);
    },

    'a token this suite signed is accepted' => static function (Test_kit $t): void {
        Test_kit::same(200, $t->get('/v1/exercises', $t->mint(['sub' => $t->athlete()]))['status']);
    },

    'no Authorization header' => static function (Test_kit $t) use ($refused): void {
        $refused($t, $t->get('/v1/programs'), 'no header');
    },

    'a scheme other than Bearer, or no token' => static function (Test_kit $t) use ($refused): void {
        $token = $t->mint(['sub' => $t->athlete()]);
        $refused($t, $t->request('GET', '/v1/programs', ['Authorization' => "Basic {$token}"]), 'Basic');
        $refused($t, $t->request('GET', '/v1/programs', ['Authorization' => 'Bearer ']), 'empty');
        $refused($t, $t->request('GET', '/v1/programs', ['Authorization' => $token]), 'no scheme');
    },

    'the scheme is case-insensitive' => static function (Test_kit $t): void {
        $token = $t->mint(['sub' => $t->athlete()]);
        Test_kit::same(200, $t->request('GET', '/v1/programs', ['Authorization' => "bEaReR {$token}"])['status']);
    },

    'garbage, and a token cut short' => static function (Test_kit $t) use ($refused): void {
        $token = $t->mint(['sub' => $t->athlete()]);
        $refused($t, $t->get('/v1/programs', 'not-a-jwt'), 'garbage');
        $refused($t, $t->get('/v1/programs', substr($token, 0, strrpos($token, '.'))), 'no signature');
        $refused($t, $t->get('/v1/programs', $token . '='), 'padded signature');
    },

    'a signature from a key nobody configured' => static function (Test_kit $t) use ($refused): void {
        $stranger = sodium_crypto_sign_secretkey(sodium_crypto_sign_keypair());
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $t->athlete()], [], $stranger)), 'wrong key');
    },

    'a payload changed after signing' => static function (Test_kit $t) use ($refused): void {
        $victim = $t->athlete();
        [$header, , $signature] = explode('.', $t->mint(['sub' => $t->athlete()]));
        $forged_claims = Test_kit::b64(json_encode(['sub' => $victim, 'iss' => 'athletos-api', 'aud' => 'athletos', 'exp' => time() + 900, 'iat' => time(), 'jti' => Test_kit::uuid()]));
        $refused($t, $t->get('/v1/programs', "{$header}.{$forged_claims}.{$signature}"), 'forged payload');
    },

    'an unknown kid, a missing kid, or another algorithm' => static function (Test_kit $t) use ($refused): void {
        $sub = $t->athlete();
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $sub], ['kid' => 'retired'])), 'unknown kid');
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $sub], ['kid' => null])), 'no kid');
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $sub], ['alg' => 'none'])), 'alg none');
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $sub], ['alg' => 'HS256'])), 'alg HS256');
    },

    'expiry honours a five-second leeway and no more' => static function (Test_kit $t) use ($refused): void {
        $sub = $t->athlete();
        Test_kit::same(200, $t->get('/v1/programs', $t->mint(['sub' => $sub, 'exp' => time() - 3]))['status'], 'inside the leeway');
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $sub, 'exp' => time() - 30])), 'expired');
    },

    'the wrong issuer or audience' => static function (Test_kit $t) use ($refused): void {
        $sub = $t->athlete();
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $sub, 'iss' => 'someone-else'])), 'issuer');
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $sub, 'aud' => 'someone-else'])), 'audience');
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $sub, 'aud' => ['athletos']])), 'audience as array');
    },

    'every claim AccessClaims requires must be there, and typed' => static function (Test_kit $t) use ($refused): void {
        $sub = $t->athlete();
        foreach (['sub', 'iss', 'aud', 'exp', 'iat', 'jti'] as $claim) {
            $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $sub, $claim => null])), "without {$claim}");
        }
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => 'not-a-uuid'])), 'sub not a uuid');
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $sub, 'exp' => (string) (time() + 900)])), 'exp as a string');
    },

    'an athlete who does not exist, or was deleted' => static function (Test_kit $t) use ($refused): void {
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => Test_kit::uuid()])), 'unknown athlete');

        $deleted = $t->athlete();
        $t->db->prepare('update athletes set deleted_at = now(6) where id = ?')->execute([$deleted]);
        $refused($t, $t->get('/v1/programs', $t->mint(['sub' => $deleted])), 'soft-deleted athlete');
    },

    'a revoked token stops working before it expires' => static function (Test_kit $t) use ($refused): void {
        $sub = $t->athlete();
        $jti = Test_kit::uuid();
        $token = $t->mint(['sub' => $sub, 'jti' => $jti]);
        Test_kit::same(200, $t->get('/v1/programs', $token)['status'], 'before revocation');

        $t->db->prepare("insert into access_token_denylist (jti, athlete_id, expires_at, reason) values (?, ?, now(6) + interval 15 minute, 'logout')")
            ->execute([$jti, $sub]);
        $refused($t, $t->get('/v1/programs', $token), 'after revocation');
        Test_kit::same(200, $t->get('/v1/programs', $t->mint(['sub' => $sub]))['status'], 'a different token for the same athlete');
    },

    'an uppercase sub is the same athlete' => static function (Test_kit $t): void {
        Test_kit::same(200, $t->get('/v1/programs', $t->mint(['sub' => strtoupper($t->athlete())]))['status']);
    },
];
