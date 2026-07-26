<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Maxes · AthletOS</title></svelte:head>

<h1 class="mb-1 text-xl font-bold">Your maxes</h1>
<p class="mb-3 text-sm opacity-70">
	One-rep maxes in kilograms, entered — never calculated. Each program takes its own view of the
	number, so there is nothing to be conservative about here.
</p>

{#if form && 'message' in form && form.message}
	<p class="mb-3 alert alert-error" role="alert">{form.message}</p>
{/if}

{#if form && 'saved' in form && form.saved}
	<p class="mb-3 alert alert-success" role="status">Saved.</p>
{/if}

<form method="POST" class="space-y-3">
	{#each data.fields as field (field.exercise)}
		<label class="form-control block">
			<span class="label-text font-medium">{field.label}</span>
			<input
				name={field.exercise}
				type="number"
				inputmode="decimal"
				step="0.5"
				min="0"
				value={data.maxes[field.exercise] ?? ''}
				class="input-bordered input w-full text-lg"
			/>
			<span class="label-text-alt">
				{#if field.wantedBy.length > 0}
					Needed by {field.wantedBy.join(', ')}
				{:else}
					No compiled program asks for this one. Leave it blank to remove it.
				{/if}
			</span>
		</label>
	{/each}

	<button class="btn w-full btn-primary" type="submit">Save</button>
	<p class="text-xs opacity-70">
		A blank field removes that max. Removing one cannot break a program you are already running.
	</p>
</form>
