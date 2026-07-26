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
			status: 'pending'
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
export function logSet(session: LocalSession, position: number): LocalSession {
	return replace(session, position, (set) => ({ ...set, status: 'done' }));
}

/** Marks a set as deliberately not done — work that was prescribed and skipped. */
export function skipSet(session: LocalSession, position: number): LocalSession {
	return replace(session, position, (set) => ({ ...set, status: 'skipped' }));
}

/** Undoes a log or a skip, back to the prescription as written. */
export function resetSet(session: LocalSession, position: number): LocalSession {
	return replace(session, position, (set) => ({
		...set,
		status: 'pending',
		actualWeight: set.prescribedWeight,
		actualReps: set.prescribedReps
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
			status: set.status
		}))
	};
}

/** The four answers, in the order they are offered (D-08). */
export const CUT_REASONS: { value: CutReason; label: string }[] = [
	{ value: 'out_of_time', label: 'Ran out of time' },
	{ value: 'pain', label: 'Pain or injury' },
	{ value: 'equipment', label: 'Equipment unavailable' },
	{ value: 'enough', label: 'Done enough' }
];
