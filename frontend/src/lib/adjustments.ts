export type WeightedExercise = {
	exercise: string;
	label: string;
};

export type AdjustmentRow = WeightedExercise & {
	value: number;
};

export type RawAdjustment = {
	exercise: string;
	raw: string;
};

export type AdjustmentValidationFailure = {
	ok: false;
	values: Record<string, string>;
	errors: Record<string, string>;
};

export type SerializedAdjustments = Record<string, number> | AdjustmentValidationFailure;

const INVALID_PERCENTAGE = 'Use a whole percentage from -50 to 50.';

/** Join the program-owned exercise list to an enrollment's sparse adjustment document. */
export function adjustmentRows(
	weighted: readonly WeightedExercise[],
	adjustments: Readonly<Record<string, number>>
): AdjustmentRow[] {
	return weighted.map(({ exercise, label }) => ({
		exercise,
		label,
		value: adjustments[exercise] ?? 0
	}));
}

/**
 * Convert the form's text fields into the API's sparse, full-replacement document.
 *
 * Successful validation deliberately returns the document itself. Invalid input
 * returns every raw value alongside field errors so a failed action can put the
 * athlete's working copy back on screen unchanged.
 */
export function serializeAdjustments(rows: readonly RawAdjustment[]): SerializedAdjustments {
	const values = Object.fromEntries(rows.map(({ exercise, raw }) => [exercise, raw]));
	const adjustments: Array<[string, number]> = [];
	const errors: Array<[string, string]> = [];

	for (const { exercise, raw } of rows) {
		const text = raw.trim();
		if (text === '') continue;

		if (!/^[+-]?\d+$/.test(text)) {
			errors.push([exercise, INVALID_PERCENTAGE]);
			continue;
		}

		const value = Number(text);
		if (!Number.isSafeInteger(value) || value < -50 || value > 50) {
			errors.push([exercise, INVALID_PERCENTAGE]);
			continue;
		}

		if (value !== 0) adjustments.push([exercise, value]);
	}

	if (errors.length > 0) {
		return {
			ok: false,
			values,
			errors: Object.fromEntries(errors)
		};
	}

	return Object.fromEntries(adjustments);
}

export function isAdjustmentValidationFailure(
	result: SerializedAdjustments
): result is AdjustmentValidationFailure {
	return 'ok' in result && result.ok === false;
}
