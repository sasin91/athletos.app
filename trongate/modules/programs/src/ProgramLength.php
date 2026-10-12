<?php
#[Api_schema(
    description: <<<'TXT'
        Whether the program ends.

        The same distinction the session payload's `progress.total` makes at runtime:
        a fixed block has an honest denominator, an open-ended one has none and must
        not be given an invented one (D-03).
        TXT,
    one_of: [FixedProgramLength::class, OpenEndedProgramLength::class],
)]
interface ProgramLength {
}
