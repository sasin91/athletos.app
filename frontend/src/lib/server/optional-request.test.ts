import { describe, expect, it } from 'vitest';

import { optionalRequest } from './optional-request';

describe('optionalRequest', () => {
	it('returns available data', async () => {
		await expect(
			optionalRequest(async () => ({ data: { programs: [] }, response: { status: 200 } }))
		).resolves.toEqual({ state: 'available', data: { programs: [] } });
	});

	it('maps transport failures and ordinary API failures to unavailable', async () => {
		await expect(
			optionalRequest(async () => {
				throw new TypeError('fetch failed');
			})
		).resolves.toEqual({ state: 'unavailable' });

		await expect(optionalRequest(async () => ({ response: { status: 503 } }))).resolves.toEqual({
			state: 'unavailable'
		});
	});

	it('keeps an authentication refusal distinct from optional failure', async () => {
		await expect(optionalRequest(async () => ({ response: { status: 401 } }))).resolves.toEqual({
			state: 'unauthenticated'
		});
	});
});
