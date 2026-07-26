/**
 * Projecting a finish time from the athlete's own history (D-10).
 *
 * The session header shows elapsed time and sets remaining. Once there is
 * enough history it also shows *when this will be over*, computed from the
 * athlete's own median seconds-per-set — not from an estimate baked into the
 * program, and not shown at all before there is data to compute it from.
 *
 * Median rather than mean, because the distribution has a long right tail that
 * a mean would follow: one session interrupted by a phone call would push every
 * projection out for weeks.
 *
 * ## Why this lives in the client
 *
 * It is presentation over data the API already returned — no rule about
 * training is being decided here, and nothing is persisted. The number is
 * computed server-side at commit and travels *with* the cached session, so the
 * logger can draw the header with no network at all (D-09).
 */

/** One past session: how long it took, and how many sets were in it. */
export type PaceSample = {
	durationSeconds: number | null | undefined;
	sets: number;
};

/**
 * How many sessions before a projection is honest.
 *
 * D-10 says "roughly three". Two would let a single outlier be the median.
 */
export const PACE_SAMPLE_FLOOR = 3;

/**
 * The athlete's median seconds per set, or `null` when there is not enough to
 * say.
 *
 * Sessions with no duration or no sets are dropped rather than counted as zero:
 * an auto-closed session (D-08) would otherwise drag the median toward a pace
 * nobody ever lifted at.
 */
export function medianSecondsPerSet(samples: PaceSample[]): number | null {
	const rates = samples
		.filter(
			(sample) =>
				typeof sample.durationSeconds === 'number' && sample.durationSeconds > 0 && sample.sets > 0
		)
		.map((sample) => (sample.durationSeconds as number) / sample.sets)
		.sort((a, b) => a - b);

	if (rates.length < PACE_SAMPLE_FLOOR) return null;

	const middle = Math.floor(rates.length / 2);

	return rates.length % 2 === 1 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2;
}

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
