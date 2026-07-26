import { describe, expect, it } from 'vitest';

import { addableExercises, rowsFor, type ExerciseOption } from './maxes';

const REGISTRY: ExerciseOption[] = [
	{ key: 'squat', label: 'Squat', is_primary: true },
	{ key: 'bench', label: 'Bench Press', is_primary: true },
	{ key: 'military-press', label: 'Military Press', is_primary: false },
	{ key: 'lateral-raise', label: 'Lateral Raise', is_primary: false }
];

describe('rowsFor', () => {
	it('labels what the athlete holds, in registry order', () => {
		const rows = rowsFor({ bench: 100, squat: 140 }, REGISTRY);

		expect(rows).toEqual([
			{ exercise: 'squat', label: 'Squat', weight: '140' },
			{ exercise: 'bench', label: 'Bench Press', weight: '100' }
		]);
	});

	it('opens empty for an athlete who has entered nothing', () => {
		expect(rowsFor({}, REGISTRY)).toEqual([]);
	});

	// The form is the document: a row the form does not render is a key the PUT
	// will not send, and a key the PUT does not send is a max deleted. So a max
	// with no registry entry has to survive as a row anyway, under its own key.
	it('keeps a max the registry cannot label rather than dropping it', () => {
		const rows = rowsFor({ squat: 140, 'zercher-carry': 80 }, REGISTRY);

		expect(rows).toEqual([
			{ exercise: 'squat', label: 'Squat', weight: '140' },
			{ exercise: 'zercher-carry', label: 'zercher-carry', weight: '80' }
		]);
	});
});

describe('addableExercises', () => {
	it('offers everything not already held', () => {
		const rows = rowsFor({ squat: 140 }, REGISTRY);

		expect(addableExercises(REGISTRY, rows).map((exercise) => exercise.key)).toEqual([
			'bench',
			'military-press',
			'lateral-raise'
		]);
	});

	it('puts the main lifts first without hiding the accessories', () => {
		const shuffled: ExerciseOption[] = [
			{ key: 'lateral-raise', label: 'Lateral Raise', is_primary: false },
			{ key: 'squat', label: 'Squat', is_primary: true }
		];

		expect(addableExercises(shuffled, []).map((exercise) => exercise.key)).toEqual([
			'squat',
			'lateral-raise'
		]);
	});

	it('offers nothing once every lift is held', () => {
		const rows = rowsFor({ squat: 1, bench: 1, 'military-press': 1, 'lateral-raise': 1 }, REGISTRY);

		expect(addableExercises(REGISTRY, rows)).toEqual([]);
	});
});
