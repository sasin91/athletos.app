import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

import type { ProgressView } from '$lib/dashboard';
import Page from './+page.svelte';
import { load } from './+page.server';

const enrollment = {
	id: '019f9fbf-ab32-7c52-90ee-02b7f3092242',
	program_key: 'wendler-531-bbb',
	program_name: '5/3/1 Boring But Big',
	status: 'active' as const,
	started_at: '2026-08-01T08:00:00Z',
	ended_at: null,
	progress: { completed: 2, total: 16 },
	readout: [],
	weighted_exercises: [],
	adjustments: {}
};

const progress: ProgressView = {
	lifts: [],
	overall: [],
	programs: [],
	sessions: [],
	window_months: 12
};

const observedProgress: ProgressView = {
	lifts: [
		{
			exercise: 'squat',
			label: 'Squat',
			bests: [],
			estimate_change: { kg: 10, percent: null },
			points: [
				{
					workout_id: 'workout-1',
					at: '2026-08-02T08:00:00Z',
					estimate: 150,
					training_max: 135,
					training_max_label: 'Training max',
					drift_kg: -5,
					sets_over: 0,
					sets_under: 1,
					reasons: []
				}
			]
		}
	],
	sessions: [
		{
			workout_id: 'workout-1',
			enrollment_id: enrollment.id,
			at: '2026-08-02T08:00:00Z',
			load_moved_kg: 5000,
			load_planned_kg: 5100,
			sets_over: 0,
			sets_under: 1,
			duration_seconds: 3500
		}
	],
	programs: [
		{
			enrollment_id: enrollment.id,
			program_key: enrollment.program_key,
			program_name: enrollment.program_name,
			status: 'active',
			indicators: [
				{ key: 'sessions', label: 'Sessions', value: 1, unit: 'count' },
				{ key: 'load_moved', label: 'Load moved', value: 5000, unit: 'kg' }
			]
		}
	],
	overall: [
		{ key: 'sessions', label: 'Sessions', value: 1, unit: 'count' },
		{ key: 'load_moved', label: 'Load moved', value: 5000, unit: 'kg' }
	],
	window_months: 12
};

function result<T>(data: T, status = 200) {
	return { data, response: new Response(null, { status }) };
}

describe('Train page load', () => {
	it('starts required enrollments and optional progress together and returns both', async () => {
		let releaseEnrollments!: () => void;
		let releaseProgress!: () => void;
		const enrollmentGate = new Promise<void>((resolve) => (releaseEnrollments = resolve));
		const progressGate = new Promise<void>((resolve) => (releaseProgress = resolve));
		const started: string[] = [];

		const GET = vi.fn(async (path: string) => {
			started.push(path);
			if (path === '/v1/enrollments') {
				await enrollmentGate;
				return result({ enrollments: [enrollment] });
			}
			if (path === '/v1/progress') {
				await progressGate;
				return result(progress);
			}
			if (path === '/v1/programs') return result({ programs: [] });
			return result({ enrollment_id: enrollment.id, adjustments: {} });
		});

		const pending = load({
			locals: { api: { GET } },
			url: new URL('https://athletos.app/?lift=squat')
		} as never);

		await vi.waitFor(() => {
			expect(started).toContain('/v1/enrollments');
			expect(started).toContain('/v1/progress');
		});
		releaseEnrollments();
		releaseProgress();

		await expect(pending).resolves.toMatchObject({
			enrollments: [expect.objectContaining({ id: enrollment.id })],
			progress,
			requestedLift: 'squat'
		});
	});

	it('keeps enrollments when progress is unavailable', async () => {
		const GET = vi.fn(async (path: string) => {
			if (path === '/v1/enrollments') return result({ enrollments: [enrollment] });
			if (path === '/v1/progress') return { response: new Response(null, { status: 503 }) };
			if (path === '/v1/programs') return result({ programs: [] });
			return result({ enrollment_id: enrollment.id, adjustments: {} });
		});

		await expect(
			load({ locals: { api: { GET } }, url: new URL('https://athletos.app/') } as never)
		).resolves.toMatchObject({
			enrollments: [expect.objectContaining({ id: enrollment.id })],
			progress: null
		});
	});

	it('does not swallow a progress authentication refusal', async () => {
		const GET = vi.fn(async (path: string) => {
			if (path === '/v1/enrollments') return result({ enrollments: [enrollment] });
			if (path === '/v1/progress') return { response: new Response(null, { status: 401 }) };
			if (path === '/v1/programs') return result({ programs: [] });
			return result({ enrollment_id: enrollment.id, adjustments: {} });
		});

		await expect(
			load({ locals: { api: { GET } }, url: new URL('https://athletos.app/') } as never)
		).rejects.toMatchObject({ status: 303, location: '/login' });
	});
});

describe('Train page SSR', () => {
	it('scopes each active enrollment adjustment form to that enrollment', () => {
		const second = {
			...enrollment,
			id: '019f9fbf-ab32-7c52-90ee-02b7f3092243',
			program_name: 'Second active program'
		};
		const active = [
			{
				...enrollment,
				weighted_exercises: [{ exercise: 'squat', label: 'Squat' }]
			},
			{
				...second,
				weighted_exercises: [{ exercise: 'bench', label: 'Bench Press' }]
			}
		];
		const body = render(Page, {
			props: {
				data: { enrollments: active, progress: null, requestedLift: null },
				form: null
			}
		}).body;
		const forms = body.match(/<form\b[^>]*>[\s\S]*?<\/form>/g) ?? [];

		expect(forms).toHaveLength(2);
		expect(forms[0]).toContain(`name="enrollment_id" value="${enrollment.id}"`);
		expect(forms[0]).not.toContain(second.id);
		expect(forms[1]).toContain(`name="enrollment_id" value="${second.id}"`);
		expect(forms[1]).not.toContain(enrollment.id);
	});

	it('keeps training usable when statistics are unavailable', () => {
		const body = render(Page, {
			props: {
				data: { enrollments: [enrollment], progress: null, requestedLift: null },
				form: null
			}
		}).body;

		expect(body).toContain('What am I doing today?');
		expect(body).toContain('Statistics unavailable.');
	});

	it('renders training, chart, enrollment statistics, overall, then finished programs', () => {
		const finished = {
			...enrollment,
			id: '019f9fbf-ab32-7c52-90ee-02b7f3092243',
			status: 'finished' as const,
			program_name: 'Completed program',
			ended_at: '2026-08-07T08:00:00Z'
		};
		const body = render(Page, {
			props: {
				data: {
					enrollments: [enrollment, finished],
					progress: observedProgress,
					requestedLift: 'squat'
				},
				form: null
			}
		}).body;

		const ordered = [
			'What am I doing today?',
			'Squat progress',
			`${enrollment.program_name} statistics`,
			'Overall',
			'Finished',
			'Completed program — finished'
		];
		for (let index = 1; index < ordered.length; index += 1) {
			expect(body.indexOf(ordered[index - 1])).toBeGreaterThanOrEqual(0);
			expect(body.indexOf(ordered[index - 1])).toBeLessThan(body.indexOf(ordered[index]));
		}

		expect(body).toContain(`data-enrollment-id="${enrollment.id}"`);
		expect(body).toContain('Estimate change');
		expect(body).toContain('+10 kg');
		expect(body).not.toContain('+10%');
		expect(body).toContain('Estimated strength');
		expect(body).toContain('Drift from prescription');
		expect(body).toContain('Load moved');
	});

	it('keeps an empty statistics block for every enrollment without inventing zeroes', () => {
		const emptyStatistics: ProgressView = {
			...observedProgress,
			lifts: [
				{
					...observedProgress.lifts[0],
					estimate_change: null
				}
			],
			programs: [
				{
					...observedProgress.programs[0],
					indicators: [{ key: 'sessions', label: 'Sessions', value: 0, unit: 'count' }]
				}
			],
			overall: [{ key: 'sessions', label: 'Sessions', value: 0, unit: 'count' }]
		};
		const body = render(Page, {
			props: {
				data: {
					enrollments: [enrollment],
					progress: emptyStatistics,
					requestedLift: 'squat'
				},
				form: null
			}
		}).body;

		expect(body).not.toContain('Estimate change');
		expect(body).toContain(`${enrollment.program_name} statistics`);
		expect(body).toContain('No observations in this period.');
		expect(body).not.toContain('Sessions</');
		expect(body).not.toContain('<summary class="cursor-pointer font-medium">Overall</summary>');
	});

	it('renders truthful empty statistics when an enrollment is absent from progress programs', () => {
		const body = render(Page, {
			props: {
				data: {
					enrollments: [enrollment],
					progress: { ...progress, overall: observedProgress.overall },
					requestedLift: null
				},
				form: null
			}
		}).body;

		expect(body).toContain(`${enrollment.program_name} statistics`);
		expect(body).toContain('No observations in this period.');
		expect(body).not.toContain('<p class="mt-1 font-medium tabular">0</p>');
	});
});
