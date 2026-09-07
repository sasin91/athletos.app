import type { components } from './api/schema';

export type WorkoutContent = components['schemas']['WorkoutContent'];
export type WorkoutExercise = components['schemas']['ExerciseSummary'];

/** Parse the form envelope; prescription rules remain authoritative in Rust. */
export function readWorkoutContent(value: FormDataEntryValue | null): WorkoutContent | null {
	if (typeof value !== 'string' || value.length > 200_000) return null;
	try {
		const parsed = JSON.parse(value);
		if (!parsed || typeof parsed !== 'object' || typeof parsed.title !== 'string') return null;
		if (!Array.isArray(parsed.blocks)) return null;
		return parsed as WorkoutContent;
	} catch {
		return null;
	}
}
