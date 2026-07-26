import { describe, expect, it } from 'vitest';

import { medianSecondsPerSet, projectedFinish } from './pace';

describe('medianSecondsPerSet', () => {
	it('says nothing until there are three sessions to say it from', () => {
		expect(medianSecondsPerSet([])).toBeNull();
		expect(
			medianSecondsPerSet([
				{ durationSeconds: 3000, sets: 30 },
				{ durationSeconds: 3000, sets: 30 }
			])
		).toBeNull();
	});

	it('takes the middle of an odd number of sessions', () => {
		expect(
			medianSecondsPerSet([
				{ durationSeconds: 300, sets: 3 }, // 100 s/set
				{ durationSeconds: 300, sets: 5 }, // 60
				{ durationSeconds: 300, sets: 4 } // 75
			])
		).toBe(75);
	});

	it('averages the middle pair of an even number', () => {
		expect(
			medianSecondsPerSet([
				{ durationSeconds: 300, sets: 3 }, // 100
				{ durationSeconds: 300, sets: 5 }, // 60
				{ durationSeconds: 300, sets: 4 }, // 75
				{ durationSeconds: 300, sets: 6 } // 50
			])
		).toBe(67.5);
	});

	it('is not dragged by the session that ran long', () => {
		const ordinary = [
			{ durationSeconds: 3000, sets: 30 },
			{ durationSeconds: 3000, sets: 30 },
			{ durationSeconds: 3000, sets: 30 }
		];

		expect(medianSecondsPerSet(ordinary)).toBe(100);
		expect(medianSecondsPerSet([...ordinary, { durationSeconds: 50_000, sets: 30 }])).toBe(100);
	});

	it('drops sessions that have no duration or no sets rather than counting them as zero', () => {
		const samples = [
			{ durationSeconds: 300, sets: 3 },
			{ durationSeconds: 300, sets: 3 },
			{ durationSeconds: null, sets: 3 },
			{ durationSeconds: 300, sets: 0 }
		];

		// Two usable samples out of four, which is below the floor.
		expect(medianSecondsPerSet(samples)).toBeNull();
	});
});

describe('projectedFinish', () => {
	it('has nothing to project without a pace', () => {
		expect(projectedFinish(1_000, 10, null)).toBeNull();
		expect(projectedFinish(1_000, 10, 0)).toBeNull();
	});

	it('is now, once there is nothing left to lift', () => {
		expect(projectedFinish(1_000, 0, 90)).toBe(1_000);
	});

	it('adds one median set for every set left', () => {
		expect(projectedFinish(0, 12, 90)).toBe(12 * 90 * 1000);
	});
});
