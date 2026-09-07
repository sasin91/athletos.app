<script lang="ts">
	import WorkoutEditor from '$lib/WorkoutEditor.svelte';
	import { clearWorkoutDraft, loadWorkoutDraft, setActiveAthlete } from '$lib/storage';
	import type { WorkoutContent } from '$lib/workout-definition';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let initial = $state<WorkoutContent | null>(null);
	let storageMessage = $state('');
	$effect(() => {
		void setActiveAthlete(data.athleteId, data.enrollmentIds)
			.then(loadWorkoutDraft)
			.then((draft) => {
				initial = form?.draft ?? draft ?? { title: '', description: '', blocks: [] };
			})
			.catch(() => {
				storageMessage = 'Could not restore a workout draft from this device.';
				initial = form?.draft ?? { title: '', description: '', blocks: [] };
			});
	});
</script>

<svelte:head><title>Create workout · AthletOS</title></svelte:head>
<h1 class="mb-2 text-xl font-bold">Create workout</h1>
<p class="mb-4 text-sm opacity-70">Only you can see this workout unless you choose to share it.</p>
{#if storageMessage}<p class="mb-3 alert" role="status">{storageMessage}</p>{/if}
{#if initial}
	<WorkoutEditor
		{initial}
		exercises={data.exercises}
		message={form?.message}
		onSaved={async () => {
			await clearWorkoutDraft().catch(() => undefined);
		}}
	/>
{:else}<p role="status">Loading your workout editor…</p>{/if}
