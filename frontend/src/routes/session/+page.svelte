<script lang="ts">
	import { resolve } from '$app/paths';
	import Plates from '$lib/Plates.svelte';
	import { formatClock, formatElapsed } from '$lib/time';
	import { projectedFinish } from '$lib/pace';
	import {
		CUT_REASONS,
		editSet,
		isComplete,
		logSet,
		nextSetPosition,
		resetSet,
		setsDone,
		setsRemaining,
		skipSet,
		toSubmission
	} from '$lib/session';
	import type { CutReason, LocalSession } from '$lib/session';
	import { clearActiveSession, loadActiveSession, saveActiveSession } from '$lib/storage';
	import { submitSession } from '$lib/submit';

	/**
	 * The logger. Every tap in here is local (D-09).
	 *
	 * Nothing on this page calls the network until the athlete finishes, and
	 * even then the submit is queued before it is attempted. There is no rest
	 * timer: one was tried in the predecessor and removed because it was a
	 * stress factor (D-10).
	 */

	type Phase = 'loading' | 'empty' | 'logging' | 'ending' | 'sent' | 'queued' | 'refused';

	let session = $state<LocalSession | null>(null);
	let phase = $state<Phase>('loading');
	let now = $state(Date.now());

	$effect(() => {
		void loadActiveSession().then((stored) => {
			session = stored;
			phase = stored ? 'logging' : 'empty';
		});
	});

	// One tick a second is all a wall clock needs, and it is the only thing on
	// this page that runs on its own.
	$effect(() => {
		const tick = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(tick);
	});

	/** Applies a change and writes it straight back — crash safety is local too. */
	async function apply(change: (current: LocalSession) => LocalSession) {
		if (!session) return;

		const updated = change(session);
		session = updated;
		await saveActiveSession(updated);
	}

	const elapsed = $derived(session ? now - Date.parse(session.startedAt) : 0);
	const remaining = $derived(session ? setsRemaining(session) : 0);
	const done = $derived(session ? setsDone(session) : 0);

	const finish = $derived(session ? projectedFinish(now, remaining, session.secondsPerSet) : null);

	const current = $derived(session ? nextSetPosition(session) : null);

	async function finishSession(cutReason: CutReason | null) {
		if (!session) return;

		const body = toSubmission(session, { endedAt: new Date().toISOString(), cutReason });

		// Cleared before the send is even attempted: the session is now the
		// queue's problem, and leaving it here would offer the athlete a
		// "resume" button for a workout that has already been submitted.
		await clearActiveSession();
		const report = await submitSession(body);
		session = null;

		// Asked about *this* id rather than about the report as a whole. A flush
		// sends everything outstanding, so an older session landing while this
		// one is still stuck would otherwise be reported as this one landing.
		if (report.accepted.includes(body.id) || report.duplicate.includes(body.id)) {
			phase = 'sent';
		} else if (report.rejected.includes(body.id)) {
			phase = 'refused';
		} else {
			phase = 'queued';
		}
	}

	function numberFrom(event: Event): number | undefined {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		return Number.isFinite(value) ? value : undefined;
	}
</script>

<svelte:head><title>Session · AthletOS</title></svelte:head>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col">
	{#if phase === 'loading'}
		<p class="p-4">Loading…</p>
	{:else if phase === 'empty'}
		<main class="space-y-3 p-4">
			<h1 class="text-xl font-bold">No session committed</h1>
			<p>Nothing is in progress on this device.</p>
			<a class="btn w-full btn-primary" href={resolve('/')}>Back to training</a>
		</main>
	{:else if phase === 'sent'}
		<main class="space-y-3 p-4">
			<h1 class="text-xl font-bold">Logged</h1>
			<p>The session is recorded and the program has moved on.</p>
			<a class="btn w-full btn-primary" href={resolve('/')}>Back to training</a>
		</main>
	{:else if phase === 'queued'}
		<main class="space-y-3 p-4">
			<h1 class="text-xl font-bold">Saved on this device</h1>
			<p>
				The session could not be sent yet. It is queued and will be sent the next time the app opens
				with a connection — sending it twice is harmless.
			</p>
			<a class="btn w-full btn-primary" href={resolve('/')}>Back to training</a>
		</main>
	{:else if phase === 'refused'}
		<main class="space-y-3 p-4">
			<h1 class="text-xl font-bold">The server would not take it</h1>
			<p>
				The session is still stored on this device and will not be retried on its own. Nothing you
				did was lost.
			</p>
			<a class="btn w-full btn-primary" href={resolve('/')}>Back to training</a>
		</main>
	{:else if session}
		<!--
			The header D-10 asks for: elapsed time and sets remaining, plus a
			projected finish once the athlete's own history can supply one. No
			rest timer, and nothing counting down.
		-->
		<header class="sticky top-0 z-10 flex items-baseline gap-4 border-b bg-base-100 p-3">
			<span class="font-mono text-3xl tabular-nums">{formatElapsed(elapsed)}</span>
			<span class="text-lg">{remaining} left</span>
			{#if finish !== null}
				<span class="ml-auto text-sm opacity-70">~{formatClock(new Date(finish))}</span>
			{/if}
		</header>

		<main class="grow p-3">
			<h1 class="mb-3 text-lg font-bold">
				Week {session.week}, day {session.day} · {done}/{session.sets.length} done
			</h1>

			<ol class="space-y-2">
				{#each session.sets as set (set.position)}
					{@const cues = session.cues[set.exercise] ?? []}
					<li
						class="card border"
						class:border-success={set.status === 'done'}
						class:opacity-50={set.status === 'skipped'}
						class:border-4={set.position === current}
					>
						<div class="card-body gap-2 p-3">
							{#if set.position === current}
								<!--
									The set being performed right now, sized to be read at arm's
									length while holding a bar. Everything else on this screen is
									deliberately quieter than this block.
								-->
								<p class="eyebrow">{set.label}</p>

								<div class="flex items-baseline gap-2">
									<span class="weight-hero">{set.prescribedWeight}</span>
									<span class="weight-unit">kg</span>
									<span class="ml-auto text-lg tabular opacity-70">
										{set.prescribedReps}{set.amrap ? '+' : ''} reps
									</span>
								</div>

								<div class="mt-1 mb-1">
									<Plates plates={set.platesPerSide} />
								</div>

								{#if cues.length > 0}
									<p class="text-sm opacity-60">{cues.join(' · ')}</p>
								{/if}
							{:else}
								<div class="flex items-baseline justify-between">
									<span class="font-medium">{set.label}</span>
									<span class="text-sm tabular opacity-70">
										{set.prescribedWeight} kg × {set.prescribedReps}{set.amrap ? '+' : ''}
									</span>
								</div>

								{#if set.platesPerSide.length > 0}
									<p class="text-sm opacity-60">
										bar + {set.platesPerSide.join(', ')} per side
									</p>
								{/if}
							{/if}

							<div class="flex items-center gap-2">
								<label class="flex items-center gap-1">
									<span class="sr-only">Weight in kilograms</span>
									<input
										type="number"
										inputmode="decimal"
										step="0.5"
										min="0"
										class="input-bordered input w-24 text-lg"
										value={set.actualWeight}
										oninput={(event) => {
											const weight = numberFrom(event);
											if (weight !== undefined) {
												void apply((s) => editSet(s, set.position, { weight }));
											}
										}}
									/>
									<span>kg</span>
								</label>

								<label class="flex items-center gap-1">
									<span class="sr-only">Reps</span>
									<input
										type="number"
										inputmode="numeric"
										step="1"
										min="0"
										class="input-bordered input w-20 text-lg"
										value={set.actualReps}
										oninput={(event) => {
											const reps = numberFrom(event);
											if (reps !== undefined) {
												void apply((s) => editSet(s, set.position, { reps }));
											}
										}}
									/>
									<span>reps</span>
								</label>
							</div>

							<div class="flex gap-2">
								{#if set.status === 'pending'}
									<button
										class="btn grow"
										class:action-primary={set.position === current}
										class:btn-primary={set.position === current}
										class:btn-outline={set.position !== current}
										type="button"
										onclick={() => apply((s) => logSet(s, set.position))}
									>
										Log
									</button>
									<button
										class="btn"
										type="button"
										onclick={() => apply((s) => skipSet(s, set.position))}
									>
										Skip
									</button>
								{:else}
									<span class="grow self-center text-sm">
										{set.status === 'done'
											? `Logged ${set.actualWeight} kg × ${set.actualReps}`
											: 'Skipped'}
									</span>
									<button
										class="btn btn-ghost"
										type="button"
										onclick={() => apply((s) => resetSet(s, set.position))}
									>
										Undo
									</button>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			</ol>
		</main>

		<footer class="sticky bottom-0 border-t bg-base-100 p-3">
			{#if phase === 'ending'}
				<!--
					The one question, asked once, when a session ends before the
					last set (D-08). The program advances whatever the answer is —
					there is nothing to repeat and nothing to feel bad about.
				-->
				<p class="mb-2 font-medium">Why are you stopping?</p>
				<div class="grid grid-cols-2 gap-2">
					{#each CUT_REASONS as reason (reason.value)}
						<button class="btn btn-lg" type="button" onclick={() => finishSession(reason.value)}>
							{reason.label}
						</button>
					{/each}
				</div>
				<button class="btn mt-2 w-full btn-ghost" type="button" onclick={() => (phase = 'logging')}>
					Keep going
				</button>
			{:else if isComplete(session)}
				<button
					class="btn w-full btn-lg btn-primary"
					type="button"
					onclick={() => finishSession(null)}
				>
					Finish session
				</button>
			{:else}
				<button class="btn w-full btn-lg" type="button" onclick={() => (phase = 'ending')}>
					End session early
				</button>
			{/if}
		</footer>
	{/if}
</div>
