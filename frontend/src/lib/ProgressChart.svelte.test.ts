import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import IndicatorGrid from './IndicatorGrid.svelte';
import ProgressChart from './ProgressChart.svelte';
import type { DashboardPoint } from './dashboard';
import type { components } from './api/schema';

const point = (overrides: Partial<DashboardPoint> = {}): DashboardPoint => ({
	workout_id: 'workout-1',
	at: '2026-01-01T08:00:00Z',
	estimate: 120,
	training_max: 120,
	training_max_label: 'Training max',
	drift_kg: 0,
	sets_over: 0,
	sets_under: 0,
	reasons: [],
	load_moved_kg: 4000,
	...overrides
});

const html = (points: DashboardPoint[]) =>
	render(ProgressChart, { props: { label: 'Squat', points } }).body;

type Attributes = Record<string, string>;

function elements(body: string, tag: string): Attributes[] {
	return [...body.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map((match) =>
		Object.fromEntries(
			[...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((attribute) => [
				attribute[1],
				attribute[2]
			])
		)
	);
}

function series(body: string, tag: string, name: string): Attributes[] {
	return elements(body, tag).filter((attributes) => attributes['data-series'] === name);
}

function byWorkout(items: Attributes[], workoutId: string): Attributes {
	const item = items.find((attributes) => attributes['data-workout-id'] === workoutId);
	expect(item, `geometry for ${workoutId}`).toBeDefined();
	return item!;
}

function number(attributes: Attributes, name: string): number {
	const value = Number(attributes[name]);
	expect(Number.isFinite(value), `${name} is finite`).toBe(true);
	return value;
}

function pathCommands(path: Attributes): { command: 'M' | 'L'; x: number; y: number }[] {
	return [...path.d.matchAll(/([ML])\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map((command) => ({
		command: command[1] as 'M' | 'L',
		x: Number(command[2]),
		y: Number(command[3])
	}));
}

describe('ProgressChart SSR', () => {
	it('labels an empty chart and describes the absence of observations', () => {
		const body = html([]);

		expect(body).toContain('aria-label="Squat progress chart"');
		expect(body).toContain('No recorded Squat sessions in this period.');
		expect(body).not.toMatch(/NaN|Infinity/);
	});

	it('draws a visible estimate point for one observation', () => {
		const body = html([point()]);

		expect(body).toContain('aria-label="Squat progress chart"');
		expect(body).toContain('1 recorded Squat session.');
		expect(body).toContain('data-series="estimate-point"');
		expect(body).not.toMatch(/NaN|Infinity/);
	});

	it('shares chronological x coordinates while each panel keeps the correct y scale', () => {
		const body = html([
			point({
				workout_id: 'workout-1',
				at: '2026-01-01T08:00:00Z',
				estimate: 100,
				training_max: 80,
				drift_kg: -10,
				load_moved_kg: 0
			}),
			point({
				workout_id: 'workout-2',
				at: '2026-02-01T08:00:00Z',
				estimate: 120,
				training_max: 100,
				drift_kg: 10,
				load_moved_kg: 4000
			}),
			point({
				workout_id: 'workout-3',
				at: '2026-03-01T08:00:00Z',
				estimate: 130,
				training_max: 110,
				drift_kg: 0,
				load_moved_kg: 8000
			})
		]);

		expect(body).toContain('data-series="estimate"');
		expect(body).toContain('data-series="training-max"');
		expect(body).toContain('stroke-dasharray="5 5"');
		expect(body).toContain('data-panel="drift"');
		expect(body).toContain('data-series="load"');
		expect(body).toContain('3 recorded Squat sessions.');
		expect(body).not.toMatch(/NaN|Infinity/);

		const spines = series(body, 'line', 'spine');
		const estimates = series(body, 'circle', 'estimate-point');
		const drifts = series(body, 'rect', 'drift');
		const loads = series(body, 'rect', 'load');
		const estimatePath = pathCommands(series(body, 'path', 'estimate')[0]);
		const trainingMaxPath = pathCommands(series(body, 'path', 'training-max')[0]);
		const spineXs = ['workout-1', 'workout-2', 'workout-3'].map((workoutId) =>
			number(byWorkout(spines, workoutId), 'x1')
		);

		for (const [index, spineX] of spineXs.entries()) {
			expect(estimatePath[index].x).toBeCloseTo(spineX, 1);
			expect(trainingMaxPath[index].x).toBeCloseTo(spineX, 1);
		}

		for (const workoutId of ['workout-1', 'workout-2']) {
			const spineX = number(byWorkout(spines, workoutId), 'x1');
			expect(number(byWorkout(estimates, workoutId), 'cx')).toBeCloseTo(spineX, 5);

			const drift = byWorkout(drifts, workoutId);
			expect(number(drift, 'x') + number(drift, 'width') / 2).toBeCloseTo(spineX, 5);

			const load = byWorkout(loads, workoutId);
			expect(number(load, 'x') + number(load, 'width') / 2).toBeCloseTo(spineX, 5);
		}

		// The same 100 kg value occurs in different series and must land at the
		// same y coordinate, proving estimate and training max share one kg scale.
		expect(estimatePath[0].y).toBeCloseTo(trainingMaxPath[1].y, 5);

		const zero = number(series(body, 'line', 'drift-zero')[0], 'y1');
		const under = byWorkout(drifts, 'workout-1');
		const over = byWorkout(drifts, 'workout-2');
		expect(number(over, 'y') + number(over, 'height')).toBeCloseTo(zero, 5);
		expect(number(under, 'y')).toBeCloseTo(zero, 5);
		expect(number(over, 'height')).toBeCloseTo(number(under, 'height'), 5);

		const zeroLoad = byWorkout(loads, 'workout-1');
		const workedLoad = byWorkout(loads, 'workout-2');
		expect(number(zeroLoad, 'height')).toBe(0);
		expect(number(zeroLoad, 'y')).toBeCloseTo(
			number(workedLoad, 'y') + number(workedLoad, 'height'),
			5
		);
	});

	it('draws gaps instead of connecting or zeroing missing middle observations', () => {
		const body = html([
			point({ workout_id: 'workout-1', at: '2026-01-01T08:00:00Z' }),
			point({
				workout_id: 'workout-2',
				at: '2026-02-01T08:00:00Z',
				estimate: null,
				training_max: null,
				training_max_label: null,
				load_moved_kg: undefined
			}),
			point({
				workout_id: 'workout-3',
				at: '2026-03-01T08:00:00Z',
				estimate: 130,
				training_max: 110,
				load_moved_kg: 5000
			})
		]);

		const spines = series(body, 'line', 'spine');
		const middleX = number(byWorkout(spines, 'workout-2'), 'x1');
		const estimateCommands = pathCommands(series(body, 'path', 'estimate')[0]);
		const trainingMaxCommands = pathCommands(series(body, 'path', 'training-max')[0]);

		expect(estimateCommands.map(({ command }) => command)).toEqual(['M', 'M']);
		expect(trainingMaxCommands.map(({ command }) => command)).toEqual(['M', 'M']);
		for (const command of [...estimateCommands, ...trainingMaxCommands]) {
			expect(Math.abs(command.x - middleX)).toBeGreaterThan(0.1);
		}
		expect(
			series(body, 'circle', 'estimate-point').map((marker) => marker['data-workout-id'])
		).toEqual(['workout-1', 'workout-3']);
		expect(series(body, 'rect', 'load').map((bar) => bar['data-workout-id'])).toEqual([
			'workout-1',
			'workout-3'
		]);
	});
});

describe('IndicatorGrid SSR', () => {
	it('renders only dashboard indicators in the approved order and formats their units', () => {
		const indicators: components['schemas']['Indicator'][] = [
			{ key: 'sets_under', label: 'Sets under', value: 2, unit: 'count' },
			{ key: 'median_interval', label: 'Typical gap between sets', value: 150, unit: 'seconds' },
			{ key: 'load_moved', label: 'Load moved', value: 4200.5, unit: 'kg' },
			{ key: 'sessions', label: 'Sessions', value: 8, unit: 'count' },
			{ key: 'interval_average', label: 'Average gap between sets', value: 125, unit: 'seconds' },
			{ key: 'average_duration', label: 'Average session', value: 3600, unit: 'seconds' },
			{ key: 'sets_over', label: 'Sets over', value: 3, unit: 'count' },
			{ key: 'interval_max', label: 'Longest gap between sets', value: 240, unit: 'seconds' },
			{ key: 'interval_min', label: 'Shortest gap between sets', value: 75, unit: 'seconds' }
		];
		const body = render(IndicatorGrid, { props: { indicators } }).body;

		const labels = [
			'Sessions',
			'Load moved',
			'Average session',
			'Shortest gap between sets',
			'Average gap between sets',
			'Longest gap between sets',
			'Sets over',
			'Sets under'
		];
		for (const label of labels) expect(body).toContain(label);
		for (let index = 1; index < labels.length; index += 1) {
			expect(body.indexOf(labels[index - 1])).toBeLessThan(body.indexOf(labels[index]));
		}

		expect(body).not.toContain('Typical gap between sets');
		expect(body).toContain('4,200.5 kg');
		expect(body).toContain('1:00:00');
		expect(body).toContain('2:05');
	});
});
