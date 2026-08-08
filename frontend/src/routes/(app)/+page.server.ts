import { fail } from '@sveltejs/kit';

import {
	isAdjustmentValidationFailure,
	serializeAdjustments,
	type RawAdjustment
} from '$lib/adjustments';
import { problemDetail, unwrap } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

/**
 * What the athlete is running, current program first.
 *
 * `GET /v1/enrollments` already orders active enrolments first and already
 * counts progress, so there is nothing to sort or compute here (D-11).
 */
export const load: PageServerLoad = async ({ locals }) => {
	const [enrollmentResult, programResult] = await Promise.all([
		locals.api.GET('/v1/enrollments', {}),
		locals.api.GET('/v1/programs', {})
	]);
	const enrollments = unwrap(enrollmentResult, 'Could not load your programs.');
	const programs = new Map(
		(programResult.data?.programs ?? []).map((program) => [program.key, program])
	);

	const adjustmentResults = await Promise.all(
		enrollments.enrollments.map((enrollment) =>
			locals.api.GET('/v1/enrollments/{id}/exercise-adjustments', {
				params: { path: { id: enrollment.id } }
			})
		)
	);

	return {
		enrollments: enrollments.enrollments.map((enrollment, index) => ({
			...enrollment,
			weighted_exercises: programs.get(enrollment.program_key)?.weighted_exercises ?? null,
			adjustments: adjustmentResults[index].data?.adjustments ?? null
		}))
	};
};

export const actions: Actions = {
	adjustments: async ({ request, locals }) => {
		const form = await request.formData();
		const enrollmentId = String(form.get('enrollment_id') ?? '').trim();
		const rows: RawAdjustment[] = [];

		for (const [key, value] of form.entries()) {
			if (!key.startsWith('adjustment:')) continue;
			rows.push({ exercise: key.slice('adjustment:'.length), raw: String(value) });
		}

		const values = Object.fromEntries(rows.map(({ exercise, raw }) => [exercise, raw]));
		if (enrollmentId === '') {
			return fail(422, {
				enrollmentId,
				values,
				errors: {},
				message: 'Could not identify the program to update.'
			});
		}

		const serialized = serializeAdjustments(rows);
		if (isAdjustmentValidationFailure(serialized)) {
			return fail(422, {
				enrollmentId,
				values: serialized.values,
				errors: serialized.errors,
				message: 'Check the highlighted adjustments.'
			});
		}

		const { data, error, response } = await locals.api.PUT(
			'/v1/enrollments/{id}/exercise-adjustments',
			{
				params: { path: { id: enrollmentId } },
				body: { adjustments: serialized }
			}
		);

		if (!data) {
			return fail(response.status || 502, {
				enrollmentId,
				values,
				errors: {},
				message: problemDetail(error) ?? 'Could not save exercise adjustments.'
			});
		}

		return { saved: true, enrollmentId };
	}
};
