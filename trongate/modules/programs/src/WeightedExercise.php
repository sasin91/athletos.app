<?php
#[Api_schema(description: <<<'TXT'
    One adjustable exercise, labelled for a client that cannot read Rust's
    compiled registry.
    TXT)]
final class WeightedExercise {

    public function __construct(
        #[Api_field(example: 'squat')]
        public readonly string $exercise,
        #[Api_field(example: 'Squat')]
        public readonly string $label,
    ) {
    }
}
