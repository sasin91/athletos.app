import { describe, expect, it } from 'vitest';

import {
	adjustmentRows,
	historicalAdjustmentRows,
	isAdjustmentValidationFailure,
	serializeAdjustments,
	type WeightedExercise
} from './adjustments';

const weighted: WeightedExercise[] = [
	{ exercise: 'squat', label: 'Squat' },
	{ exercise: 'bench-press', label: 'Bench press' }
];

describe('adjustmentRows', () => {
	it('keeps program order and fills missing values with zero', () => {
		expect(adjustmentRows(weighted, {})).toEqual([
			{ exercise: 'squat', label: 'Squat', value: 0 },
			{ exercise: 'bench-press', label: 'Bench press', value: 0 }
		]);
	});

	it('only exposes exercises declared by the program', () => {
		expect(adjustmentRows(weighted, { squat: -10, 'barbell-row': 15 })).toEqual([
			{ exercise: 'squat', label: 'Squat', value: -10 },
			{ exercise: 'bench-press', label: 'Bench press', value: 0 }
		]);
	});
});

describe('historicalAdjustmentRows', () => {
	it('keeps stored adjustments when program metadata is unavailable', () => {
		expect(historicalAdjustmentRows(null, { squat: -10, 'barbell-row': 15 })).toEqual([
			{ exercise: 'barbell-row', label: 'barbell-row', value: 15 },
			{ exercise: 'squat', label: 'squat', value: -10 }
		]);
	});

	it('labels known exercises without dropping stored keys absent from current metadata', () => {
		expect(historicalAdjustmentRows(weighted, { squat: -10, 'barbell-row': 15 })).toEqual([
			{ exercise: 'squat', label: 'Squat', value: -10 },
			{ exercise: 'barbell-row', label: 'barbell-row', value: 15 }
		]);
	});
});

describe('serializeAdjustments', () => {
	it('serializes signed whole percentages and omits zero or blank values', () => {
		expect(
			serializeAdjustments([
				{ exercise: 'squat', raw: '+10' },
				{ exercise: 'bench-press', raw: '0' },
				{ exercise: 'barbell-row', raw: '' }
			])
		).toEqual({ squat: 10 });
	});

	it.each(['2.5', 'ten', '51', '-51'])(
		'rejects invalid percentage %s with retained fields',
		(raw) => {
			const result = serializeAdjustments([
				{ exercise: 'squat', raw },
				{ exercise: 'bench-press', raw: '-5' }
			]);

			expect(isAdjustmentValidationFailure(result)).toBe(true);
			if (!isAdjustmentValidationFailure(result)) return;

			expect(result.values).toEqual({ squat: raw, 'bench-press': '-5' });
			expect(result.errors).toEqual({
				squat: 'Use a whole percentage from -50 to 50.'
			});
		}
	);
});
