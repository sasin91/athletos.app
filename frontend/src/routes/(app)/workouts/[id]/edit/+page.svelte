<script lang="ts">
	import { resolve } from '$app/paths';
	import WorkoutEditor from '$lib/WorkoutEditor.svelte';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	// Keep the version the athlete actually opened after action invalidation.
	// svelte-ignore state_referenced_locally
	const openedRevision = form?.expectedRevision ?? data.workout.revision;
</script>

<svelte:head><title>Edit {data.workout.title} · AthletOS</title></svelte:head>
<a class="link text-sm" href={resolve(`/workouts/${data.workout.id}`)}>Back to workout</a>
<h1 class="mt-3 mb-2 text-xl font-bold">Edit saved workout</h1>
<p class="mb-4 text-sm opacity-70">
	Save a new version for future sessions. Sessions already started keep their original workout.
</p>
<WorkoutEditor
	initial={form?.draft ?? data.workout}
	exercises={data.exercises}
	expectedRevision={openedRevision}
	message={form?.message}
	action={form?.conflict ? '?/copy' : '?/save'}
	submitLabel={form?.conflict ? 'Save as new workout' : 'Save workout'}
/>
