<?php
#[Api_schema(description: <<<'TXT'
    The catalogue, in registry order.

    An object rather than a bare array so that the day this needs a cursor, a
    count or a per-athlete fit marker, it can have one without changing the type
    of the response (D-12).
    TXT)]
final class ProgramCatalogue {

    /** @param list<ProgramSummary> $programs */
    public function __construct(
        #[Api_field(items: ProgramSummary::class)]
        public readonly array $programs,
    ) {
    }
}
