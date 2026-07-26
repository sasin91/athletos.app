/**
 * The maxes screen's form state (D-04).
 *
 * The athlete's maxes are a set they own: any lift in the exercise registry can
 * go in, any lift can come out. `PUT /v1/athlete/maxes` replaces the whole
 * document, so the form *is* the document — a row on the screen is a key that
 * will be sent, and a row removed from the screen is a key that will not be, and
 * is therefore deleted.
 *
 * That makes the page's whole job bookkeeping over a list, which is why it lives
 * here rather than in the component: it is the only part of the screen that can
 * be wrong in a way a type checker will not catch, and it is testable without a
 * browser.
 *
 * Nothing here decides anything about training. Which lifts a program needs, what
 * a weight is worth and whether it is loadable are all answered in Rust (D-11);
 * this file joins two lists by key and sorts them.
 */

/** One lift the athlete holds a max for, as the form holds it. */
export type MaxRow = {
	exercise: string;
	/** Resolved from the exercise registry, falling back to the key. */
	label: string;
	/** The text in the input, not a number — an empty field is a real state. */
	weight: string;
};

/** One entry of the exercise registry, as `GET /v1/exercises` sends it. */
export type ExerciseOption = {
	key: string;
	label: string;
	is_primary: boolean;
};

/**
 * The rows the form opens with.
 *
 * Registry order for the lifts the registry knows, then anything the athlete
 * holds that it does not. That second group should be empty — the API refuses a
 * max for a key it cannot resolve — but a max the athlete entered must never
 * disappear from a form that will `PUT` over it, whatever the reason it is
 * unrecognised. Dropping one silently would delete it on the next save.
 */
export function rowsFor(
	maxes: Record<string, number>,
	registry: readonly ExerciseOption[]
): MaxRow[] {
	const known = registry
		.filter((exercise) => exercise.key in maxes)
		.map((exercise) => ({
			exercise: exercise.key,
			label: exercise.label,
			weight: String(maxes[exercise.key])
		}));

	const seen = new Set(registry.map((exercise) => exercise.key));

	const unknown = Object.keys(maxes)
		.filter((key) => !seen.has(key))
		.sort()
		.map((key) => ({ exercise: key, label: key, weight: String(maxes[key]) }));

	return [...known, ...unknown];
}

/**
 * What the "add a lift" picker can still offer.
 *
 * Everything in the registry that is not already a row. Main lifts first, since
 * they are what an athlete tracks a one-rep max for and the accessory work in
 * the registry is mostly there so programs can prescribe it — but the accessory
 * lifts stay offerable, because whose set this is is not a program's decision.
 */
export function addableExercises(
	registry: readonly ExerciseOption[],
	rows: readonly MaxRow[]
): ExerciseOption[] {
	const held = new Set(rows.map((row) => row.exercise));

	return registry
		.filter((exercise) => !held.has(exercise.key))
		.sort((left, right) => Number(right.is_primary) - Number(left.is_primary));
}
