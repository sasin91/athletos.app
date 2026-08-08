create table enrollment_exercise_adjustments (
    enrollment_id uuid not null references enrollments(id) on delete cascade,
    exercise text not null,
    adjustment_percent smallint not null,
    primary key (enrollment_id, exercise),
    constraint enrollment_adjustment_nonzero check (adjustment_percent <> 0),
    constraint enrollment_adjustment_range check (adjustment_percent between -50 and 50)
);
