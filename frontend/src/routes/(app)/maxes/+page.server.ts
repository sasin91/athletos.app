import { fail } from '@sveltejs/kit';

import { problemDetail, unwrap } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

/**
 * The maxes form is built from the catalogue, not from a list of three lifts.
 *
 * 5/3/1 BBB needs four maxes — press, deadlift, bench, squat — and Smolov Jr
 * needs three. Each program declares its own in `required_maxes`, and this page
 * asks for the union of them. A hardcoded `{ squat, bench, deadlift }` would
 * have been program knowledge living in a client, which is precisely what the
 * second client then has to reimplement (D-11).
 */
export const load: PageServerLoad = async ({ locals }) => {
	const [stored, catalogue] = await Promise.all([
		locals.api.GET('/v1/athlete/maxes', {}),
		locals.api.GET('/v1/programs', {})
	]);

	const maxes = unwrap(stored, 'Could not load your maxes.').maxes;
	const programs = unwrap(catalogue, 'Could not load the program catalogue.').programs;

	// One field per lift any program asks for, in catalogue order, plus
	// anything the athlete has already entered that no compiled program wants —
	// dropping those silently would delete them on the next save, since PUT is
	// a full replace.
	const fields = new Map<string, { exercise: string; label: string; wantedBy: string[] }>();

	for (const program of programs) {
		for (const required of program.required_maxes) {
			const field = fields.get(required.exercise) ?? {
				exercise: required.exercise,
				label: required.label,
				wantedBy: []
			};

			field.wantedBy.push(program.name);
			fields.set(required.exercise, field);
		}
	}

	for (const exercise of Object.keys(maxes)) {
		if (!fields.has(exercise)) {
			fields.set(exercise, { exercise, label: exercise, wantedBy: [] });
		}
	}

	return { maxes, fields: [...fields.values()] };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const maxes: Record<string, number> = {};

		// `PUT` replaces the whole document, so a blank field is a max deleted,
		// which is the only way the API offers to clear one.
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
