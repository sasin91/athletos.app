<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Programs · AthletOS</title></svelte:head>

<h1 class="mb-1 text-xl font-bold">Programs</h1>
<p class="mb-3 text-sm opacity-70">
	No fit score and no ranking. Recovery demand and session length lead, because those are the two
	that decide whether a program fits your week.
</p>

<ul class="space-y-3">
	{#each data.programs as program (program.key)}
		<li class="card border">
			<div class="card-body">
				<h2 class="card-title">
					<a class="link" href={resolve(`/programs/${program.key}`)}>{program.name}</a>
				</h2>

				<ul class="text-sm">
					<li><strong>Recovery demand:</strong> {program.recovery_demand}</li>
					<li><strong>Session:</strong> about {program.estimated_session_minutes} minutes</li>
					<li><strong>Days per week:</strong> {program.days_per_week}</li>
					<li>
						<strong>Length:</strong>
						{#if program.length.kind === 'fixed'}
							{program.length.weeks} weeks, {program.length.sessions} sessions
						{:else}
							open-ended
						{/if}
					</li>
				</ul>
			</div>
		</li>
	{/each}
</ul>
