<?php
/**
 * The exercise catalogue, ported from `athletos_training::exercise`.
 *
 * Exercises are code (D-03). `cues` are the reference author's own words from
 * his own training, capitalisation and all, and are not ours to tidy.
 */
final class Exercise_registry {

    public const SQUAT = 'squat';
    public const BENCH = 'bench';
    public const DEADLIFT = 'deadlift';
    public const MILITARY_PRESS = 'military-press';
    public const BARBELL_ROW = 'barbell-row';
    public const ROMANIAN_DEADLIFT = 'romanian-deadlift';
    public const BARBELL_CURL = 'barbell-curl';
    public const HANGING_LEG_RAISE = 'hanging-leg-raise';
    public const LATERAL_RAISE = 'lateral-raise';
    public const DUMBBELL_TRICEP_EXTENSION = 'dumbbell-tricep-extension';
    public const INCLINE_DUMBBELL_PRESS = 'incline-dumbbell-press';
    public const HAMMER_CURL = 'hammer-curl';

    /**
     * Every exercise the compiled-in programs can prescribe, in registry order.
     *
     * @return list<Exercise>
     */
    public static function all(): array {
        static $registry = null;
        return $registry ??= self::build();
    }

    public static function find(string $key): ?Exercise {
        foreach (self::all() as $exercise) {
            if ($exercise->key === $key) {
                return $exercise;
            }
        }
        return null;
    }

    /**
     * @return list<Exercise>
     */
    private static function build(): array {
        // A typical dumbbell rack: pairs every 2 kg.
        $rack = Loading::dumbbell(2.0);
        $deadlift_cues = [
            'Barbell over midfoot',
            'shins slightly touching',
            'shoulder width grip',
            'squeeze the bar',
            'twist hands inwards, feel back tension',
            'push floor away',
        ];

        return [
            new Exercise(self::SQUAT, 'Squat', [
                'Bar on upper back',
                'Feet shoulder width',
                'Brace core',
                'Break at hips and knees',
                'Depth to parallel or below',
                'Drive up through heels',
            ], true, Loading::barbell()),
            new Exercise(self::BENCH, 'Bench Press', [
                'Lie flat on bench',
                'Feet planted on floor',
                'Retract shoulder blades',
                'Bar over mid-chest',
                'Lower with control',
                'Press to lockout',
            ], true, Loading::barbell()),
            new Exercise(self::DEADLIFT, 'Deadlift', $deadlift_cues, true, Loading::barbell()),
            // The reference's `MilitaryPress`, which is also 5/3/1's press day.
            new Exercise(self::MILITARY_PRESS, 'Military Press', [
                'Strict overhead press',
                'Core tight',
                "Don't lean back",
                'Lock out at top',
            ], false, Loading::barbell()),
            new Exercise(self::BARBELL_ROW, 'Barbell Row', [
                'Hinge at the hips',
                'Keep back straight',
                'Pull the bar to your lower chest/upper abdomen',
                'Squeeze shoulder blades together',
                'Control the eccentric',
            ], true, Loading::barbell()),
            // The reference extends Deadlift and appends two cues.
            new Exercise(self::ROMANIAN_DEADLIFT, 'Romanian deadlift', [
                ...$deadlift_cues,
                'push bottom back',
                'keep legs straight',
            ], false, Loading::barbell()),
            // `is_primary` because the reference says so; it drives nothing.
            new Exercise(self::BARBELL_CURL, 'Barbell Curl', [
                'Stand up straight',
                'Grip shoulder width apart',
                'Keep elbows pinned to your sides',
                'Curl the bar up, squeezing the biceps',
                'Lower the bar under control',
            ], true, Loading::barbell()),
            new Exercise(self::HANGING_LEG_RAISE, 'Hanging leg raise', [
                'Grab handles or bar',
                'squeeze',
                'pull knees up to sternum',
            ], false, Loading::bodyweight()),
            new Exercise(self::LATERAL_RAISE, 'Lateral Raise', [
                'Stand with dumbbells at your sides',
                'Slight bend in the elbows',
                'Raise arms out to your sides to shoulder height',
                'Lead with the elbows, not the hands',
                'Lower under control — no swinging',
            ], false, $rack),
            new Exercise(self::DUMBBELL_TRICEP_EXTENSION, 'Dumbbell Tricep Extension', [
                'Lower behind neck',
                'feel tension',
            ], false, $rack),
            new Exercise(self::INCLINE_DUMBBELL_PRESS, 'Dumbbell Press', [
                'Hands rotated slightly inwards',
                'dumbbells starts aligned with nipple line',
                'brace core and push back into pad',
                'drive hands up towards the ceiling',
            ], false, $rack),
            new Exercise(self::HAMMER_CURL, 'Hammer Curl', [
                'Hold dumbbells with a neutral (hammer) grip',
                'Keep elbows pinned to your sides',
                'Curl both dumbbells up simultaneously',
                'Squeeze at the top',
                'Lower under control',
            ], false, $rack),
        ];
    }
}
