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
			actualWeight: set.prescribed_weight,
			actualReps: set.prescribed_reps,
			status: 'pending',
			loggedAt: null
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

/** Records what the athlete actually lifted, without logging the set yet. */
export function editSet(
	session: LocalSession,
	position: number,
	values: { weight?: number; reps?: number }
): LocalSession {
	return replace(session, position, (set) => ({
		...set,
		actualWeight: values.weight ?? set.actualWeight,
		actualReps: values.reps ?? set.actualReps
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
	return replace(session, position, (set) => ({ ...set, status: 'skipped', loggedAt: at }));
}

/** Undoes a log or a skip, back to the prescription as written. */
export function resetSet(session: LocalSession, position: number): LocalSession {
	return replace(session, position, (set) => ({
		...set,
		status: 'pending',
		actualWeight: set.prescribedWeight,
		actualReps: set.prescribedReps,
		// Cleared with the status. A stamp surviving an undo would report an
		// interval for a set the athlete decided they had not done.
		loggedAt: null
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
			logged_at: set.loggedAt
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

/** The four answers, in the order they are offered (D-08). */
export const CUT_REASONS: { value: CutReason; label: string }[] = [
	{ value: 'out_of_time', label: 'Ran out of time' },
	{ value: 'pain', label: 'Pain or injury' },
	{ value: 'equipment', label: 'Equipment unavailable' },
	{ value: 'enough', label: 'Done enough' }
];
