<?php
#[Api_schema(description: <<<'TXT'
    How much the program costs to recover from — the axis D-01 cares about most.
    Three coarse steps on purpose: it is a warning, not a measurement.
    TXT)]
enum ProgramRecoveryDemand: string {
    case Moderate = 'moderate';
    case High = 'high';
    /** Will interfere with the rest of your training and the rest of your week. */
    case Brutal = 'brutal';

    public static function from_engine(Recovery_demand $demand): self {
        return self::from($demand->value);
    }
}
