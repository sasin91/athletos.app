<?php
#[Api_variant(tag: 'kind', value: 'fixed')]
final class FixedProgramLength implements ProgramLength {

    public readonly string $kind;

    public function __construct(
        #[Api_field(format: 'int32', minimum: 0)]
        public readonly int $weeks,
        #[Api_field(format: 'int32', minimum: 0)]
        public readonly int $sessions,
    ) {
        $this->kind = 'fixed';
    }
}
