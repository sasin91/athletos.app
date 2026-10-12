<?php
#[Api_schema]
enum ProgramExperience: string {
    case Novice = 'novice';
    case Intermediate = 'intermediate';
    case Advanced = 'advanced';

    public static function from_engine(Experience $experience): self {
        return self::from($experience->value);
    }
}
