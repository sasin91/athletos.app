<?php
final class Wendler_531_bbb implements Catalogued {

    public function meta(): Program_meta {
        return new Program_meta(
            key: 'wendler-531-bbb',
            name: '5/3/1 Boring But Big',
            days_per_week: 4,
            equipment: [Equipment::Barbell, Equipment::SquatRack, Equipment::Bench],
            // Starting from 90% of a conservative max and adding 2.5 kg a month
            // is about as forgiving as a barbell program gets.
            experience_floor: Experience::Novice,
            length: Length::open_ended(),
            // The main work is easy. Five sets of ten immediately after it is not.
            recovery_demand: Recovery_demand::High,
            estimated_session_minutes: 55,
            // Four, in Wendler's day order.
            required_maxes: [Exercise_registry::MILITARY_PRESS, Exercise_registry::DEADLIFT, Exercise_registry::BENCH, Exercise_registry::SQUAT],
            weighted_exercises: [Exercise_registry::MILITARY_PRESS, Exercise_registry::DEADLIFT, Exercise_registry::BENCH, Exercise_registry::SQUAT],
        );
    }
}
