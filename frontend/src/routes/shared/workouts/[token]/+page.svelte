<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head
	><title>{data.workout.title} · Shared workout · AthletOS</title><meta
		name="referrer"
		content="strict-origin"
	/><meta name="robots" content="noindex,nofollow" /></svelte:head
>

<main class="mx-auto max-w-2xl space-y-4 p-4">
	<a href={resolve('/')} class="text-lg font-bold">AthletOS</a>
	<p class="text-sm opacity-70">Shared workout · version {data.workout.revision}</p>
	<h1 class="text-2xl font-bold">{data.workout.title}</h1>
	{#if data.workout.description}<p class="whitespace-pre-wrap">{data.workout.description}</p>{/if}
	{#if form?.message}<p class="alert alert-error" role="alert">{form.message}</p>{/if}
	{#each data.workout.blocks as block, index (index)}
		<section class="card border">
			<div class="card-body">
				<h2 class="card-title">
					{data.workout.exercises.find((exercise) => exercise.key === block.exercise)?.label ??
						block.exercise}
				</h2>
				<ul>
					{#each block.lifts as lift, liftIndex (liftIndex)}<li>
							{lift.sets} × {lift.reps}{lift.amrap ? '+' : ''} · {lift.weight > 0
								? `${lift.weight} kg`
								: 'Bodyweight'}
						</li>{/each}
				</ul>
			</div>
		</section>
	{/each}
	<p class="text-sm opacity-70">
		Save your own copy to edit it and start training. Your copy is private, and changes by the
		author will not change it.
	</p>
	<form method="POST" use:enhance>
		<button class="btn w-full btn-primary" type="submit"
			>{data.authenticated ? 'Save a copy' : 'Sign in to save a copy'}</button
		>
	</form>
</main>
