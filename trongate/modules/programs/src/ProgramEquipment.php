<?php
#[Api_schema]
enum ProgramEquipment: string {
    case Barbell = 'barbell';
    case SquatRack = 'squat_rack';
    case Bench = 'bench';
    case Dumbbells = 'dumbbells';
    case PullUpBar = 'pull_up_bar';

    public static function from_engine(Equipment $equipment): self {
        return self::from($equipment->value);
    }
}
