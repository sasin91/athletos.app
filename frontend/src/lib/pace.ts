/**
 * Turning the athlete's pace into a finish time (D-10).
 *
 * The pace itself — the median seconds-per-set, which sessions count toward it,
 * and how few sessions is too few — is computed in Rust and arrives on the
 * next-session response as `pace`. It used to be worked out here, over a history
 * list and five workout details, and it should not have been: a median
 * seconds-per-set rule is a rule about training, and anything decided in a
 * `+page.server.ts` is something the future native client has to reimplement in
 * another language (D-11).
 *
 * What is left is the one step the server cannot take. The logger's header
 * re-projects every second against a clock and a set list that live on the
 * phone, offline, and that the server has never seen (D-09) — so it multiplies a
 * rate the server measured by a count it owns itself. That is arithmetic over a
 * measurement, not a decision about training.
 */

/**
 * When this session will be finished, in epoch milliseconds.
 *
 * `null` when there is no pace to project from, which is the same as "do not
 * show it": an invented finish time is worse than none, for the same reason
 * an invented progress denominator is (D-03).
 */
export function projectedFinish(
	nowMilliseconds: number,
	setsRemaining: number,
	secondsPerSet: number | null
): number | null {
	if (secondsPerSet === null || secondsPerSet <= 0) return null;
	if (setsRemaining <= 0) return nowMilliseconds;

	return nowMilliseconds + setsRemaining * secondsPerSet * 1000;
}
