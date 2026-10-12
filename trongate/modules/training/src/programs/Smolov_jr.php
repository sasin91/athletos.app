<?php
final class Smolov_jr implements Catalogued {

    public function meta(): Program_meta {
        return new Program_meta(
            key: 'smolov-jr',
            name: 'Smolov Jr',
            days_per_week: 4,
            equipment: [Equipment::Barbell, Equipment::SquatRack, Equipment::Bench, Equipment::Dumbbells, Equipment::PullUpBar],
            // Not a beginner's block. Ten sets of three at 90% in week three is
            // a squat volume an unprepared athlete will not recover from, which
            // is precisely the failure mode D-01 is built around.
            experience_floor: Experience::Advanced,
            length: Length::fixed(weeks: 3, sessions: 12),
            // The warning D-05 asks the card to lead with.
            recovery_demand: Recovery_demand::Brutal,
            // Day 4 is ten sets of squats before the bench work even starts.
            estimated_session_minutes: 75,
            // Every accessory percentage is taken from one of these three.
            required_maxes: [Exercise_registry::SQUAT, Exercise_registry::BENCH, Exercise_registry::DEADLIFT],
            // Session exercises, not max sources: every loaded accessory
            // belongs here even when its percentage comes from another max.
            weighted_exercises: [
                Exercise_registry::SQUAT,
                Exercise_registry::DEADLIFT,
                Exercise_registry::MILITARY_PRESS,
                Exercise_registry::LATERAL_RAISE,
                Exercise_registry::BENCH,
                Exercise_registry::BARBELL_ROW,
                Exercise_registry::BARBELL_CURL,
                Exercise_registry::DUMBBELL_TRICEP_EXTENSION,
                Exercise_registry::INCLINE_DUMBBELL_PRESS,
                Exercise_registry::ROMANIAN_DEADLIFT,
                Exercise_registry::HAMMER_CURL,
            ],
        );
    }
}
