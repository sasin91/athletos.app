import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

import type { ProgressView } from '$lib/dashboard';
import { optionalProgress } from './dashboard';

const progress: ProgressView = {
	lifts: [],
	overall: [],
	programs: [],
	sessions: [],
	window_months: 12
};

describe('optionalProgress', () => {
	it('returns available progress data', async () => {
		await expect(
			optionalProgress(async () => ({
				data: progress,
				response: new Response(null, { status: 200 })
			}))
		).resolves.toBe(progress);
	});

	it('maps an ordinary API refusal to absent analytics', async () => {
		await expect(
			optionalProgress(async () => ({ response: new Response(null, { status: 503 }) }))
		).resolves.toBeNull();
	});

	it('preserves the existing login redirect for a 401', async () => {
		await expect(
			optionalProgress(async () => ({ response: new Response(null, { status: 401 }) }))
		).rejects.toMatchObject({ status: 303, location: '/login' });
	});

	it('maps a rejected request promise to absent analytics', async () => {
		await expect(
			optionalProgress(async () => {
				throw new TypeError('fetch failed');
			})
		).resolves.toBeNull();
	});
});
