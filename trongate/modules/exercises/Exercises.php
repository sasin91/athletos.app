<?php
/**
 * The exercise catalogue, so a client can offer a lift the athlete has not
 * entered yet (D-03, D-04). Ported from `routes::exercises`.
 *
 * Cues and loading models are deliberately absent: cues belong to a session,
 * and the client never rounds a weight (D-04, D-11).
 */
class Exercises extends Trongate {

    #[OpenAPI(
        path: '/v1/exercises',
        description: <<<'TXT'
            Every exercise a max may be entered for.

            Authenticated for the same reason the program catalogue is: nothing here is
            anybody's data, but opening an endpoint later is additive and closing one is
            not (D-12).
            TXT,
        required_user_level: 'athlete',
        responses: [200 => ['The exercise registry, in registry order', ExerciseCatalogue::class]],
    )]
    public function list_exercises(): ExerciseCatalogue {
        return new ExerciseCatalogue(array_map(ExerciseSummary::from_exercise(...), Exercise_registry::all()));
    }
}
