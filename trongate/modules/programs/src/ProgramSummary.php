<?php
#[Api_schema(description: <<<'TXT'
    Everything an athlete needs in order to judge whether a program fits.

    There is no fit score and no ranking (D-01). `recovery_demand` and
    `estimated_session_minutes` lead because they are the two axes that matter
    to someone who over-reaches and who has an hour — a 75-minute program should
    announce itself before enrolment, not in week three.
    TXT)]
final class ProgramSummary {

    /**
     * @param list<ProgramEquipment> $equipment
     * @param list<RequiredMax> $required_maxes
     * @param list<WeightedExercise> $weighted_exercises
     */
    public function __construct(
        #[Api_field(description: 'Stable key. This is what `POST /v1/enrollments` takes.', example: 'wendler-531-bbb')]
        public readonly string $key,
        #[Api_field(example: '5/3/1 Boring But Big')]
        public readonly string $name,
        #[Api_field(format: 'int32', minimum: 0)]
        public readonly int $days_per_week,
        #[Api_field(items: ProgramEquipment::class)]
        public readonly array $equipment,
        public readonly ProgramExperience $experience_floor,
        public readonly ProgramLength $length,
        public readonly ProgramRecoveryDemand $recovery_demand,
        #[Api_field(description: 'Wall-clock minutes for a typical session, including rest.', example: 55, format: 'int32', minimum: 0)]
        public readonly int $estimated_session_minutes,
        #[Api_field(items: RequiredMax::class, description: <<<'TXT'
            The one-rep maxes this program refuses to start without (D-04).

            Here so that a client can render the maxes form *before* enrolling,
            without holding its own copy of which lifts which program wants. The
            alternative was the 422 from `POST /v1/enrollments`, which names one
            missing key at a time and only after the athlete has pressed the button.

            Labels are resolved from the compiled exercise registry for the same
            reason `BlockView` resolves them: a browser cannot look a key up in a
            Rust `static`, and a `/v1/exercises` endpoint to cache would be a round
            trip before the first form renders.
            TXT)]
        public readonly array $required_maxes,
        #[Api_field(items: WeightedExercise::class, description: <<<'TXT'
            Every loaded exercise this program may prescribe and therefore allows
            an enrolment-specific percentage adjustment for.
            TXT)]
        public readonly array $weighted_exercises,
    ) {
    }

    public static function from_meta(Program_meta $meta): self {
        return new self(
            key: $meta->key,
            name: $meta->name,
            days_per_week: $meta->days_per_week,
            equipment: array_map(ProgramEquipment::from_engine(...), $meta->equipment),
            experience_floor: ProgramExperience::from_engine($meta->experience_floor),
            length: $meta->length->is_fixed()
                ? new FixedProgramLength($meta->length->weeks, $meta->length->sessions)
                : new OpenEndedProgramLength(),
            recovery_demand: ProgramRecoveryDemand::from_engine($meta->recovery_demand),
            estimated_session_minutes: $meta->estimated_session_minutes,
            required_maxes: array_map(
                static fn (string $key) => new RequiredMax($key, self::label($key)),
                $meta->required_maxes,
            ),
            weighted_exercises: array_map(
                static fn (string $key) => new WeightedExercise($key, self::label($key)),
                $meta->weighted_exercises,
            ),
        );
    }

    /**
     * A program naming an exercise the registry does not hold is caught by a
     * test; falling back to the key keeps the form renderable either way.
     */
    private static function label(string $key): string {
        return Exercise_registry::find($key)?->label ?? $key;
    }
}
