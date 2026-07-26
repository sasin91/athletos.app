<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDate, formatMinutes } from '$lib/time';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const next = $derived(data.history.offset + data.history.limit);
	const hasMore = $derived(next < data.history.total);
</script>

<svelte:head><title>History · AthletOS</title></svelte:head>

<h1 class="mb-3 text-xl font-bold">History</h1>

{#if data.history.workouts.length === 0}
	<p>Nothing logged yet.</p>
{/if}

<ul class="space-y-2">
	{#each data.history.workouts as workout (workout.id)}
		<li class="card border">
			<a class="card-body p-3" href={resolve(`/history/${workout.id}`)}>
				<div class="flex justify-between">
					<span class="font-medium">{formatDate(workout.started_at)}</span>
					<span>{formatMinutes(workout.duration_seconds) ?? '—'}</span>
				</div>
				<div class="text-sm opacity-70">
					{workout.program_name} · week {workout.week}, day {workout.day}
					{#if workout.cut_reason}
						· cut short ({workout.cut_reason})
					{:else if workout.outcome === 'auto_closed'}
						· auto-closed
					{/if}
				</div>
			</a>
		</li>
	{/each}
</ul>

{#if hasMore}
	<a class="btn mt-3 w-full" href="{resolve('/history')}?offset={next}">Load more</a>
{/if}

{#if data.history.offset > 0}
	<a class="btn mt-2 w-full btn-ghost" href={resolve('/history')}>Back to the top</a>
{/if}
