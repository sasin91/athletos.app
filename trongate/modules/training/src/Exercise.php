<?php
/**
 * One exercise: what to call it, how to do it, and what it can be loaded with.
 */
final class Exercise {

    /**
     * @param list<string> $cues
     */
    public function __construct(
        public readonly string $key,
        public readonly string $label,
        public readonly array $cues,
        /** A competition lift or a close variant, as opposed to accessory work. */
        public readonly bool $is_primary,
        /** Drives rounding, per exercise (D-04). */
        public readonly Loading $loading,
    ) {
    }
}
