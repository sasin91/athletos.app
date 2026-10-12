<?php
final class Bench_row_specialization implements Catalogued {

    public function meta(): Program_meta {
        return new Program_meta(
            key: 'bench-row-specialization',
            name: 'Bench & Row Specialization',
            days_per_week: 4,
            equipment: [Equipment::Barbell, Equipment::SquatRack, Equipment::Bench],
            experience_floor: Experience::Advanced,
            length: Length::fixed(weeks: 4, sessions: 14),
            recovery_demand: Recovery_demand::High,
            estimated_session_minutes: 90,
            required_maxes: [Exercise_registry::BENCH, Exercise_registry::BARBELL_ROW, Exercise_registry::SQUAT, Exercise_registry::DEADLIFT],
            weighted_exercises: [Exercise_registry::BENCH, Exercise_registry::BARBELL_ROW, Exercise_registry::SQUAT, Exercise_registry::DEADLIFT],
        );
    }
}
