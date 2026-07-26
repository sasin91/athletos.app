<script lang="ts">
	import { untrack } from 'svelte';

	import { addableExercises, rowsFor, type MaxRow } from '$lib/maxes';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/**
	 * The form is the document.
	 *
	 * `PUT /v1/athlete/maxes` replaces the whole thing, so a row rendered here is
	 * a key that will be sent and a row removed is a key that will not be —
	 * which is what makes "remove this lift" a plain splice rather than a second
	 * endpoint.
	 *
	 * Seeded rather than derived, and `untrack` says so deliberately: a derived
	 * list would be recomputed out from under a half-typed number, and these rows
	 * are the athlete's working copy rather than a view of the server's.
	 */
	let rows = $state<MaxRow[]>(untrack(() => rowsFor(data.maxes, data.registry)));

	/**
	 * Re-seed only when a save has actually landed.
	 *
	 * `numeric(6,2)` rounds on the way in, so the stored document is not always
	 * the one that was sent, and the form should end up holding the stored one.
	 * A failed save leaves `data` untouched and therefore leaves the athlete's
	 * unsaved edits alone, which is the behaviour that matters more.
	 */
	let seeded = untrack(() => data.maxes);
	$effect(() => {
		if (data.maxes !== seeded) {
			seeded = data.maxes;
			rows = rowsFor(data.maxes, data.registry);
		}
	});

	let picked = $state('');

	const addable = $derived(addableExercises(data.registry, rows));

	function add() {
		const exercise = data.registry.find((candidate) => candidate.key === picked);
		if (!exercise) return;

		rows = [...rows, { exercise: exercise.key, label: exercise.label, weight: '' }];
		picked = '';
	}

	function remove(exercise: string) {
		rows = rows.filter((row) => row.exercise !== exercise);
	}
</script>

<svelte:head><title>Maxes · AthletOS</title></svelte:head>

<h1 class="mb-1 text-xl font-bold">Your maxes</h1>
<p class="mb-3 text-sm opacity-70">
	One-rep maxes in kilograms, entered — never calculated. Add any lift you want to track; remove any
	you do not. Each program takes its own view of the number, so there is nothing to be conservative
	about here.
</p>

{#if form && 'message' in form && form.message}
	<p class="mb-3 alert alert-error" role="alert">{form.message}</p>
{/if}

{#if form && 'saved' in form && form.saved}
	<p class="mb-3 alert alert-success" role="status">Saved.</p>
{/if}

<form method="POST" class="space-y-3">
	{#each rows as row (row.exercise)}
		<label class="form-control block">
			<span class="label-text font-medium">{row.label}</span>
			<span class="flex gap-2">
				<input
					name={row.exercise}
					type="number"
					inputmode="decimal"
					step="0.5"
					min="0"
					bind:value={row.weight}
					class="input-bordered input w-full text-lg"
				/>
				<button
					class="btn btn-ghost"
					type="button"
					onclick={() => remove(row.exercise)}
					aria-label="Remove {row.label}"
				>
					Remove
				</button>
			</span>
		</label>
	{:else}
		<p class="text-sm opacity-70">No maxes yet. Add a lift below.</p>
	{/each}

	<button class="btn w-full btn-primary" type="submit">Save</button>
	<p class="text-xs opacity-70">
		Removing a lift deletes that max when you save. It cannot break a program you are already
		running — a program keeps its own copy of the numbers it started with.
	</p>
</form>

{#if addable.length > 0}
	<div class="mt-4 border p-3">
		<h2 class="mb-2 font-medium">Add a lift</h2>
		<div class="flex gap-2">
			<select bind:value={picked} class="select-bordered select w-full" aria-label="Lift to add">
				<option value="">Choose a lift…</option>
				{#each addable as exercise (exercise.key)}
					<option value={exercise.key}>{exercise.label}</option>
				{/each}
			</select>
			<button class="btn" type="button" onclick={add} disabled={picked === ''}>Add</button>
		</div>
	</div>
{/if}

<!--
	The other set of numbers, and the reason this screen exists in this shape.

	A 1RM and the number a program prescribes from drift apart on purpose: 5/3/1
	starts its training max at 90% and moves it every cycle, so four cycles in it
	is prescribing off more than the 1RM above while that field has not changed.
	Showing only one of the two numbers is what makes that look like a bug. These
	are read-only because the training max is the governor (D-01, D-04) — an
	athlete who can nudge it upward after a session that felt easy has removed the
	only restraint the program has.
-->
{#if data.active.length > 0}
	<h2 class="mt-6 mb-1 font-bold">What your programs are working from</h2>
	<p class="mb-3 text-sm opacity-70">
		These belong to the program, not to you, and they move on their own as you log sessions. They
		are not the numbers above and they cannot be edited here.
	</p>

	<ul class="space-y-3">
		{#each data.active as enrollment (enrollment.id)}
			<li class="border p-3">
				<h3 class="mb-2 font-medium">{enrollment.program_name}</h3>

				{#if enrollment.readout.length === 0}
					<p class="text-sm opacity-70">This program does not work from a stored number.</p>
				{:else}
					<dl class="space-y-1 text-sm">
						{#each enrollment.readout as entry (entry.exercise)}
							<div class="flex items-baseline justify-between gap-2">
								<dt>
									{entry.exercise_label}
									<span class="opacity-60">· {entry.label}</span>
								</dt>
								<dd class="font-mono">{entry.weight} kg</dd>
							</div>
						{/each}
					</dl>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
