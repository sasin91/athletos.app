<script lang="ts">
	import { resolve } from '$app/paths';
	import EnrollmentAdjustments from '$lib/EnrollmentAdjustments.svelte';
	import ProgressDashboard from '$lib/ProgressDashboard.svelte';
	import type { LocalSession } from '$lib/session';
	import { loadActiveSession, setActiveAthlete } from '$lib/storage';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/**
	 * A session already committed on this device, if there is one.
	 *
	 * Read from IndexedDB rather than from the server, because the server does
	 * not know: committing is a local act and `started_at` only reaches Rust
	 * with the finished submit (D-08, D-09).
	 */
	let active = $state<LocalSession | null>(null);

	$effect(() => {
		void setActiveAthlete(data.athleteId, data.enrollmentIds)
			.then(loadActiveSession)
			.then((session) => (active = session));
	});

	const activeEnrollments = $derived(data.enrollments.filter((e) => e.status === 'active'));
	const pastEnrollments = $derived(data.enrollments.filter((e) => e.status !== 'active'));
</script>

<svelte:head><title>Train · AthletOS</title></svelte:head>

<h1 class="mb-3 text-xl font-bold">Train</h1>

{#if active}
	<a href={resolve('/session')} class="btn mb-4 w-full btn-lg btn-primary">
		Resume session — {active.title ?? `week ${active.week}, day ${active.day}`}
	</a>
{/if}

<div class="mb-4 grid grid-cols-2 gap-2">
	<a class="btn" href={resolve('/workouts')}>My workouts</a>
	<a class="btn btn-outline" href={resolve('/workouts/new')}>Create workout</a>
</div>

{#if activeEnrollments.length === 0}
	<div class="card border">
		<div class="card-body">
			<p>You are not running a program.</p>
			<a class="btn btn-primary" href={resolve('/programs')}>Browse programs</a>
		</div>
	</div>
{/if}

<ul class="space-y-3">
	{#each activeEnrollments as enrollment (enrollment.id)}
		<li class="card border">
			<div class="card-body">
				<h2 class="card-title">{enrollment.program_name}</h2>
				<p>
					{#if enrollment.progress.total === null}
						{enrollment.progress.completed} sessions logged
					{:else}
						Session {enrollment.progress.completed + 1} of {enrollment.progress.total}
					{/if}
				</p>
				<a class="btn btn-primary" href={resolve(`/peek/${enrollment.id}`)}>
					What am I doing today?
				</a>

				<EnrollmentAdjustments {enrollment} {form} />
			</div>
		</li>
	{/each}
</ul>

{#if data.allProgress}
	<section class="mt-6 mb-4 rounded-box border border-base-300 p-3">
		<h2 class="font-bold">All your training</h2>
		<p class="mb-3 text-xs opacity-70">Program sessions and your own workouts</p>
		<dl class="grid grid-cols-3 gap-3 text-sm">
			<div>
				<dt class="opacity-70">Sessions</dt>
				<dd class="text-lg font-semibold">{data.allProgress.sessions}</dd>
			</div>
			<div>
				<dt class="opacity-70">Sets logged</dt>
				<dd class="text-lg font-semibold">{data.allProgress.done_sets}</dd>
			</div>
			<div>
				<dt class="opacity-70">Load moved</dt>
				<dd class="text-lg font-semibold">{data.allProgress.load_moved_kg.toLocaleString()} kg</dd>
			</div>
		</dl>
		{#if data.allProgress.estimates.length > 0}
			<h3 class="mt-3 text-sm font-semibold">Estimated strength</h3>
			<ul class="mt-1 text-sm">
				{#each data.allProgress.estimates as estimate (estimate.exercise)}<li>
						{estimate.label}: {estimate.is_lower_bound ? 'at least ' : ''}{estimate.estimate} kg
					</li>{/each}
			</ul>
		{/if}
	</section>
{/if}

<h2 class="mt-6 font-bold">Program trends</h2>
<p class="mt-1 text-xs opacity-70">These charts follow sessions recorded with your programs.</p>
<ProgressDashboard
	progress={data.progress}
	enrollments={data.enrollments}
	requestedLift={data.requestedLift}
/>

{#if pastEnrollments.length > 0}
	<h2 class="mt-6 mb-2 font-bold">Finished</h2>
	<ul class="space-y-2">
		{#each pastEnrollments as enrollment (enrollment.id)}
			<li class="border p-3 text-sm">
				<p>
					{enrollment.program_name} — {enrollment.status},
					{enrollment.progress.completed} sessions
				</p>

				<EnrollmentAdjustments {enrollment} {form} />
			</li>
		{/each}
	</ul>
{/if}
