<script lang="ts">
	import { enhance } from '$app/forms';
	import { numberFromText } from '$lib/session';
	import type { WorkoutContent, WorkoutExercise } from '$lib/workout-definition';

	let {
		initial,
		exercises,
		expectedRevision,
		message,
		onSaved,
		action = '',
		submitLabel = 'Save workout'
	}: {
		initial: WorkoutContent;
		exercises: WorkoutExercise[];
		expectedRevision?: number;
		message?: string;
		onSaved?: () => Promise<void>;
		action?: string;
		submitLabel?: string;
	} = $props();

	// Capture the initial draft once. An unsuccessful enhanced save deliberately
	// leaves these fields intact, including when another device saved a revision.
	// svelte-ignore state_referenced_locally
	let draft = $state<WorkoutContent>(structuredClone($state.snapshot(initial)));
	let selectedExercise = $state('');
	let saving = $state(false);

	function addExercise() {
		if (!selectedExercise) return;
		draft.blocks.push({
			exercise: selectedExercise,
			lifts: [{ sets: 3, reps: 8, weight: 0, amrap: false }]
		});
		selectedExercise = '';
	}

	function moveExercise(index: number, direction: -1 | 1) {
		const destination = index + direction;
		if (destination < 0 || destination >= draft.blocks.length) return;
		const [block] = draft.blocks.splice(index, 1);
		draft.blocks.splice(destination, 0, block);
	}
</script>

<form
	method="POST"
	{action}
	class="space-y-5"
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			try {
				if (result.type === 'redirect') await onSaved?.();
				await update({ reset: false });
			} finally {
				saving = false;
			}
		};
	}}
>
	{#if message}<p class="alert alert-error" role="alert">{message}</p>{/if}
	<input type="hidden" name="content" value={JSON.stringify(draft)} />
	{#if expectedRevision !== undefined}
		<input type="hidden" name="expected_revision" value={expectedRevision} />
	{/if}
	<label class="block">
		<span class="label">Workout name</span>
		<input class="input w-full" bind:value={draft.title} maxlength="120" required />
	</label>
	<label class="block">
		<span class="label">Description (optional)</span>
		<textarea class="textarea w-full" bind:value={draft.description} maxlength="2000"></textarea>
	</label>
	{#each draft.blocks as block, blockIndex (block)}
		<fieldset class="rounded-box border border-base-300 p-3">
			<legend class="px-1 font-semibold">
				{blockIndex + 1}. {exercises.find((exercise) => exercise.key === block.exercise)?.label ??
					block.exercise}
			</legend>
			<div class="mb-3 flex flex-wrap gap-2">
				<button
					class="btn btn-sm"
					type="button"
					disabled={blockIndex === 0}
					onclick={() => moveExercise(blockIndex, -1)}
					aria-label="Move exercise up">↑ Up</button
				>
				<button
					class="btn btn-sm"
					type="button"
					disabled={blockIndex === draft.blocks.length - 1}
					onclick={() => moveExercise(blockIndex, 1)}
					aria-label="Move exercise down">↓ Down</button
				>
				<button
					class="btn btn-ghost btn-sm"
					type="button"
					onclick={() => draft.blocks.splice(blockIndex, 1)}>Remove exercise</button
				>
			</div>
			{#each block.lifts as lift, liftIndex (lift)}
				<div class="mb-3 rounded border border-base-300 p-2">
					<div class="grid grid-cols-3 gap-2">
						<label
							><span class="label text-xs">Sets</span><input
								aria-label={`Sets for group ${liftIndex + 1}`}
								class="input w-full"
								type="number"
								min="1"
								max="500"
								step="1"
								required
								bind:value={lift.sets}
							/></label
						>
						<label
							><span class="label text-xs">Reps</span><input
								aria-label={`Reps for group ${liftIndex + 1}`}
								class="input w-full"
								type="number"
								min="1"
								max="1000"
								step="1"
								required
								bind:value={lift.reps}
							/></label
						>
						<label
							><span class="label text-xs">Weight (kg)</span><input
								aria-label={`Weight for group ${liftIndex + 1}`}
								class="input w-full"
								type="text"
								inputmode="decimal"
								required
								value={lift.weight}
								oninput={(event) => {
									const field = event.currentTarget;
									const weight = numberFromText(field.value);
									if (weight === undefined || weight < 0 || weight > 1000) {
										field.setCustomValidity('Enter a weight between 0 and 1000 kg.');
									} else {
										field.setCustomValidity('');
										lift.weight = weight;
									}
								}}
							/></label
						>
					</div>
					<div class="mt-2 flex items-center justify-between gap-2">
						<label class="flex items-center gap-2 text-sm"
							><input
								class="checkbox checkbox-sm"
								type="checkbox"
								bind:checked={lift.amrap}
							/>AMRAP</label
						>
						<button
							class="btn btn-ghost btn-sm"
							type="button"
							disabled={block.lifts.length === 1}
							onclick={() => block.lifts.splice(liftIndex, 1)}>Remove group</button
						>
					</div>
				</div>
			{/each}
			<button
				class="btn btn-sm"
				type="button"
				onclick={() => block.lifts.push({ sets: 1, reps: 8, weight: 0, amrap: false })}
				>Add set group</button
			>
		</fieldset>
	{/each}
	<div class="flex items-end gap-2">
		<label class="min-w-0 grow"
			><span class="label">Exercise</span><select
				class="select w-full"
				bind:value={selectedExercise}
				><option value="">Choose an exercise</option
				>{#each exercises as exercise (exercise.key)}<option value={exercise.key}
						>{exercise.label}</option
					>{/each}</select
			></label
		>
		<button class="btn" type="button" onclick={addExercise} disabled={!selectedExercise}
			>Add exercise</button
		>
	</div>
	<p class="text-sm opacity-70">
		Use 0 kg for bodyweight. Loads are checked against the exercise's equipment when you start.
	</p>
	<button
		class="btn w-full btn-primary"
		type="submit"
		disabled={saving || draft.blocks.length === 0}>{saving ? 'Saving…' : submitLabel}</button
	>
</form>
