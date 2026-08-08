import type { ProgressView } from '$lib/dashboard';
import { redirect } from '@sveltejs/kit';
import type { ApiResult } from './api';
import { optionalRequest } from './optional-request';

/**
 * Keep progress optional without weakening the application's authentication
 * boundary. Transport and ordinary API failures remove analytics only; a 401
 * still takes the established `unwrap` path to sign-in.
 */
export async function optionalProgress(
	call: () => Promise<ApiResult<ProgressView>>
): Promise<ProgressView | null> {
	const result = await optionalRequest(call);
	if (result.state === 'unauthenticated') redirect(303, '/login');
	return result.state === 'available' ? result.data : null;
}
