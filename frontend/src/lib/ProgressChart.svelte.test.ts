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

	it('shares one chronological spine across all three panels', () => {
		const body = html([
			point({ workout_id: 'workout-1', at: '2026-01-01T08:00:00Z', drift_kg: -15 }),
			point({
				workout_id: 'workout-2',
				at: '2026-02-01T08:00:00Z',
				estimate: 127.5,
				training_max: 105,
				drift_kg: 10,
				load_moved_kg: 4600
			}),
			point({
				workout_id: 'workout-3',
				at: '2026-03-01T08:00:00Z',
				estimate: 132,
				training_max: null,
				training_max_label: null,
				drift_kg: 0,
				load_moved_kg: undefined
			})
		]);

		expect(body).toContain('data-series="estimate"');
		expect(body).toContain('data-series="training-max"');
		expect(body).toContain('stroke-dasharray="5 5"');
		expect(body).toContain('data-panel="drift"');
		expect(body).toContain('data-series="load"');
		expect(body).toContain('3 recorded Squat sessions.');
		expect(body).not.toMatch(/NaN|Infinity/);
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
		for (let index = 1; index < labels.length; index += 1) {
			expect(body.indexOf(labels[index - 1])).toBeLessThan(body.indexOf(labels[index]));
		}

		expect(body).not.toContain('Typical gap between sets');
		expect(body).toContain('4,200.5 kg');
		expect(body).toContain('1:00:00');
		expect(body).toContain('2:05');
	});
});
