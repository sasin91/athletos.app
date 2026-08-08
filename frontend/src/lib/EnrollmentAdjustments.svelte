<script lang="ts">
	import {
		adjustmentRows,
		historicalAdjustmentRows,
		type WeightedExercise
	} from '$lib/adjustments';

	type Enrollment = {
		id: string;
		status: 'active' | 'finished' | 'abandoned';
		weighted_exercises: WeightedExercise[] | null;
		adjustments: Record<string, number> | null;
	};

	type AdjustmentActionState = {
		enrollmentId: string;
		values?: Record<string, string>;
		errors?: Record<string, string>;
		message?: string;
		saved?: boolean;
	};

	let { enrollment, form }: { enrollment: Enrollment; form: unknown } = $props();
	let largeInputs = $state<Record<string, boolean>>({});

	function actionState(): AdjustmentActionState | null {
		if (!form || typeof form !== 'object' || !('enrollmentId' in form)) return null;

		const state = form as AdjustmentActionState;
		return state.enrollmentId === enrollment.id ? state : null;
	}

	function rawValue(exercise: string, stored: number): string {
		return actionState()?.values?.[exercise] ?? String(stored);
	}

	function inputKey(exercise: string): string {
		return `${enrollment.id}:${exercise}`;
	}

	function inputId(exercise: string): string {
		return `adjustment-${enrollment.id}-${exercise}`;
	}

	function isLarge(exercise: string, raw: string): boolean {
		const changed = largeInputs[inputKey(exercise)];
		if (changed !== undefined) return changed;

		const value = Number(raw);
		return Number.isFinite(value) && Math.abs(value) > 30;
	}

	function updateWarning(event: Event, exercise: string) {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		largeInputs[inputKey(exercise)] = Number.isFinite(value) && Math.abs(value) > 30;
	}

	function resetToZero(event: MouseEvent, exercise: string) {
		const button = event.currentTarget as HTMLButtonElement;
		const input = button.form?.elements.namedItem(`adjustment:${exercise}`);
		if (!(input instanceof HTMLInputElement)) return;

		input.value = '0';
		largeInputs[inputKey(exercise)] = false;
		input.focus();
	}
</script>

{#if enrollment.status === 'active'}
	<details class="mt-1 border-t border-base-300 pt-3">
		<summary class="cursor-pointer font-medium">Exercise adjustments</summary>

		{#if enrollment.weighted_exercises === null || enrollment.adjustments === null}
			<p class="mt-3 text-sm opacity-70">Adjustments unavailable.</p>
		{:else}
			{@const rows = adjustmentRows(enrollment.weighted_exercises, enrollment.adjustments)}
			{@const state = actionState()}

			<form method="POST" action="?/adjustments" class="mt-3 space-y-3">
				<input type="hidden" name="enrollment_id" value={enrollment.id} />

				{#if state?.message}
					<p class="alert py-2 text-sm alert-error" role="alert">{state.message}</p>
				{:else if state?.saved}
					<p class="alert py-2 text-sm alert-success" role="status">Saved.</p>
				{/if}

				{#each rows as row (row.exercise)}
					{@const raw = rawValue(row.exercise, row.value)}
					{@const error = state?.errors?.[row.exercise]}
					{@const id = inputId(row.exercise)}
					<div>
						<label class="mb-1 block text-sm font-medium" for={id}>
							{row.label}
						</label>
						<div class="flex items-center gap-2">
							<span
								class="flex items-center rounded-field border border-base-300 bg-base-200 focus-within:border-base-content"
							>
								<input
									{id}
									name={`adjustment:${row.exercise}`}
									type="number"
									inputmode="numeric"
									step="1"
									min="-50"
									max="50"
									value={raw}
									oninput={(event) => updateWarning(event, row.exercise)}
									aria-invalid={error ? 'true' : undefined}
									aria-describedby={error ? `${id}-unit ${id}-error` : `${id}-unit`}
									class="input w-20 border-0 bg-transparent text-right tabular focus:outline-none"
								/>
								<span id={`${id}-unit`} class="pr-3 text-sm opacity-60">%</span>
							</span>
							<button
								type="button"
								class="btn btn-ghost btn-sm"
								onclick={(event) => resetToZero(event, row.exercise)}
								aria-label={`Reset ${row.label} adjustment`}
							>
								Reset
							</button>
						</div>

						{#if error}
							<p id={`${id}-error`} class="mt-1 text-xs text-error">{error}</p>
						{/if}
						{#if isLarge(row.exercise, raw)}
							<p class="mt-1 text-xs text-warning">
								A large adjustment may mean your entered max needs updating.
							</p>
						{/if}
					</div>
				{/each}

				<p class="text-xs opacity-70">Changes affect the next uncommitted session.</p>
				<button class="btn w-full btn-primary" type="submit">Save adjustments</button>
			</form>
		{/if}
	</details>
{:else}
	<details class="mt-2 border-t border-base-300 pt-2">
		<summary class="cursor-pointer font-medium">Exercise adjustments</summary>

		{#if enrollment.adjustments === null}
			<p class="mt-2 opacity-70">Adjustments unavailable.</p>
		{:else}
			{@const changed = historicalAdjustmentRows(
				enrollment.weighted_exercises,
				enrollment.adjustments
			).filter((row) => row.value !== 0)}
			{#if changed.length === 0}
				<p class="mt-2 opacity-70">No exercise adjustments.</p>
			{:else}
				<dl class="mt-2 space-y-1">
					{#each changed as row (row.exercise)}
						<div class="flex justify-between gap-3">
							<dt>{row.label}</dt>
							<dd class="tabular">{row.value > 0 ? '+' : ''}{row.value}%</dd>
						</div>
					{/each}
				</dl>
			{/if}
		{/if}
	</details>
{/if}
