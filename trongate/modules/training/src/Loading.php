<?php
/**
 * How an exercise is loaded, and therefore what weights it can be given (D-04).
 *
 * A property of the exercise, not of the program: a barbell has 2.5 kg
 * resolution whoever is prescribing it.
 *
 * Only the data is ported so far. Rounding a prescription down to a loadable
 * weight arrives with the slice that first prescribes one (enrollments).
 */
final class Loading {

    private function __construct(
        public readonly string $kind,
        public readonly ?float $increment,
    ) {
    }

    /** 20 kg bar plus plates in pairs. */
    public static function barbell(): self {
        return new self('barbell', null);
    }

    /** A rack of fixed dumbbells, ascending by $increment. */
    public static function dumbbell(float $increment): self {
        return new self('dumbbell', $increment);
    }

    /** Nothing to load. The prescription is reps. */
    public static function bodyweight(): self {
        return new self('bodyweight', null);
    }

    /** A stack pinned at multiples of $increment. */
    public static function machine(float $increment): self {
        return new self('machine', $increment);
    }
}
