/**
 * The hour, formatted (D-10).
 *
 * Duration is wall clock and nothing else — `started_at` to now, or
 * `started_at` to `ended_at`. There is deliberately **no rest timer** here: one
 * was tried in the predecessor app and removed because it was a stress factor,
 * which is evidence rather than taste.
 */

/**
 * `m:ss` under an hour, `h:mm:ss` over it.
 *
 * Minutes are the unit the athlete is actually watching, so they are not padded
 * below an hour — "7:04" reads faster than "07:04" at arm's length — and are
 * padded above it, where the hours field is what leads.
 */
export function formatElapsed(milliseconds: number): string {
	const total = Math.max(0, Math.floor(milliseconds / 1000));
	const seconds = total % 60;
	const minutes = Math.floor(total / 60) % 60;
	const hours = Math.floor(total / 3600);

	const pad = (value: number) => value.toString().padStart(2, '0');

	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * A duration in whole minutes, for a history row.
 *
 * "58 min" is the answer to "am I inside my hour"; the seconds are noise.
 */
export function formatMinutes(seconds: number | null | undefined): string | null {
	if (seconds === null || seconds === undefined) return null;
	return `${Math.round(seconds / 60)} min`;
}

/** A clock time, for the projected finish. Local to the phone, by design. */
export function formatClock(at: Date): string {
	return `${at.getHours()}:${at.getMinutes().toString().padStart(2, '0')}`;
}

/** A date, for a history row. */
export function formatDate(instant: string): string {
	const at = new Date(instant);
	if (Number.isNaN(at.getTime())) return instant;

	return at.toLocaleDateString(undefined, {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});
}
