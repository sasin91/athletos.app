<?php
#[Api_schema(description: 'One lift a program needs a max for, ready to be a labelled form field.')]
final class RequiredMax {

    public function __construct(
        #[Api_field(example: 'military-press')]
        public readonly string $exercise,
        #[Api_field(example: 'Military Press')]
        public readonly string $label,
    ) {
    }
}
