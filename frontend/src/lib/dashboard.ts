import type { components } from './api/schema';

export type ProgressView = components['schemas']['AthleteProgress'];
export type LiftTrend = components['schemas']['LiftTrend'];
export type SessionFigures = components['schemas']['SessionFigures'];
export type TrendPoint = components['schemas']['TrendPoint'];

/**
 * One chronological lift fact with the matching session's server-computed load.
 *
 * The join is intentionally narrow. Drift, estimates, training maxes and load
 * have already been calculated by Rust; this type only puts facts sharing a
 * workout id on the same drawing row. An absent session remains absent instead
 * of turning into a zero-load workout that never happened.
 */
export type DashboardPoint = TrendPoint & {
	load_moved_kg?: number;
};

function latestEstimateAt(lift: LiftTrend): number | null {
	let latest: number | null = null;

	for (const point of lift.points) {
		if (point.estimate === null || point.estimate === undefined) continue;

		const at = Date.parse(point.at);
		if (!Number.isFinite(at)) continue;
		if (latest === null || at > latest) latest = at;
	}

	return latest;
}

/**
 * Resolve the requested lift, or choose the lift with the freshest estimate.
 *
 * Exercise-key ordering is the final tie-break rather than array order, so SSR
 * produces the same selection even if an upstream query changes its ordering.
 */
export function selectLift(progress: ProgressView, requested: string | null): LiftTrend | null {
	if (requested !== null) {
		const exact = progress.lifts.find((lift) => lift.exercise === requested);
		if (exact) return exact;
	}

	return (
		progress.lifts
			.map((lift) => ({ lift, latest: latestEstimateAt(lift) }))
			.filter(
				(candidate): candidate is { lift: LiftTrend; latest: number } => candidate.latest !== null
			)
			.sort((left, right) => {
				if (left.latest !== right.latest) return right.latest - left.latest;
				if (left.lift.exercise < right.lift.exercise) return -1;
				if (left.lift.exercise > right.lift.exercise) return 1;
				return 0;
			})[0]?.lift ?? null
	);
}

/** Join server facts by workout id while preserving the lift trend's order. */
export function chartPoints(lift: LiftTrend, sessions: SessionFigures[]): DashboardPoint[] {
	const loadByWorkout = new Map(
		sessions.map((session) => [session.workout_id, session.load_moved_kg] as const)
	);

	return lift.points.map((point) => {
		const load = loadByWorkout.get(point.workout_id);
		return load === undefined ? { ...point } : { ...point, load_moved_kg: load };
	});
}
