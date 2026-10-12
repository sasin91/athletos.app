<?php
/**
 * The catalogue entry for a program (D-05).
 *
 * Here to let the athlete decide, not to be scored by an algorithm (D-01).
 * There is no fit score and no ranking.
 */
final class Program_meta {

    /**
     * @param list<Equipment> $equipment
     * @param list<string> $required_maxes Exercise keys `start()` will refuse
     *     to run without (D-04).
     * @param list<string> $weighted_exercises Every non-bodyweight exercise the
     *     program can prescribe.
     */
    public function __construct(
        public readonly string $key,
        public readonly string $name,
        public readonly int $days_per_week,
        public readonly array $equipment,
        public readonly Experience $experience_floor,
        public readonly Length $length,
        public readonly Recovery_demand $recovery_demand,
        /** Wall-clock minutes for a typical session, including rest (D-01, D-10). */
        public readonly int $estimated_session_minutes,
        public readonly array $required_maxes,
        public readonly array $weighted_exercises,
    ) {
    }
}
