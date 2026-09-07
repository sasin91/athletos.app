<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { commitEditableSession } from '$lib/session';
	import { loadActiveSession, saveActiveSession, setActiveAthlete } from '$lib/storage';
	import { uuidv7 } from '$lib/uuid';
	import type { components } from '$lib/api/schema';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let hasActive = $state(false);
	let ready = $state(false);
	let preparing = $state(false);
	let message = $state('');
	$effect(() => {
		void setActiveAthlete(data.athleteId, data.enrollmentIds)
			.then(loadActiveSession)
			.then((session) => {
				hasActive = session !== null;
				ready = true;
			})
			.catch(() => {
				message = 'Could not read training saved on this device.';
			});
	});
	async function buildSession() {
		if (!ready || preparing || hasActive) return;
		preparing = true;
		try {
			const response = await fetch('/api/blank-session');
			if (!response.ok)
				throw new Error('Could not prepare a session. Check your connection and try again.');
			const document = (await response.json()) as components['schemas']['EditableSession'];
			await saveActiveSession(commitEditableSession(document, { id: uuidv7(), startedAt: '' }));
			await goto(resolve('/session'));
		} catch (error) {
			message = error instanceof Error ? error.message : 'Could not prepare this session.';
		} finally {
			preparing = false;
		}
	}
</script>

<svelte:head><title>My workouts · AthletOS</title></svelte:head>

<div class="mb-4 flex items-center justify-between gap-3">
	<h1 class="text-xl font-bold">My workouts</h1>
	<a class="btn btn-primary" href={resolve('/workouts/new')}>Create workout</a>
</div>
{#if message}<p class="mb-3 alert alert-error" role="alert">{message}</p>{/if}
{#if hasActive}
	<a class="btn mb-3 w-full btn-primary" href={resolve('/session')}>Resume session</a>
{:else}
	<button
		class="btn mb-3 w-full"
		type="button"
		disabled={!ready || preparing}
		onclick={buildSession}>Build a session</button
	>
	<p class="mb-4 text-sm opacity-70">Start from scratch without saving a reusable workout.</p>
{/if}
<p class="mb-4 text-sm opacity-70">
	Your own workouts, ready to start and adapt each time you train.
</p>
{#if data.workouts.length === 0}
	<div class="card border">
		<div class="card-body">
			<h2 class="card-title">Build your first workout</h2>
			<p>Choose exercises and sets, save it here, and share it when you want.</p>
		</div>
	</div>
{:else}
	<ul class="space-y-3">
		{#each data.workouts as workout (workout.id)}
			<li>
				<a class="card border hover:bg-base-200" href={resolve(`/workouts/${workout.id}`)}
					><div class="card-body">
						<h2 class="card-title">{workout.title}</h2>
						{#if workout.description}<p class="line-clamp-2 text-sm opacity-70">
								{workout.description}
							</p>{/if}
						<p class="text-sm">
							{workout.blocks.length}
							{workout.blocks.length === 1 ? 'exercise' : 'exercises'}
						</p>
					</div></a
				>
			</li>
		{/each}
	</ul>
{/if}
