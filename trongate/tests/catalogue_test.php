<?php
/**
 * The catalogue endpoints answer byte-for-byte what the Rust API answers.
 *
 * The fixtures are generated from the Rust API's own types by
 * `parity/fixtures-gen`; regenerate them whenever the Rust catalogue changes.
 */

$token = static fn (Test_kit $t): string => $t->mint(['sub' => $t->athlete()]);

$same_bytes = static function (string $fixture, array $response): void {
    Test_kit::same(200, $response['status']);
    Test_kit::same(['application/json'], $response['headers']['content-type'] ?? null);
    // Compared as compact JSON so that key order, number formatting and
    // string escaping all have to match, not merely the decoded values.
    Test_kit::same(
        json_encode(Test_kit::fixture($fixture), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION),
        $response['body'],
    );
};

return [
    'GET /v1/programs' => static function (Test_kit $t) use ($token, $same_bytes): void {
        $same_bytes('v1_programs.json', $t->get('/v1/programs', $token($t)));
    },

    'GET /v1/programs/{key} for every program' => static function (Test_kit $t) use ($token, $same_bytes): void {
        $credential = $token($t);
        foreach (Test_kit::fixture('v1_programs.json')['programs'] as $program) {
            $same_bytes("v1_programs_{$program['key']}.json", $t->get('/v1/programs/' . $program['key'], $credential));
        }
    },

    'GET /v1/programs/{key} for a key nobody registered' => static function (Test_kit $t) use ($token): void {
        $response = $t->get('/v1/programs/no-such-program', $token($t));
        Test_kit::same(404, $response['status']);
        Test_kit::same(['title' => 'Not Found', 'status' => 404, 'detail' => 'not found'], $response['json']);
    },

    'GET /v1/exercises' => static function (Test_kit $t) use ($token, $same_bytes): void {
        $same_bytes('v1_exercises.json', $t->get('/v1/exercises', $token($t)));
    },

    'every program names only exercises the registry holds' => static function (Test_kit $t): void {
        foreach (Program_registry::all() as $program) {
            $meta = $program->meta();
            foreach ([...$meta->required_maxes, ...$meta->weighted_exercises] as $key) {
                Test_kit::true(Exercise_registry::find($key) !== null, "{$meta->key} names {$key}, which is not in the exercise registry");
            }
        }
    },
];
