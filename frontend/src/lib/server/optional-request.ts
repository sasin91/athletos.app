type RequestResult<T> = {
	data?: T;
	response: { status: number };
};

export type OptionalRequestResult<T> =
	{ state: 'available'; data: T } | { state: 'unavailable' } | { state: 'unauthenticated' };

/**
 * Contain an optional API call without making authentication optional.
 *
 * openapi-fetch can reject on transport failure. Those failures and ordinary
 * non-success responses remove only the optional panel; a 401 remains distinct
 * so the route can preserve the application's normal sign-in redirect.
 */
export async function optionalRequest<T>(
	request: () => Promise<RequestResult<T>>
): Promise<OptionalRequestResult<T>> {
	let result: RequestResult<T>;

	try {
		result = await request();
	} catch {
		return { state: 'unavailable' };
	}

	if (result.response.status === 401) return { state: 'unauthenticated' };
	if (result.data === undefined) return { state: 'unavailable' };

	return { state: 'available', data: result.data };
}
