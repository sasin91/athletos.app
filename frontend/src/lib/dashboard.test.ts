import { describe, expect, it } from 'vitest';

import type { components } from './api/schema';
import { chartPoints, selectLift } from './dashboard';

type ProgressView = components['schemas']['AthleteProgress'];
type LiftTrend = components['schemas']['LiftTrend'];

const point = (
	workout_id: string,
	at: string,
	estimate: number | null = 100,
	load_moved_kg = 500
): components['schemas']['TrendPoint'] => ({
	workout_id,
	at,
	estimate,
	load_moved_kg,
	training_max: 90,
	training_max_label: 'Training max',
	drift_kg: 0,
	sets_over: 0,
	sets_under: 0,
	reasons: []
});

const lift = (exercise: string, points: components['schemas']['TrendPoint'][]): LiftTrend => ({
	exercise,
	label: exercise,
	points,
	bests: [],
	estimate_change: null
});

const progress = (lifts: LiftTrend[]): ProgressView => ({
	lifts,
	sessions: [],
	programs: [],
	overall: [],
	window_months: 12
});

describe('selectLift', () => {
	it('keeps an exact requested exercise', () => {
		const squat = lift('squat', [point('squat-1', '2026-01-01T08:00:00Z')]);
		const bench = lift('bench-press', [point('bench-1', '2026-02-01T08:00:00Z')]);

		expect(selectLift(progress([squat, bench]), 'squat')).toBe(squat);
	});

	it.each([null, 'not-a-lift'])('falls back to the latest present estimate for %s', (requested) => {
		const squat = lift('squat', [
			point('squat-1', '2026-01-01T08:00:00Z', 100),
			point('squat-2', '2026-04-01T08:00:00Z', null)
		]);
		const bench = lift('bench-press', [point('bench-1', '2026-03-01T08:00:00Z', 90)]);

		expect(selectLift(progress([squat, bench]), requested)).toBe(bench);
	});

	it('breaks equal latest-estimate timestamps by exercise key', () => {
		const squat = lift('squat', [point('squat-1', '2026-03-01T08:00:00Z')]);
		const bench = lift('bench-press', [point('bench-1', '2026-03-01T08:00:00Z')]);

		expect(selectLift(progress([squat, bench]), null)).toBe(bench);
	});

	it('returns null when no lift has an estimate', () => {
		expect(
			selectLift(
				progress([
					lift('squat', [point('squat-1', '2026-01-01T08:00:00Z', null)]),
					lift('bench-press', [point('bench-1', '2026-02-01T08:00:00Z', null)])
				]),
				null
			)
		).toBeNull();
	});
});

describe('chartPoints', () => {
	it('uses selected-lift load instead of the matching whole-workout load', () => {
		const trend = lift('squat', [
			point('workout-b', '2026-02-01T08:00:00Z', 110, 500),
			point('workout-a', '2026-01-01T08:00:00Z', 100, 420),
			point('workout-c', '2026-03-01T08:00:00Z', 115, 610)
		]);
		const view: ProgressView = {
			...progress([trend]),
			sessions: [
				{
					workout_id: 'workout-a',
					enrollment_id: 'enrollment-a',
					at: '2026-01-01T08:00:00Z',
					load_moved_kg: 42_000,
					load_planned_kg: 4000,
					sets_over: 1,
					sets_under: 0,
					duration_seconds: 3600
				},
				{
					workout_id: 'workout-b',
					enrollment_id: 'enrollment-b',
					at: '2026-02-01T08:00:00Z',
					load_moved_kg: 50_000,
					load_planned_kg: 4800,
					sets_over: 2,
					sets_under: 0,
					duration_seconds: 3700
				}
			]
		};

		const selected = selectLift(view, 'squat');
		expect(selected).not.toBeNull();
		const points = chartPoints(selected!);

		expect(points.map(({ workout_id }) => workout_id)).toEqual([
			'workout-b',
			'workout-a',
			'workout-c'
		]);
		expect(points.map(({ load_moved_kg }) => load_moved_kg)).toEqual([500, 420, 610]);
	});
});
