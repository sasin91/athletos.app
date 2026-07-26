<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';

	import { commitSession } from '$lib/session';
	import { loadActiveSession, saveActiveSession } from '$lib/storage';
	import { uuidv7 } from '$lib/uuid';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let committing = $state(false);
	let alreadyCommitted = $state(false);

	$effect(() => {
		void loadActiveSession().then((session) => {
			alreadyCommitted = session !== null;
		});
	});

	/**
	 * Commit (D-08, D-09).
	 *
	 * The only write is local: every prescribed set is materialised with
	 * `status: 'pending'`, `started_at` is stamped from this phone's clock, and
	 * the workout id is minted here so that the submit — whenever it manages to
	 * happen — is idempotent. Nothing is sent. From here the athlete can lose
	 * signal entirely and still log the whole session.
	 */
	async function commit() {
		if (!data.session || committing) return;
		committing = true;

		try {
			await saveActiveSession(
				commitSession(data.session, {
					id: uuidv7(),
					startedAt: new Date().toISOString(),
					secondsPerSet: data.secondsPerSet
				})
			);

			await goto(resolve('/session'));
		} finally {
			committing = false;
		}
	}
</script>

<svelte:head><title>Next session · AthletOS</title></svelte:head>

{#if data.finished}
	<div class="alert alert-info">{data.finished}</div>
	<a class="btn mt-3 w-full" href={resolve('/programs')}>Browse programs</a>
{:else if data.session}
	{@const session = data.session}

	<h1 class="text-xl font-bold">Week {session.week}, day {session.day}</h1>
	<p class="mb-1 text-sm opacity-70">
		{#if session.progress.total === null}
			{session.progress.completed} sessions logged
		{:else}
			Session {session.progress.completed + 1} of {session.progress.total}
		{/if}
		· {session.prescribed_sets.length} sets
	</p>
	<p class="mb-4 text-xs opacity-70">
		Looking at this costs nothing. The clock starts when you commit.
	</p>

	{#if alreadyCommitted}
		<div class="mb-3 alert alert-warning">
			<span>You already have a session committed on this device.</span>
		</div>
		<a class="btn mb-4 w-full btn-lg btn-primary" href={resolve('/session')}>Go to it</a>
	{:else}
		<button
			class="btn mb-4 w-full btn-lg btn-primary"
			type="button"
			onclick={commit}
			disabled={committing}
		>
			Commit and start
		</button>
	{/if}

	{#each session.blocks as block (block.exercise)}
		<section class="card mb-3 border">
			<div class="card-body">
				<h2 class="card-title">{block.label}</h2>

				<ul>
					{#each block.lifts as lift, index (index)}
						<li class="text-lg">
							{lift.sets} × {lift.reps}{lift.amrap ? '+' : ''}
							{#if lift.weight > 0}
								@ {lift.weight} kg
							{:else}
								(bodyweight)
							{/if}
							{#if lift.plates_per_side.length > 0}
								<span class="block text-sm opacity-70">
									bar + {lift.plates_per_side.join(', ')} per side
								</span>
							{/if}
						</li>
					{/each}
				</ul>

				{#if block.cues.length > 0}
					<ul class="mt-2 list-disc pl-5 text-sm opacity-70">
						{#each block.cues as cue (cue)}
							<li>{cue}</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	{/each}
{/if}
