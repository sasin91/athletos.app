<?php
/**
 * The document the attributes build is the Rust API's document, for every
 * operation ported so far.
 *
 * Compared semantically: object keys in any order and `required` as a set,
 * since neither changes what the document says. Everything else, every
 * description included, must match, because generated clients and Swagger UI
 * read all of it.
 */

$normalise = static function (mixed $value) use (&$normalise): mixed {
    if (!is_array($value)) {
        return $value;
    }
    if (array_is_list($value)) {
        return array_map($normalise, $value);
    }
    ksort($value);
    foreach ($value as $key => $item) {
        $value[$key] = $normalise($item);
        if ($key === 'required' && is_array($item)) {
            sort($value[$key]);
        }
    }
    return $value;
};

$rust = static fn (): array => json_decode(file_get_contents(__DIR__ . '/../../backend/openapi.json'), true, 512, JSON_THROW_ON_ERROR);

/**
 * Every component a schema reaches through `$ref`, transitively.
 */
$reachable = static function (mixed $schema, array $components, array &$seen) use (&$reachable): void {
    if (!is_array($schema)) {
        return;
    }
    if (isset($schema['$ref'])) {
        $name = substr($schema['$ref'], strlen('#/components/schemas/'));
        if (!isset($seen[$name])) {
            $seen[$name] = true;
            $reachable($components[$name] ?? null, $components, $seen);
        }
    }
    foreach ($schema as $item) {
        $reachable($item, $components, $seen);
    }
};

return [
    'every ported operation is documented exactly as the Rust API documents it' => static function (Test_kit $t) use ($normalise, $rust): void {
        $php = $t->get('/api-docs/openapi.json')['json'];
        $rust_spec = $rust();

        foreach ($php['paths'] as $path => $operations) {
            Test_kit::true(isset($rust_spec['paths'][$path]), "{$path} is not in the Rust API: a port must not invent endpoints");
            foreach ($operations as $method => $operation) {
                Test_kit::same(
                    $normalise($rust_spec['paths'][$path][$method] ?? null),
                    $normalise($operation),
                    strtoupper($method) . " {$path}",
                );
            }
        }
    },

    'every schema a ported operation reaches is the Rust schema' => static function (Test_kit $t) use ($normalise, $rust, $reachable): void {
        $php = $t->get('/api-docs/openapi.json')['json'];
        $rust_spec = $rust();
        $seen = [];
        $reachable($php['paths'], $php['components']['schemas'], $seen);

        Test_kit::true($seen !== [], 'no schemas were reached');
        foreach (array_keys($seen) as $name) {
            Test_kit::same(
                $normalise($rust_spec['components']['schemas'][$name] ?? null),
                $normalise($php['components']['schemas'][$name] ?? null),
                "components.schemas.{$name}",
            );
        }
        Test_kit::same(array_keys($seen), array_values(array_intersect(array_keys($seen), array_keys($php['components']['schemas']))));
    },

    'info and security schemes match' => static function (Test_kit $t) use ($normalise, $rust): void {
        $php = $t->get('/api-docs/openapi.json')['json'];
        $rust_spec = $rust();
        Test_kit::same('3.1.0', $php['openapi']);
        Test_kit::same($normalise($rust_spec['info']), $normalise($php['info']));
        Test_kit::same($normalise($rust_spec['components']['securitySchemes']), $normalise($php['components']['securitySchemes']));
        foreach ($php['tags'] as $tag) {
            Test_kit::true(in_array($tag, $rust_spec['tags'], true), "tag {$tag['name']} differs from the Rust API's");
        }
    },

    'progress: which Rust operations are ported' => static function (Test_kit $t) use ($rust): void {
        $php = $t->get('/api-docs/openapi.json')['json'];
        $ported = 0;
        $missing = [];
        foreach ($rust()['paths'] as $path => $operations) {
            foreach (array_keys($operations) as $method) {
                if (isset($php['paths'][$path][$method])) {
                    $ported++;
                } else {
                    $missing[] = strtoupper($method) . ' ' . $path;
                }
            }
        }
        echo "      {$ported} of " . ($ported + count($missing)) . " Rust operations ported\n";
        Test_kit::true($ported > 0, 'nothing is ported');
    },
];
