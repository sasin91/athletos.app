<?php
#[Api_schema(description: 'One exercise, as a client renders it in a list.')]
final class ExerciseSummary {

    public function __construct(
        #[Api_field(description: 'Stable key. This is what the maxes document is keyed by.', example: 'squat')]
        public readonly string $key,
        #[Api_field(example: 'Squat')]
        public readonly string $label,
        #[Api_field(description: <<<'TXT'
            A competition lift or a close variant, as opposed to accessory work.

            Carried so a picker can put the lifts an athlete is likely to track a max
            for at the top, without a client holding its own opinion about which
            those are.
            TXT)]
        public readonly bool $is_primary,
    ) {
    }

    public static function from_exercise(Exercise $exercise): self {
        return new self($exercise->key, $exercise->label, $exercise->is_primary);
    }
}
