<script lang="ts">
	import { resolve } from '$app/paths';
	import TimeSpent from '$lib/TimeSpent.svelte';
	import { formatDate, formatMinutes } from '$lib/time';
	import { DRIFT_REASON_LABELS } from '$lib/session';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const workout = $derived(data.detail.workout);

	/**
	 * Whether a set was logged as something other than what was asked for.
	 *
	 * Marked per row and deliberately not totalled. Drift is a first-class
	 * measurement (D-07, D-13) and belongs in the API alongside the e1RM trend
	 * it is meant to be shown next to — a number computed here would be one the
	 * next client has to compute again.
	 */
	function drifted(set: (typeof data.detail.sets)[number]): boolean {
		if (set.status !== 'done') return true;
		return set.actual_weight !== set.prescribed_weight || set.actual_reps !== set.prescribed_reps;
	}
</script>

<svelte:head><title>{formatDate(workout.started_at)} · AthletOS</title></svelte:head>

<h1 class="text-xl font-bold">{formatDate(workout.started_at)}</h1>
<p class="mb-4 text-sm opacity-70">
	{workout.title}
	{#if workout.source === 'program' && workout.week !== null && workout.day !== null}
		· week {workout.week}, day {workout.day}
	{:else if workout.source === 'saved_workout'}
		· My workouts
	{/if}
	{#if workout.modified}
		· Modified{/if}
	· {formatMinutes(workout.duration_seconds) ?? 'still open'}
	{#if workout.cut_reason}
		· cut short ({workout.cut_reason})
	{/if}
</p>

{#if workout.progression === 'not_applied_stale'}
	<p class="mb-4 alert alert-info">
		This workout was recorded. Your program had already advanced or ended, so this session did not
		advance it again.
	</p>
{/if}

{#if workout.modified}
	<section class="mb-4 rounded-box border border-base-300 p-3 text-sm">
		<h2 class="mb-2 font-semibold">Changes to this session</h2>
		<p>
			{data.detail.changes.added_sets} added · {data.detail.changes.removed_sets} removed
		</p>
		<p class="mt-1 opacity-70">
			{data.detail.changes.source_changed_sets} sets changed from the original workout · {data
				.detail.changes.committed_changed_sets} changed after starting
		</p>
		<p class="mt-1 opacity-70">
			Original work: {data.detail.changes.baseline_load_kg} kg · At start: {data.detail.changes
				.committed_load_kg} kg · Final plan: {data.detail.changes.planned_load_kg} kg
		</p>
		{#if data.detail.changes.added_load_moved_kg > 0}<p class="mt-1 opacity-70">
				Load moved in added work: {data.detail.changes.added_load_moved_kg} kg
			</p>{/if}
	</section>
{/if}

{#if data.detail.notes}
	<p class="mb-4">{data.detail.notes}</p>
{/if}

<ol class="space-y-1">
	{#each data.detail.sets as set (set.id)}
		<li class="flex flex-wrap items-baseline justify-between border p-2 text-sm">
			<span class="font-medium">{set.label}</span>
			<span class:font-bold={drifted(set)}>
				{#if set.removed}
					Removed — originally {set.baseline_weight ?? set.prescribed_weight} kg × {set.baseline_reps ??
						set.prescribed_reps}
				{:else if set.status === 'done'}
					{set.actual_weight} kg × {set.actual_reps}
					{#if drifted(set)}
						<span class="opacity-70">
							(asked {set.prescribed_weight} × {set.prescribed_reps})
						</span>
					{/if}
				{:else}
					{set.status} — asked {set.prescribed_weight} kg × {set.prescribed_reps}
				{/if}
			</span>
			{#if workout.schema_version === 2 && !set.origin_id}
				<p class="mt-1 w-full text-xs opacity-60">Added to this session</p>
			{:else if !set.removed && set.baseline_weight !== null && (set.baseline_weight !== set.prescribed_weight || set.baseline_reps !== set.prescribed_reps)}
				<p class="mt-1 w-full text-xs opacity-60">
					Original workout: {set.baseline_weight} kg × {set.baseline_reps}
				</p>
			{/if}
			{#if set.committed_weight !== set.prescribed_weight || set.committed_reps !== set.prescribed_reps}
				<p class="mt-1 w-full text-xs opacity-60">
					At session start: {set.committed_weight} kg × {set.committed_reps}
				</p>
			{/if}
			{#if set.note}
				<p class="mt-1 w-full text-sm opacity-60">{set.note}</p>
			{/if}
			{#if set.drift_reason}
				<!--
					Shown beside the drift rather than under the note: it is the answer
					to "why is this row bold", not a sentence the athlete wrote.
				-->
				<p class="mt-1 w-full text-xs opacity-60">
					{DRIFT_REASON_LABELS[set.drift_reason]}
				</p>
			{/if}
		</li>
	{/each}
</ol>

<!--
	Absent for every session logged before per-set stamps existed, which is why
	the server omits the field rather than sending an empty one — there is
	nothing to draw and a breakdown of nothing would be a lie about a real
	session (D-10).
-->
{#if data.detail.timing}
	<TimeSpent timing={data.detail.timing} />
{/if}

<a class="btn mt-6 w-full" href={resolve('/history')}>Back</a>
