<?php
/**
 * Whether the program ends.
 *
 * Stated up front so the catalogue can show "3 weeks, 12 sessions" without
 * instantiating anything. A fixed block has an honest denominator; an
 * open-ended one has none and must not be given an invented one (D-03).
 */
final class Length {

    private function __construct(
        public readonly ?int $weeks,
        public readonly ?int $sessions,
    ) {
    }

    public static function fixed(int $weeks, int $sessions): self {
        return new self($weeks, $sessions);
    }

    public static function open_ended(): self {
        return new self(null, null);
    }

    public function is_fixed(): bool {
        return $this->weeks !== null;
    }
}
