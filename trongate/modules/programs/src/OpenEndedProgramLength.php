<?php
#[Api_variant(tag: 'kind', value: 'open_ended')]
final class OpenEndedProgramLength implements ProgramLength {

    public readonly string $kind;

    public function __construct() {
        $this->kind = 'open_ended';
    }
}
