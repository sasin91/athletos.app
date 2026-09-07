/** Keep sign-in intent on this origin, including browser-normalized backslashes. */
export function safeDestination(from: string | null, fallback = '/'): string {
	// Control characters are stripped by URL parsers and must not change the destination's authority.
	// eslint-disable-next-line no-control-regex
	if (!from?.startsWith('/') || from.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(from))
		return fallback;
	return from;
}
