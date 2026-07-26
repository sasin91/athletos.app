<script lang="ts">
	import { resolve } from '$app/paths';
	import { loadActiveSession } from '$lib/storage';
	import type { LocalSession } from '$lib/session';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
			</div>
		</li>
	{/each}
</ul>

{#if pastEnrollments.length > 0}
	<h2 class="mt-6 mb-2 font-bold">Finished</h2>
	<ul class="space-y-2">
		{#each pastEnrollments as enrollment (enrollment.id)}
			<li class="border p-2 text-sm">
				{enrollment.program_name} — {enrollment.status},
				{enrollment.progress.completed} sessions
			</li>
		{/each}
	</ul>
{/if}
