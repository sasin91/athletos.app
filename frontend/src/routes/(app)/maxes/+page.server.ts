import { fail } from '@sveltejs/kit';

import { problemDetail, unwrap } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

/**
 * Two lists that are deliberately not the same list.
 *
 * The **maxes** are the athlete's, a set they add to and remove from at will.
 * The **readouts** belong to the programs they are running: 5/3/1's training max
 * starts at 90% of the entered number and climbs every cycle, so within months
 * it is a different number entirely, and the athlete has had no way to see it
 * (D-03, D-04). They are loaded side by side because side by side is the only
 * place the gap between them makes sense.
 *
 * This page used to build its form from the union of every program's
 * `required_maxes`, which meant the athlete could only hold a max for a lift some
 * compiled program happened to want. `GET /v1/exercises` is what replaces that:
 * the registry is the set of lifts a max *may* be entered for, and no program has
 * a vote.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const [stored, registry, enrollments] = await Promise.all([
		locals.api.GET('/v1/athlete/maxes', {}),
		locals.api.GET('/v1/exercises', {}),
		locals.api.GET('/v1/enrollments', { params: { query: { status: 'active' } } })
	]);

	return {
		maxes: unwrap(stored, 'Could not load your maxes.').maxes,
		registry: unwrap(registry, 'Could not load the exercise list.').exercises,
		// Active only. A finished block's numbers are history and belong with the
		// history, not next to a form the athlete is editing today.
		active: unwrap(enrollments, 'Could not load your programs.').enrollments
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const maxes: Record<string, number> = {};

		/*
		 * The form is the document.
		 *
		 * Every row on the screen is one field, so a row the athlete removed is
		 * simply not in this `formData` — and `PUT` replacing the whole document
		 * turns that absence into a deletion. There is no separate delete call and
		 * there does not need to be, which is also why a half-applied form is not a
		 * state anybody can end up in.
		 *
		 * A blank field is treated the same way as a removed row: the athlete
		 * cleared the number, and a max of nothing is not a max.
		 */
		for (const [key, value] of form.entries()) {
			const text = String(value).trim();
			if (text === '') continue;

			const weight = Number(text);
			if (!Number.isFinite(weight) || weight <= 0) {
				return fail(422, { message: `${key} needs a weight in kilograms.` });
			}

			maxes[key] = weight;
		}

		const { data, error, response } = await locals.api.PUT('/v1/athlete/maxes', {
			body: { maxes }
		});

		if (!data) {
			return fail(response.status || 502, {
				message: problemDetail(error) ?? 'Could not save your maxes.'
			});
		}

		return { saved: true };
	}
};
