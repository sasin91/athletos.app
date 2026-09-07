<script lang="ts">
	import type { LocalSession } from './session';
	import { numberFromText } from './session';
	import {
		addExercise,
		addPendingSet,
		editPendingPrescription,
		movePendingBlock,
		movePendingSet,
		removePendingBlock,
		removePendingSet
	} from './editable-session';
	let {
		session,
		onchange
	}: {
		session: LocalSession;
		onchange: (change: (session: LocalSession) => LocalSession) => void;
	} = $props();
	let selected = $state('');
	let error = $state('');
	const blocks = $derived([
		...new Set(session.sets.filter((set) => !set.removed).map((set) => set.blockId!))
	]);
	function change(fn: (current: LocalSession) => LocalSession) {
		error = '';
		onchange((current) => {
			try {
				return fn(current);
			} catch (e) {
				error = e instanceof Error ? e.message : 'Could not edit this workout.';
				return current;
			}
		});
	}
</script>

<section class="my-3 space-y-3 rounded-box border border-base-300 p-3" aria-label="Edit workout">
	<label class="block text-sm"
		>Workout name
		<input
			class="input mt-1 w-full"
			value={session.title ?? 'Workout'}
			maxlength="200"
			required
			onchange={(event) => {
				const title = event.currentTarget.value.trim();
				if (title) change((s) => ({ ...s, title }));
			}}
		/>
	</label>
	<p class="text-sm opacity-70">Changes apply to this session. Logged sets stay in your record.</p>
	{#if error}<p class="text-error" role="alert">{error}</p>{/if}
	{#each blocks as blockId (blockId)}
		{@const sets = session.sets.filter((set) => set.blockId === blockId && !set.removed)}
		<div class="space-y-2 rounded-box bg-base-200 p-3">
			<div class="flex flex-wrap items-center gap-2">
				<h2 class="mr-auto font-semibold">{sets[0].label}</h2>
				<button
					class="btn btn-xs"
					onclick={() => change((s) => movePendingBlock(s, blockId, -1))}
					aria-label={`Move ${sets[0].label} up`}>↑</button
				>
				<button
					class="btn btn-xs"
					onclick={() => change((s) => movePendingBlock(s, blockId, 1))}
					aria-label={`Move ${sets[0].label} down`}>↓</button
				>
				<button class="btn btn-xs" onclick={() => change((s) => removePendingBlock(s, blockId))}
					>Remove pending exercise</button
				>
			</div>
			{#each sets as set (set.id)}
				{#if set.status === 'pending'}
					<div class="flex flex-wrap items-end gap-2">
						<label class="text-xs"
							>kg<input
								class="input block w-24 input-sm"
								type="text"
								inputmode="decimal"
								value={set.prescribedWeight}
								onchange={(e) =>
									change((s) =>
										editPendingPrescription(s, set.id!, {
											weight: numberFromText(e.currentTarget.value) ?? NaN
										})
									)}
							/></label
						>
						<label class="text-xs"
							>Reps<input
								class="input block w-20 input-sm"
								type="number"
								min="1"
								max="1000"
								step="1"
								value={set.prescribedReps}
								onchange={(e) =>
									change((s) =>
										editPendingPrescription(s, set.id!, { reps: e.currentTarget.valueAsNumber })
									)}
							/></label
						>
						<label class="flex items-center gap-1 text-xs"
							><input
								class="checkbox checkbox-sm"
								type="checkbox"
								checked={set.amrap}
								onchange={(e) =>
									change((s) =>
										editPendingPrescription(s, set.id!, { amrap: e.currentTarget.checked })
									)}
							/>AMRAP</label
						>
						<button
							class="btn btn-xs"
							onclick={() => change((s) => movePendingSet(s, set.id!, -1))}
							aria-label="Move set up">↑</button
						>
						<button
							class="btn btn-xs"
							onclick={() => change((s) => movePendingSet(s, set.id!, 1))}
							aria-label="Move set down">↓</button
						>
						<button class="btn btn-xs" onclick={() => change((s) => removePendingSet(s, set.id!))}
							>Remove set</button
						>
					</div>
				{:else}<p class="text-sm opacity-60">
						{set.prescribedWeight} kg × {set.prescribedReps} · {set.status}
					</p>{/if}
			{/each}
			<button class="btn btn-sm" onclick={() => change((s) => addPendingSet(s, blockId))}
				>Add set</button
			>
		</div>
	{/each}
	<div class="flex gap-2">
		<select class="select grow" bind:value={selected} aria-label="Exercise to add">
			<option value="">Choose exercise</option>
			{#each session.exercises ?? [] as exercise (exercise.key)}<option value={exercise.key}
					>{exercise.label}</option
				>{/each}
		</select>
		<button class="btn" disabled={!selected} onclick={() => change((s) => addExercise(s, selected))}
			>Add exercise</button
		>
	</div>
</section>
