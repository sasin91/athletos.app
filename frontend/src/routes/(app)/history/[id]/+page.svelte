<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDate, formatMinutes } from '$lib/time';
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
	{workout.program_name} · week {workout.week}, day {workout.day}
	· {formatMinutes(workout.duration_seconds) ?? 'still open'}
	{#if workout.cut_reason}
		· cut short ({workout.cut_reason})
	{/if}
</p>

{#if data.detail.notes}
	<p class="mb-4">{data.detail.notes}</p>
{/if}

<ol class="space-y-1">
	{#each data.detail.sets as set (set.position)}
		<li class="flex items-baseline justify-between border p-2 text-sm">
			<span class="font-medium">{set.label}</span>
			<span class:font-bold={drifted(set)}>
				{#if set.status === 'done'}
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
		</li>
	{/each}
</ol>

<a class="btn mt-4 w-full" href={resolve('/history')}>Back</a>
