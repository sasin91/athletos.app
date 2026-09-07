import { describe, expect, it, vi } from 'vitest';
import { POST as legacyPost } from './+server';
import { POST as editablePost } from '../v2/workouts/+server';

describe('queued workout account checks', () => {
	for (const [version, handler] of [
		['legacy', legacyPost],
		['editable', editablePost]
	] as const) {
		it(`${version} retains a wrong-account submission for a later sign-in`, async () => {
			const POST = vi.fn();
			const response = await handler({
				locals: {
					authenticated: true,
					api: { GET: vi.fn(async () => ({ data: { athlete_id: 'other-account' } })), POST }
				},
				request: new Request('https://athletos.app/api/workouts', {
					method: 'POST',
					headers: { 'content-type': 'application/json', 'x-athlete-id': 'original-account' },
					body: JSON.stringify({ id: 'workout' })
				})
			} as never);
			expect(response.status).toBe(401);
			expect(POST).not.toHaveBeenCalled();
		});
	}
	it('forwards an editable submission only with its matching authenticated account', async () => {
		const body = { id: 'workout', source: 'ad_hoc', sets: [] };
		const POST = vi.fn(async () => ({
			data: { id: 'workout' },
			response: new Response(null, { status: 201 })
		}));
		const response = await editablePost({
			locals: {
				authenticated: true,
				api: { GET: vi.fn(async () => ({ data: { athlete_id: 'original-account' } })), POST }
			},
			request: new Request('https://athletos.app/api/v2/workouts', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-athlete-id': 'original-account' },
				body: JSON.stringify(body)
			})
		} as never);
		expect(response.status).toBe(201);
		expect(POST).toHaveBeenCalledWith('/v2/workouts', { body });
	});
});
