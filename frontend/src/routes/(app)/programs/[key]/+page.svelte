<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>{data.program.name} · AthletOS</title></svelte:head>

<h1 class="mb-3 text-xl font-bold">{data.program.name}</h1>

{#if form?.message}
	<p class="mb-3 alert alert-error" role="alert">{form.message}</p>
{/if}

<ul class="mb-4">
	<li><strong>Recovery demand:</strong> {data.program.recovery_demand}</li>
	<li><strong>Session:</strong> about {data.program.estimated_session_minutes} minutes</li>
	<li><strong>Days per week:</strong> {data.program.days_per_week}</li>
	<li><strong>Experience floor:</strong> {data.program.experience_floor}</li>
	<li>
		<strong>Length:</strong>
		{#if data.program.length.kind === 'fixed'}
			{data.program.length.weeks} weeks, {data.program.length.sessions} sessions
		{:else}
			open-ended
		{/if}
	</li>
	<li><strong>Equipment:</strong> {data.program.equipment.join(', ')}</li>
	<li>
		<strong>Needs a max for:</strong>
		{data.program.required_maxes.map((required) => required.label).join(', ')}
	</li>
</ul>

{#if data.missing.length > 0}
	<div class="mb-3 alert alert-warning">
		<span>
			Enter a max for {data.missing.map((required) => required.label).join(' and ')} before starting this
			one.
		</span>
	</div>
	<a class="btn w-full btn-primary" href={resolve('/maxes')}>Enter maxes</a>
{:else}
	<form method="POST">
		<button class="btn w-full btn-primary" type="submit">Start this program</button>
	</form>
{/if}
