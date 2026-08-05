/**
 * The committed session as it lives on the phone (D-07, D-08, D-09).
 *
 * Peeking is free and writes nothing. **Committing** takes the prescription the
 * server already expanded, materialises every set locally with
 * `status: 'pending'`, stamps `started_at`, and mints the workout id the submit
 * will eventually carry. From that moment the athlete can be in a basement with
 * no signal: logging never touches the network.
 *
 * Nothing here decides anything about training. Weights arrive rounded, plate
 * breakdowns arrive computed, positions arrive numbered — all from Rust (D-11).
 * What this module does is remember what the athlete did to that prescription,
 * and turn it back into the submission shape at the end.
 */

import type { components } from './api/schema';
import { intervalBetween } from './time';

type Schemas = components['schemas'];

export type NextSession = Schemas['NextSession'];
export type CutReason = Schemas['CutReason'];
export type SetStatus = Schemas['SetStatus'];
export type WorkoutSubmission = Schemas['WorkoutSubmission'];
export type PlateChange = Schemas['PlateChangeView'];
export type WorkoutReceipt = Schemas['WorkoutReceipt'];
export type DriftReason = Schemas['DriftReason'];

/**
 * One set, prescribed and actual side by side (D-07).
 *
 * `actualWeight` and `actualReps` are **pre-filled from the prescription**, so
 * that logging a set as written is one tap and going heavier is an edit. Both
 * numbers are kept and both are submitted; the prescribed pair is never
 * overwritten, because drift is measured against the number the athlete was
 * actually shown.
 */
export type LocalSet = {
	position: number;
	exercise: string;
	label: string;
	prescribedWeight: number;
	prescribedReps: number;
	amrap: boolean;
	/** Plates for one side of the bar, from the server. Empty if not a barbell. */
	platesPerSide: number[];
	/**
	 * What comes off the bar and what goes on to reach this set, planned by the
	 * server against the previous set of the same exercise (D-04).
	 *
	 * `null` for anything not loaded with plates. Cached at commit like
	 * everything else here: the logger runs with no network and cannot ask for
	 * a plan later.
	 */
	plateChange: PlateChange | null;
	actualWeight: number;
	actualReps: number;
	status: SetStatus;
	/**
	 * When the athlete tapped Log or Skip, RFC 3339, from this phone (D-10).
	 *
	 * `null` while the set is pending, and again after an undo — a stamp left
	 * behind by a log that was taken back would put an interval in the breakdown
	 * for work that was not done at that time.
	 *
	 * Stamped here rather than on the server because the logger runs with no
	 * network and the submit can land hours later (D-09).
	 */
	loggedAt: string | null;
	/**
	 * What the athlete wrote about this set, or `null`.
	 *
	 * Where "left shoulder felt off" goes. Attached to the set rather than the
	 * session because attached to the session it is a fact about nothing.
	 */
	note: string | null;
	/**
	 * Why this set is not being lifted as prescribed, or `null`.
	 *
	 * Never asked for and never defaulted: an unanswered edit stays `null`
	 * rather than becoming "too easy", which would be a claim nobody made on
	 * the one signal the product exists to read (D-07).
	 */
	driftReason: DriftReason | null;
};

/** A committed session, and everything the logger needs to run offline. */
export type LocalSession = {
	/** The client-minted UUIDv7. The idempotency key for the whole submit. */
	id: string;
	enrollmentId: string;
	programKey: string;
	week: number;
	day: number;
	focus: string | null;
	/** Stamped on commit — never on peek (D-08). RFC 3339. */
	startedAt: string;
	/**
	 * The athlete's median seconds per set at the moment of committing, or
	 * `null` when there was not enough history to know (D-10).
	 *
	 * Captured here rather than fetched by the logger, because the logger must
	 * work with no network.
	 */
	secondsPerSet: number | null;
	sets: LocalSet[];
	/** Cues per exercise key, resolved server-side from the compiled registry. */
	cues: Record<string, string[]>;
};

/** What committing needs that the prescription does not carry. */
export type CommitOptions = {
	id: string;
	startedAt: string;
	secondsPerSet: number | null;
};

/**
 * Turns a peeked session into a committed one.
 *
 * This is the only place `started_at` is stamped, and it happens on the phone,
 * not in a handler — which is the whole of D-08's distinction between looking
 * and starting.
 */
export function commitSession(next: NextSession, options: CommitOptions): LocalSession {
	return {
		id: options.id,
		enrollmentId: next.enrollment_id,
		programKey: next.program_key,
		week: next.week,
		day: next.day,
		focus: next.focus ?? null,
		startedAt: options.startedAt,
		secondsPerSet: options.secondsPerSet,
		sets: next.prescribed_sets.map((set) => ({
			position: set.position,
			exercise: set.exercise,
			label: set.label,
			prescribedWeight: set.prescribed_weight,
			prescribedReps: set.prescribed_reps,
			amrap: set.amrap,
			platesPerSide: set.plates_per_side,
			plateChange: set.plate_change ?? null,
			actualWeight: set.prescribed_weight,
			actualReps: set.prescribed_reps,
			status: 'pending',
			loggedAt: null,
			note: null,
			driftReason: null
		})),
		cues: Object.fromEntries(next.blocks.map((block) => [block.exercise, block.cues]))
	};
}

function replace(
	session: LocalSession,
	position: number,
	change: (set: LocalSet) => LocalSet
): LocalSession {
	return {
		...session,
		sets: session.sets.map((set) => (set.position === position ? change(set) : set))
	};
}

/**
 * Records what the athlete actually lifted.
 *
 * Editing the addressed set is always allowed, whatever its status — a
 * correction to a number mistyped after logging is a correction to the
 * record, not a falsification of it.
 *
 * A **weight** edit carries — but only when the addressed set is itself
 * `pending`. Correcting an already-logged set changes what happened; it must
 * not rewrite the plan for sets not yet performed.
 *
 * What carries is the **difference**, not the weight: `delta = the new weight
 * minus the edited set's own prescription`, applied to each later pending
 * set's *own* prescription and clamped at zero. 5/3/1 BBB prescribes a main
 * lift and its Boring But Big backoff under one `exercise` key at two
 * different percentages (D-04); carrying the raw weight would pre-fill five
 * backoff sets at the main lift's number. Carrying the delta instead means
 * editing set one from 90 to 95 leaves later main-lift sets at their own
 * prescription +5 and the backoff sets at their own prescription +5, and
 * editing back to 90 returns every carried set to exactly its own
 * prescription.
 *
 * The carry stops at the next exercise — which is a different bar, and
 * possibly not even the same bar, the boundary D-04 already draws for the
 * plate chain. Retyping the same correction five times is the app making an
 * honest answer cost more than a dishonest one (D-07).
 *
 * A **rep** edit never carries. It is about that set — an AMRAP that went
 * well, a set cut short at eight — whereas a weight edit is about the bar,
 * and the bar is still loaded when the next set starts.
 *
 * The carry only *writes* to pending sets: a set already logged or skipped is
 * a record of what happened, and rewriting it would falsify the log.
 *
 * `prescribedWeight` is never touched, so drift is still measured against the
 * number the athlete was actually shown.
 */
export function editSet(
	session: LocalSession,
	position: number,
	values: { weight?: number; reps?: number }
): LocalSession {
	const target = session.sets.find((set) => set.position === position);
	if (!target) return session;

	const edited = replace(session, position, (set) => {
		const actualWeight = values.weight ?? set.actualWeight;
		return {
			...set,
			actualWeight,
			actualReps: values.reps ?? set.actualReps,
			driftReason: actualWeight === set.prescribedWeight ? null : set.driftReason
		};
	});

	if (values.weight === undefined || target.status !== 'pending') return edited;

	const delta = values.weight - target.prescribedWeight;

	return {
		...edited,
		sets: edited.sets.map((set) => {
			const carries =
				set.exercise === target.exercise && set.position > position && set.status === 'pending';

			if (!carries) return set;

			const actualWeight = Math.max(0, set.prescribedWeight + delta);
			return {
				...set,
				actualWeight,
				driftReason: actualWeight === set.prescribedWeight ? null : target.driftReason
			};
		})
	};
}

/**
 * Records why this set is not being lifted as prescribed, or clears it.
 *
 * Only attaches to a set that has actually deviated — `actualWeight !==
 * prescribedWeight` — the addressed set included. The server refuses a
 * `drift_reason` on a set sitting at its own prescription with the same check
 * constraint it refuses one on a pending set with, and a chip tapped on a set
 * that never drifted must not take the whole submission down with it.
 *
 * Carries to the same sets a weight edit carries to — later pending sets of
 * the same exercise — because it is one decision continuing, and recording
 * four of five carried sets as unanswered would misreport it. A set among
 * those whose carried weight happens to land back on its own prescription
 * gets `null` regardless, since there is nothing left for the reason to be
 * about.
 */
export function setDriftReason(
	session: LocalSession,
	position: number,
	reason: DriftReason | null
): LocalSession {
	const target = session.sets.find((set) => set.position === position);
	if (!target) return session;

	return {
		...session,
		sets: session.sets.map((set) => {
			const applies =
				set.position === position ||
				(set.exercise === target.exercise && set.position > position && set.status === 'pending');

			if (!applies) return set;

			const deviated = set.actualWeight !== set.prescribedWeight;
			return { ...set, driftReason: deviated ? reason : null };
		})
	};
}

/**
 * Records a note on a set, or clears it.
 *
 * Blank normalises to `null` rather than being stored: a note typed and then
 * cleared is not a note, and the API would reject the empty string anyway.
 */
export function noteSet(session: LocalSession, position: number, note: string): LocalSession {
	const trimmed = note.trim();
	return replace(session, position, (set) => ({
		...set,
		note: trimmed.length > 0 ? trimmed : null
	}));
}

/**
 * Logs a set as it currently stands. One tap, no confirmation, no warning.
 *
 * Nothing in here compares the actual weight to the prescribed one. A cap or a
 * warning produces either dishonest logs or an abandoned app, and honesty must
 * never cost more than dishonesty (D-07).
 */
/**
 * Marks a set done, and records when (D-10).
 *
 * `at` is passed in rather than read from the clock in here, so that this stays
 * a pure function of its arguments and the timing rules can be tested without
 * faking a global. Every caller passes `new Date().toISOString()`.
 */
export function logSet(session: LocalSession, position: number, at: string): LocalSession {
	return replace(session, position, (set) => ({ ...set, status: 'done', loggedAt: at }));
}

/**
 * Marks a set as deliberately not done — work that was prescribed and skipped.
 *
 * Stamped like a log, and for a reason that is easy to miss: a skip is a tap at
 * a moment in time, and the interval that spans it belongs to the exercise that
 * follows. Leaving a skip unstamped would silently attribute that whole gap to
 * whichever set came next.
 */
export function skipSet(session: LocalSession, position: number, at: string): LocalSession {
	return replace(session, position, (set) => ({
		...set,
		status: 'skipped',
		loggedAt: at,
		driftReason: null
	}));
}

/**
 * Undoes a log or a skip, back to the prescription as written.
 *
 * The note is deliberately left alone. Undoing a log takes back the numbers,
 * not the sentence the athlete wrote about their shoulder.
 */
export function resetSet(session: LocalSession, position: number): LocalSession {
	return replace(session, position, (set) => ({
		...set,
		status: 'pending',
		actualWeight: set.prescribedWeight,
		actualReps: set.prescribedReps,
		// Cleared with the status. A stamp surviving an undo would report an
		// interval for a set the athlete decided they had not done.
		loggedAt: null,
		driftReason: null
	}));
}

/** Sets still to lift. A skipped set is not remaining; it has been answered. */
export function setsRemaining(session: LocalSession): number {
	return session.sets.filter((set) => set.status === 'pending').length;
}

export function setsDone(session: LocalSession): number {
	return session.sets.filter((set) => set.status === 'done').length;
}

/**
 * Whether the session can be submitted as `completed`.
 *
 * Anything else has to answer D-08's one question, including a session where
 * every set was *skipped* — skipping is work not done, which is the second axis
 * of drift and not a way to finish early without saying so.
 */
export function isComplete(session: LocalSession): boolean {
	return session.sets.every((set) => set.status === 'done');
}

/** The first set not yet answered — where the logger should be looking. */
export function nextSetPosition(session: LocalSession): number | null {
	return session.sets.find((set) => set.status === 'pending')?.position ?? null;
}

/** How a session ended, and why if it ended early. */
export type Ending = {
	endedAt: string;
	/** `null` finishes the session as `completed`. */
	cutReason: CutReason | null;
	notes?: string;
};

/**
 * The one `POST /v1/workouts` body (D-09).
 *
 * Every set travels, including the `pending` and `skipped` ones: what was
 * prescribed and not performed is precisely how "work not done" becomes data.
 * Only a `done` set carries actual numbers — the API refuses a set marked done
 * with none, and a pending set carrying them would be a claim nobody made.
 */
export function toSubmission(session: LocalSession, ending: Ending): WorkoutSubmission {
	return {
		id: session.id,
		enrollment_id: session.enrollmentId,
		started_at: session.startedAt,
		ended_at: ending.endedAt,
		outcome: ending.cutReason === null ? 'completed' : 'cut_short',
		cut_reason: ending.cutReason,
		notes: ending.notes && ending.notes.length > 0 ? ending.notes : null,
		sets: session.sets.map((set) => ({
			position: set.position,
			exercise: set.exercise,
			prescribed_weight: set.prescribedWeight,
			prescribed_reps: set.prescribedReps,
			actual_weight: set.status === 'done' ? set.actualWeight : null,
			actual_reps: set.status === 'done' ? set.actualReps : null,
			status: set.status,
			logged_at: set.loggedAt,
			note: set.note,
			drift_reason: set.status === 'done' ? set.driftReason : null
		}))
	};
}

/**
 * The interval that ended when this set was answered (D-10).
 *
 * Measured from the previous **answered** set — logged or skipped, since both
 * are a tap at a moment in time — or from the commit for the first one, which
 * makes that figure the lead-in exactly as `timing.rs` treats it.
 *
 * `null` when the set has not been answered, or when the gap is one the
 * product does not believe. Deliberately blended and deliberately not called
 * rest: there is one tap per set, so the number contains the pause after the
 * previous set, the loading, and the performance of this one.
 */
export function intervalBefore(session: LocalSession, position: number): number | null {
	const set = session.sets.find((candidate) => candidate.position === position);
	if (!set?.loggedAt) return null;

	const previous = session.sets
		.filter((candidate) => candidate.position < position && candidate.loggedAt !== null)
		.sort((a, b) => a.position - b.position)
		.at(-1);

	return intervalBetween(previous?.loggedAt ?? session.startedAt, set.loggedAt);
}

/**
 * The plate change to show for a set, or `null` when the plan has gone stale.
 *
 * A plan is computed from the prescription and therefore assumes the bar was
 * loaded as written. Three ways that stops being true, and this is all of
 * them:
 *
 *  * the athlete has **edited this set's** weight, so the plan is for a number
 *    they are not loading;
 *  * an **earlier set of the same exercise** was logged at a different weight,
 *    so the bar is not where the server assumed — and every plan after it in
 *    that exercise is stale, not only the next one;
 *  * an earlier set of the same exercise was **skipped**, so the bar was never
 *    loaded to that weight at all.
 *
 * A different exercise cannot stale this one: the plan resets to an empty bar
 * between exercises, server-side.
 *
 * All of it is equality between two numbers this module already holds. Nothing
 * here recomputes a plan — the client has no plate arithmetic and is not
 * getting any (D-11). Instructions for a bar that is not in front of you are
 * worse than no instructions.
 */
export function plateChangeFor(session: LocalSession, position: number): PlateChange | null {
	const set = session.sets.find((candidate) => candidate.position === position);
	if (!set?.plateChange) return null;

	if (set.actualWeight !== set.prescribedWeight) return null;

	const disturbed = session.sets.some(
		(candidate) =>
			candidate.exercise === set.exercise &&
			candidate.position < position &&
			(candidate.status === 'skipped' ||
				(candidate.status === 'done' && candidate.actualWeight !== candidate.prescribedWeight))
	);

	return disturbed ? null : set.plateChange;
}

/**
 * Whether the bar already holds this set's weight (D-04).
 *
 * True when the previous *answered* set of the same exercise was lifted at the
 * same weight as this one is about to be. Pure equality between two numbers
 * this module already holds — no plate arithmetic reaches the client and none
 * is coming (D-11).
 *
 * This is what keeps the plate guidance alive once a weight has been edited
 * and carried: `plateChangeFor` goes `null` for every deviated set, and
 * "bar is already loaded" is the true instruction for all of them but the
 * first.
 *
 * Guarded on `plateChange` being present, which is how this module knows the
 * exercise is loaded with plates at all. A pair of dumbbells at the same weight
 * must not be told the bar is loaded.
 */
export function barUnchangedFrom(session: LocalSession, position: number): boolean {
	const set = session.sets.find((candidate) => candidate.position === position);
	if (!set?.plateChange) return false;

	const previous = session.sets
		.filter(
			(candidate) =>
				candidate.exercise === set.exercise &&
				candidate.position < position &&
				candidate.status !== 'pending'
		)
		.sort((a, b) => a.position - b.position)
		.at(-1);

	return previous !== undefined && previous.actualWeight === set.actualWeight;
}

/**
 * What the finish screen says, counted from the session that was just sent.
 *
 * Counting only. There is deliberately **no drift total and no timing
 * breakdown** here: the history page already marks drift per row and does not
 * total it, on the grounds that a total computed in a client is one the next
 * client has to compute again (D-07, D-11) — and D-13 puts drift beside the
 * e1RM trend on purpose, because progress is never shown without its cost. A
 * drift number invented here would be the first place in the product it
 * appears alone. The timing aggregation belongs to `timing.rs` for the same
 * reason, and both are one tap away.
 */
export type SessionSummary = {
	durationSeconds: number;
	done: number;
	skipped: number;
	pending: number;
	total: number;
	cutReason: CutReason | null;
};

export function summarise(session: LocalSession, ending: Ending): SessionSummary {
	const count = (status: SetStatus) => session.sets.filter((set) => set.status === status).length;

	return {
		durationSeconds: Math.max(
			0,
			Math.round((Date.parse(ending.endedAt) - Date.parse(session.startedAt)) / 1000)
		),
		done: count('done'),
		skipped: count('skipped'),
		pending: count('pending'),
		total: session.sets.length,
		cutReason: ending.cutReason
	};
}

/** The four answers, in the order they are offered (D-08). */
export const CUT_REASONS: { value: CutReason; label: string }[] = [
	{ value: 'out_of_time', label: 'Ran out of time' },
	{ value: 'pain', label: 'Pain or injury' },
	{ value: 'equipment', label: 'Equipment unavailable' },
	{ value: 'enough', label: 'Done enough' }
];

/**
 * What each reason is called on screen (D-07).
 *
 * Lower case, matching the `eyebrow` copy the logger already uses. Note that
 * `already_loaded` reads as "bar was loaded" — the stored value names the
 * state, the label names what the athlete did about it.
 */
export const DRIFT_REASON_LABELS: Record<DriftReason, string> = {
	too_easy: 'too easy',
	too_heavy: 'too heavy',
	already_loaded: 'bar was loaded',
	felt_off: 'felt off'
};

/** The four answers, in the order they are offered. "too easy" leads. */
export const DRIFT_REASONS: { value: DriftReason; label: string }[] = (
	['too_easy', 'too_heavy', 'already_loaded', 'felt_off'] as const
).map((value) => ({ value, label: DRIFT_REASON_LABELS[value] }));
