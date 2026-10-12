<?php
#[Api_schema(description: <<<'TXT'
    Every exercise the compiled-in programs know about.

    An object rather than a bare array, so this can grow a cursor or a filter
    without changing the type of the response (D-12).
    TXT)]
final class ExerciseCatalogue {

    /** @param list<ExerciseSummary> $exercises */
    public function __construct(
        #[Api_field(items: ExerciseSummary::class)]
        public readonly array $exercises,
    ) {
    }
}
