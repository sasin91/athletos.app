<script lang="ts">
	import { resolve } from '$app/paths';
	import { adjustmentRows, historicalAdjustmentRows } from '$lib/adjustments';
	import { loadActiveSession } from '$lib/storage';
	import type { LocalSession } from '$lib/session';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type AdjustmentActionState = {
		enrollmentId: string;
		values?: Record<string, string>;
		errors?: Record<string, string>;
		message?: string;
		saved?: boolean;
	};

	/**
	 * A session already committed on this device, if there is one.
	 *
	 * Read from IndexedDB rather than from the server, because the server does
	 * not know: committing is a local act and `started_at` only reaches Rust
	 * with the finished submit (D-08, D-09).
	 */
	let active = $state<LocalSession | null>(null);

	$effect(() => {
		void loadActiveSession().then((session) => (active = session));
	});

	const activeEnrollments = $derived(data.enrollments.filter((e) => e.status === 'active'));
	const pastEnrollments = $derived(data.enrollments.filter((e) => e.status !== 'active'));
	let largeInputs = $state<Record<string, boolean>>({});

	function actionState(enrollmentId: string): AdjustmentActionState | null {
		if (!form || typeof form !== 'object' || !('enrollmentId' in form)) return null;

		const state = form as AdjustmentActionState;
		return state.enrollmentId === enrollmentId ? state : null;
	}

	function rawValue(enrollmentId: string, exercise: string, stored: number): string {
		return actionState(enrollmentId)?.values?.[exercise] ?? String(stored);
	}

	function inputKey(enrollmentId: string, exercise: string): string {
		return `${enrollmentId}:${exercise}`;
	}

	function inputId(enrollmentId: string, exercise: string): string {
		return `adjustment-${enrollmentId}-${exercise}`;
	}

	function isLarge(enrollmentId: string, exercise: string, raw: string): boolean {
		const changed = largeInputs[inputKey(enrollmentId, exercise)];
		if (changed !== undefined) return changed;

		const value = Number(raw);
		return Number.isFinite(value) && Math.abs(value) > 30;
	}

	function updateWarning(event: Event, enrollmentId: string, exercise: string) {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		largeInputs[inputKey(enrollmentId, exercise)] = Number.isFinite(value) && Math.abs(value) > 30;
	}

	function resetToZero(event: MouseEvent, enrollmentId: string, exercise: string) {
		const button = event.currentTarget as HTMLButtonElement;
		const input = button.form?.elements.namedItem(`adjustment:${exercise}`);
		if (!(input instanceof HTMLInputElement)) return;

		input.value = '0';
		largeInputs[inputKey(enrollmentId, exercise)] = false;
		input.focus();
	}
</script>

<svelte:head><title>Train · AthletOS</title></svelte:head>

<h1 class="mb-3 text-xl font-bold">Train</h1>

{#if active}
	<a href={resolve('/session')} class="btn mb-4 w-full btn-lg btn-primary">
		Resume session — week {active.week}, day {active.day}
	</a>
{/if}

{#if activeEnrollments.length === 0}
	<div class="card border">
		<div class="card-body">
			<p>You are not running a program.</p>
			<a class="btn btn-primary" href={resolve('/programs')}>Browse programs</a>
		</div>
	</div>
{/if}

<ul class="space-y-3">
	{#each activeEnrollments as enrollment (enrollment.id)}
		<li class="card border">
			<div class="card-body">
				<h2 class="card-title">{enrollment.program_name}</h2>
				<p>
					{#if enrollment.progress.total === null}
						{enrollment.progress.completed} sessions logged
					{:else}
						Session {enrollment.progress.completed + 1} of {enrollment.progress.total}
					{/if}
				</p>
				<a class="btn btn-primary" href={resolve(`/peek/${enrollment.id}`)}>
					What am I doing today?
				</a>

				<details class="mt-1 border-t border-base-300 pt-3">
					<summary class="cursor-pointer font-medium">Exercise adjustments</summary>

					{#if enrollment.weighted_exercises === null || enrollment.adjustments === null}
						<p class="mt-3 text-sm opacity-70">Adjustments unavailable.</p>
					{:else}
						{@const rows = adjustmentRows(enrollment.weighted_exercises, enrollment.adjustments)}
						{@const state = actionState(enrollment.id)}

						<form method="POST" action="?/adjustments" class="mt-3 space-y-3">
							<input type="hidden" name="enrollment_id" value={enrollment.id} />

							{#if state?.message}
								<p class="alert py-2 text-sm alert-error" role="alert">{state.message}</p>
							{:else if state?.saved}
								<p class="alert py-2 text-sm alert-success" role="status">Saved.</p>
							{/if}

							{#each rows as row (row.exercise)}
								{@const raw = rawValue(enrollment.id, row.exercise, row.value)}
								{@const error = state?.errors?.[row.exercise]}
								{@const id = inputId(enrollment.id, row.exercise)}
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
												oninput={(event) => updateWarning(event, enrollment.id, row.exercise)}
												aria-invalid={error ? 'true' : undefined}
												aria-describedby={error ? `${id}-unit ${id}-error` : `${id}-unit`}
												class="input w-20 border-0 bg-transparent text-right tabular focus:outline-none"
											/>
											<span id={`${id}-unit`} class="pr-3 text-sm opacity-60">%</span>
										</span>
										<button
											type="button"
											class="btn btn-ghost btn-sm"
											onclick={(event) => resetToZero(event, enrollment.id, row.exercise)}
											aria-label={`Reset ${row.label} adjustment`}
										>
											Reset
										</button>
									</div>

									{#if error}
										<p id={`${id}-error`} class="mt-1 text-xs text-error">{error}</p>
									{/if}
									{#if isLarge(enrollment.id, row.exercise, raw)}
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
			</div>
		</li>
	{/each}
</ul>

{#if pastEnrollments.length > 0}
	<h2 class="mt-6 mb-2 font-bold">Finished</h2>
	<ul class="space-y-2">
		{#each pastEnrollments as enrollment (enrollment.id)}
			<li class="border p-3 text-sm">
				<p>
					{enrollment.program_name} — {enrollment.status},
					{enrollment.progress.completed} sessions
				</p>

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
			</li>
		{/each}
	</ul>
{/if}
