import type { ProgressView } from '$lib/dashboard';
import { unwrap, type ApiResult } from './api';

/**
 * Keep progress optional without weakening the application's authentication
 * boundary. Transport and ordinary API failures remove analytics only; a 401
 * still takes the established `unwrap` path to sign-in.
 */
export async function optionalProgress(
	call: () => Promise<ApiResult<ProgressView>>
): Promise<ProgressView | null> {
	let result: ApiResult<ProgressView>;

	try {
		result = await call();
	} catch {
		return null;
	}

	if (result.response.status === 401) {
		return unwrap(result, 'Could not load your statistics.');
	}

	return result.data ?? null;
}
