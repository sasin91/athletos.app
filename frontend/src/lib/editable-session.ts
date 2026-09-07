import type { LocalSession, LocalSet, Ending } from './session';
import type { components } from './api/schema';

export type CatalogueExercise = components['schemas']['EditableExercise'];
export type EditableSession = components['schemas']['EditableSession'];
export type V2WorkoutSubmission = components['schemas']['V2WorkoutSubmission'];
export type V2WorkoutReceipt = components['schemas']['V2WorkoutReceipt'];

export function commitEditableSession(
	doc: EditableSession,
	options: { id: string; startedAt: string; secondsPerSet?: number | null }
): LocalSession {
	return {
		id: options.id,
		schemaVersion: 2,
		athleteId: doc.athlete_id,
		title: doc.title,
		source: doc.source,
		definitionId: doc.definition_id,
		revision: doc.revision,
		draftId: doc.draft_id,
		// Compatibility fields for local v1 consumers only; never sent on v2 wire.
		enrollmentId: doc.enrollment_id ?? '',
		programKey: doc.program_key ?? '',
		week: doc.week ?? 0,
		day: doc.day ?? 0,
		focus: null,
		startedAt: options.startedAt,
		secondsPerSet: options.secondsPerSet ?? doc.seconds_per_set ?? null,
		exercises: doc.exercises.map((exercise) => ({ ...exercise, cues: [...exercise.cues] })),
		cues: Object.fromEntries(doc.exercises.map((exercise) => [exercise.key, [...exercise.cues]])),
		sets: doc.sets.map((set, position) => ({
			id: set.id,
			blockId: set.block_id,
			originId: doc.source === 'ad_hoc' ? null : set.id,
			position,
			exercise: set.exercise,
			label: set.label,
			prescribedWeight: set.prescribed_weight,
			prescribedReps: set.prescribed_reps,
			committedWeight: set.prescribed_weight,
			committedReps: set.prescribed_reps,
			actualWeight: set.prescribed_weight,
			actualReps: set.prescribed_reps,
			amrap: set.amrap,
			platesPerSide: [...set.plates_per_side],
			plateChange: set.plate_change ?? null,
			status: 'pending',
			loggedAt: null,
			note: null,
			driftReason: null,
			removed: false
		}))
	};
}

export function startEditableSession(session: LocalSession, startedAt: string): LocalSession {
	if (session.startedAt) return session;
	return {
		...session,
		startedAt,
		sets: session.sets.map((set) => ({
			...set,
			committedWeight: set.prescribedWeight,
			committedReps: set.prescribedReps
		}))
	};
}

function editable(session: LocalSession): void {
	if (session.schemaVersion !== 2)
		throw new Error('This session uses the original logger and cannot be restructured.');
}
function invalidate(session: LocalSession): LocalSession {
	return {
		...session,
		sets: session.sets.map((set) => ({ ...set, plateChange: null, platesPerSide: [] }))
	};
}
export function editPendingPrescription(
	session: LocalSession,
	id: string,
	values: { weight?: number; reps?: number; amrap?: boolean }
): LocalSession {
	editable(session);
	if (
		values.weight !== undefined &&
		(!Number.isFinite(values.weight) || values.weight < 0 || values.weight > 1000)
	)
		throw new Error('Weight must be between 0 and 1000 kg.');
	if (
		values.weight !== undefined &&
		Math.abs(values.weight * 100 - Math.round(values.weight * 100)) > 0.000001
	)
		throw new Error('Weight can have at most two decimal places.');
	if (
		values.reps !== undefined &&
		(!Number.isInteger(values.reps) || values.reps < 1 || values.reps > 1000)
	)
		throw new Error('Reps must be a whole number between 1 and 1000.');
	return invalidate({
		...session,
		sets: session.sets.map((set) => {
			if (set.id !== id || set.status !== 'pending' || set.removed) return set;
			if (
				values.weight &&
				session.exercises?.find((exercise) => exercise.key === set.exercise)?.loading ===
					'bodyweight'
			)
				throw new Error('Bodyweight exercises use 0 kg.');
			return {
				...set,
				prescribedWeight: values.weight ?? set.prescribedWeight,
				actualWeight: values.weight ?? set.actualWeight,
				prescribedReps: values.reps ?? set.prescribedReps,
				actualReps: values.reps ?? set.actualReps,
				amrap: values.amrap ?? set.amrap,
				weightInherited: false,
				driftReason: null
			};
		})
	});
}
export function addExercise(session: LocalSession, exerciseKey: string): LocalSession {
	editable(session);
	const exercise = session.exercises?.find((entry) => entry.key === exerciseKey);
	if (!exercise) throw new Error('Choose an exercise from the downloaded catalogue.');
	if (session.sets.length >= 500)
		throw new Error('A workout can contain at most 500 sets, including removed sets.');
	const set: LocalSet = {
		id: crypto.randomUUID(),
		blockId: crypto.randomUUID(),
		originId: null,
		position: Math.max(-1, ...session.sets.map((row) => row.position)) + 1,
		exercise: exercise.key,
		label: exercise.label,
		prescribedWeight: 0,
		prescribedReps: 5,
		committedWeight: 0,
		committedReps: 5,
		actualWeight: 0,
		actualReps: 5,
		amrap: false,
		platesPerSide: [],
		plateChange: null,
		status: 'pending',
		loggedAt: null,
		note: null,
		driftReason: null
	};
	return invalidate({ ...session, sets: [...session.sets, set] });
}
export function addPendingSet(session: LocalSession, blockId: string): LocalSession {
	editable(session);
	if (session.sets.length >= 500)
		throw new Error('A workout can contain at most 500 sets, including removed sets.');
	const index = session.sets.findLastIndex((set) => set.blockId === blockId && !set.removed);
	if (index < 0) return session;
	const reference = session.sets[index];
	const set = {
		...reference,
		id: crypto.randomUUID(),
		originId: null,
		position: Math.max(-1, ...session.sets.map((row) => row.position)) + 1,
		committedWeight: reference.prescribedWeight,
		committedReps: reference.prescribedReps,
		actualWeight: reference.prescribedWeight,
		actualReps: reference.prescribedReps,
		status: 'pending' as const,
		loggedOrder: null,
		removed: false,
		loggedAt: null,
		note: null,
		driftReason: null,
		weightInherited: false
	};
	return invalidate({
		...session,
		sets: [...session.sets.slice(0, index + 1), set, ...session.sets.slice(index + 1)]
	});
}
export function removePendingSet(session: LocalSession, id: string): LocalSession {
	editable(session);
	// Keep tombstones even for additions so legacy clip handles are never reused.
	return invalidate({
		...session,
		sets: session.sets.map((set) =>
			set.id === id && set.status === 'pending'
				? {
						...set,
						removed: true,
						status: 'skipped',
						loggedAt: null,
						loggedOrder: null,
						driftReason: null
					}
				: set
		)
	});
}
export function removePendingBlock(session: LocalSession, blockId: string): LocalSession {
	return session.sets
		.filter((set) => set.blockId === blockId)
		.reduce((current, set) => removePendingSet(current, set.id!), session);
}
export function movePendingSet(session: LocalSession, id: string, direction: -1 | 1): LocalSession {
	editable(session);
	const sets = [...session.sets];
	const index = sets.findIndex((set) => set.id === id && !set.removed && set.status === 'pending');
	if (index < 0) return session;
	let next = index + direction;
	while (sets[next]?.removed) next += direction;
	if (!sets[next] || sets[next].status !== 'pending' || sets[next].blockId !== sets[index].blockId)
		return session;
	[sets[index], sets[next]] = [sets[next], sets[index]];
	return invalidate({ ...session, sets });
}
export function movePendingBlock(
	session: LocalSession,
	blockId: string,
	direction: -1 | 1
): LocalSession {
	editable(session);
	const blocks = [...new Set(session.sets.filter((set) => !set.removed).map((set) => set.blockId))];
	const index = blocks.indexOf(blockId);
	const adjacent = blocks[index + direction];
	if (
		!adjacent ||
		session.sets.some(
			(set) =>
				(set.blockId === blockId || set.blockId === adjacent) &&
				!set.removed &&
				set.status !== 'pending'
		)
	)
		return session;
	[blocks[index], blocks[index + direction]] = [blocks[index + direction], blocks[index]];
	return invalidate({
		...session,
		sets: [...session.sets].sort((a, b) => blocks.indexOf(a.blockId) - blocks.indexOf(b.blockId))
	});
}
export function toEditableSubmission(session: LocalSession, ending: Ending): V2WorkoutSubmission {
	editable(session);
	// Corrections to already logged sets stay editable, but must not strand a
	// session in the queue because a half-entered number was submitted.
	for (const set of session.sets.filter((row) => row.status === 'done')) {
		if (
			!Number.isFinite(set.actualWeight) ||
			set.actualWeight < 0 ||
			set.actualWeight > 1000 ||
			Math.abs(set.actualWeight * 100 - Math.round(set.actualWeight * 100)) > 0.000001
		)
			throw new Error(
				`${set.label}: weight must be between 0 and 1000 kg with at most two decimal places.`
			);
		if (!Number.isInteger(set.actualReps) || set.actualReps < 0 || set.actualReps > 1000)
			throw new Error(`${set.label}: reps must be a whole number between 0 and 1000.`);
		if (
			set.actualWeight !== 0 &&
			session.exercises?.find((exercise) => exercise.key === set.exercise)?.loading === 'bodyweight'
		)
			throw new Error(`${set.label}: bodyweight exercises use 0 kg.`);
	}
	return {
		id: session.id,
		title: session.title ?? 'Workout',
		source: session.source!,
		definition_id: session.definitionId ?? null,
		revision: session.revision ?? null,
		draft_id: session.draftId ?? null,
		started_at: session.startedAt,
		ended_at: ending.endedAt,
		outcome: ending.cutReason ? 'cut_short' : 'completed',
		cut_reason: ending.cutReason,
		notes: ending.notes?.trim() || null,
		sets: session.sets.map((set, position) => ({
			id: set.id!,
			block_id: set.blockId!,
			origin_id: set.originId ?? null,
			position,
			exercise: set.exercise,
			prescribed_weight: set.prescribedWeight,
			prescribed_reps: set.prescribedReps,
			committed_weight: set.committedWeight ?? set.prescribedWeight,
			committed_reps: set.committedReps ?? set.prescribedReps,
			amrap: set.amrap,
			removed: set.removed ?? false,
			actual_weight: set.status === 'done' ? set.actualWeight : null,
			actual_reps: set.status === 'done' ? set.actualReps : null,
			status: set.status,
			logged_at: set.loggedAt,
			logged_order: set.loggedOrder ?? null,
			note: set.note,
			drift_reason: set.status === 'done' ? set.driftReason : null
		}))
	};
}
