import { describe, expect, it, vi } from 'vitest';
import { POST } from './+server';

function request(origin = 'https://athletos.app') {
	return new Request('https://athletos.app/api/workout-definitions', {
		method: 'POST',
		headers: { origin, 'content-type': 'application/json', 'x-athlete-id': 'athlete-a' },
		body: JSON.stringify({ title: 'Saved session', blocks: [] })
	});
}

describe('save session as workout account boundary', () => {
	it('does not save an old tab session into the newly signed-in account', async () => {
		const create = vi.fn();
		const response = await POST({
			request: request(),
			url: new URL('https://athletos.app/api/workout-definitions'),
			locals: {
				authenticated: true,
				api: { GET: vi.fn(async () => ({ data: { athlete_id: 'athlete-b' } })), POST: create }
			}
		} as never);
		expect(response.status).toBe(401);
		expect(create).not.toHaveBeenCalled();
	});
	it('rejects a cross-origin write before calling the API', async () => {
		const create = vi.fn();
		const response = await POST({
			request: request('https://other.test'),
			url: new URL('https://athletos.app/api/workout-definitions'),
			locals: { authenticated: true, api: { POST: create } }
		} as never);
		expect(response.status).toBe(403);
		expect(create).not.toHaveBeenCalled();
	});
});
