<?php
/**
 * The program catalogue (D-03, D-05), ported from `routes::programs`.
 *
 * Programs are compiled-in code, so both operations read the registry and
 * touch no table. The wire types in `src/` mirror the engine's by hand, as in
 * the Rust API: the engine must not be answerable to an HTTP contract (D-15),
 * and `/v1` may never change a field's type while the engine is under no such
 * obligation (D-12).
 *
 * Authenticated although nothing here is anybody's data: D-05 wants these
 * cards to carry a "fits your week" marker derived from the athlete's own
 * profile, and opening an endpoint later is additive where closing one is not.
 */
class Programs extends Trongate {

    #[OpenAPI(
        path: '/v1/programs',
        description: 'Every program an athlete can enrol in.',
        required_user_level: 'athlete',
        responses: [200 => ['The catalogue', ProgramCatalogue::class]],
    )]
    public function list_programs(): ProgramCatalogue {
        return new ProgramCatalogue(array_map(
            static fn (Catalogued $program) => ProgramSummary::from_meta($program->meta()),
            Program_registry::all(),
        ));
    }

    #[OpenAPI(
        path: '/v1/programs/{key}',
        description: <<<'TXT'
            One program's catalogue entry.

            Deliberately the same shape the list returns rather than a richer one. A
            detail view that showed the actual prescribed sessions would have to derive
            them from the athlete's maxes, which is what enrolling is for — and showing a
            preview built from maxes the athlete has not entered would mean inventing
            numbers.
            TXT,
        required_user_level: 'athlete',
        responses: [200 => ['The program', ProgramSummary::class], 404 => 'No program has that key'],
        params: ['key' => ["The program's registry key", 'smolov-jr']],
    )]
    public function show_program(string $key): ProgramSummary {
        $program = Program_registry::find($key) ?? throw Api_problem::not_found();
        return ProgramSummary::from_meta($program->meta());
    }
}
