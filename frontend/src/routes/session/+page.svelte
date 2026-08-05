<script lang="ts">
	import { resolve } from '$app/paths';
	import Plates from '$lib/Plates.svelte';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import { formatClock, formatElapsed } from '$lib/time';
	import { projectedFinish } from '$lib/pace';
	import {
		barUnchangedFrom,
		CUT_REASONS,
		DRIFT_REASONS,
		editSet,
		intervalBefore,
		isComplete,
		logSet,
		nextSetPosition,
		noteSet,
		plateChangeFor,
		resetSet,
		setDriftReason,
		setsDone,
		setsRemaining,
		skipSet,
		summarise,
		toSubmission
	} from '$lib/session';
	import type { CutReason, LocalSession, SessionSummary, WorkoutReceipt } from '$lib/session';
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

	// Which set's note field is open. One at a time: the athlete is writing
	// about the set in front of them, and a screen of open textareas is a
	// screen where Log is harder to find.
	let noting = $state<number | null>(null);

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

	// Kept across the submit so the finish screen has something to show. The
	// session itself is cleared before the send is even attempted — it belongs
	// to the queue from that moment, and leaving it here would offer a "resume"
	// button for a workout already on its way.
	let summary = $state<SessionSummary | null>(null);
	let recordId = $state<string | null>(null);

	// What the server said about this session, when it landed. Asked for by id
	// rather than taken off the report as a whole: a flush sends everything
	// outstanding, and an older session landing at the same moment would
	// otherwise put its numbers on this ending.
	let receipt = $state<WorkoutReceipt | null>(null);

	async function finishSession(cutReason: CutReason | null) {
		if (!session) return;

		const ending = { endedAt: new Date().toISOString(), cutReason };
		const body = toSubmission(session, ending);

		summary = summarise(session, ending);
		recordId = session.id;

		// Cleared before the send is even attempted: the session is now the
		// queue's problem, and leaving it here would offer the athlete a
		// "resume" button for a workout that has already been submitted.
		await clearActiveSession();
		const report = await submitSession(body);
		session = null;
		receipt = report.receipts[body.id] ?? null;

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
		// Empty or all-whitespace is "no edit", not zero. `Number('')` is `0`,
		// finite and indistinguishable from a typed zero, and this fires on
		// every keystroke: without this check, clearing the field to retype a
		// number applies `delta = -prescribedWeight` and carries a 0 kg to
		// every later pending set of the exercise before the athlete finishes
		// typing the number they meant.
		const raw = (event.currentTarget as HTMLInputElement).value;
		if (raw.trim().length === 0) return undefined;

		const value = Number(raw);
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
	{:else if summary && (phase === 'sent' || phase === 'queued' || phase === 'refused')}
		<main class="space-y-4 p-4">
			<h1 class="text-xl font-bold">
				{summary.cutReason ? 'Session cut short' : 'Session complete'}
			</h1>

			<div class="flex items-baseline gap-4">
				<span class="font-mono text-4xl tabular-nums">
					{formatElapsed(summary.durationSeconds * 1000)}
				</span>
				<span class="text-lg">{summary.done}/{summary.total} sets</span>
			</div>

			{#if summary.skipped > 0 || summary.pending > 0}
				<p class="text-sm opacity-70">
					{#if summary.skipped > 0}{summary.skipped} skipped{/if}
					{#if summary.skipped > 0 && summary.pending > 0}
						·
					{/if}
					{#if summary.pending > 0}{summary.pending} not reached{/if}
				</p>
			{/if}

			<!--
				Whether the permanent record exists yet, and — once it does — the
				drift against the prescription and where the hour went. Both numbers
				are computed once, in Rust, off the submission that just landed
				(D-11), and arrive on `receipt` below; nothing here recomputes them.
				The history page still holds the per-exercise breakdown behind each
				number — which set drifted, which gap was long — so that is not
				duplicated on this screen either.
			-->
			{#if phase === 'sent'}
				{#if receipt}
					{@const ending = receipt.summary}
					<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
						<!--
							Load and drift on the same screen, deliberately. D-08 refused a
							drift total here because it would have been the first place in
							the product drift appeared alone; beside the load actually
							moved and the athlete's own average, it is not alone (D-13).
						-->
						<dt class="eyebrow">load moved</dt>
						<dd class="tabular">{Math.round(ending.load_moved_kg)} kg</dd>

						{#if ending.sets_over > 0 || ending.sets_under > 0}
							<dt class="eyebrow">against the prescription</dt>
							<dd class="tabular">
								{Math.round(ending.load_moved_kg - ending.load_prescribed_kg)} kg
								{#if ending.sets_over > 0}· over on {ending.sets_over}{/if}
								{#if ending.sets_under > 0}· under on {ending.sets_under}{/if}
							</dd>
						{/if}

						{#if ending.average_duration_seconds !== null && ending.average_duration_seconds !== undefined}
							<dt class="eyebrow">against your average</dt>
							<dd class="tabular">
								{formatElapsed(
									Math.abs(ending.duration_seconds - ending.average_duration_seconds) * 1000
								)}
								{ending.duration_seconds >= ending.average_duration_seconds
									? 'longer'
									: 'shorter'}
							</dd>
						{/if}

						{#if ending.intervals}
							<dt class="eyebrow">between sets</dt>
							<dd class="tabular">
								{formatElapsed(ending.intervals.min_seconds * 1000)} ·
								{formatElapsed(ending.intervals.median_seconds * 1000)} ·
								{formatElapsed(ending.intervals.max_seconds * 1000)}
							</dd>
							<!--
								The middle figure is a median, not a mean: one interval spent
								talking to somebody moves a mean of twelve by a minute, and
								the tail of this distribution is not signal (D-10).
							-->
							<dt class="sr-only">what those three are</dt>
							<dd class="col-span-2 text-xs opacity-50">
								fastest · typical · slowest
								{#if ending.intervals.discarded > 0}
									· {ending.intervals.discarded} gap{ending.intervals.discarded === 1
										? ''
										: 's'} too long to believe, left out
								{/if}
							</dd>
						{/if}
					</dl>
				{/if}
				<p class="text-sm opacity-70">Recorded. The program has moved on.</p>
				<a class="btn w-full" href={resolve(`/history/${recordId}`)}> See where the hour went </a>
			{:else if phase === 'queued'}
				<p class="text-sm opacity-70">
					Saved on this device and not sent yet. It goes up the next time the app opens with a
					connection, and sending it twice is harmless.
				</p>
				<button class="btn w-full" type="button" disabled>
					The full breakdown needs a connection
				</button>
			{:else}
				<p class="alert text-sm alert-error" role="alert">
					The server would not take it. The session is still stored on this device and will not be
					retried on its own — nothing you did was lost.
				</p>
			{/if}

			<a class="btn w-full btn-lg btn-primary" href={resolve('/')}>Back to training</a>
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
			<!--
				The logger has no nav of its own, and daylight at a rack is exactly
				when the switch is wanted. It is not a mid-set action, so the top of
				the screen is fine for it — unlike Log, which stays under a thumb.
			-->
			<span class="self-center" class:ml-auto={finish === null}><ThemeToggle /></span>
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

								{@const change = plateChangeFor(session, set.position)}
								<!--
									Guarded on the pair, not on `change` alone (Finding 1 of the
									branch review). `plateChangeFor` is `null` for two different
									reasons that must not render the same way: a stale plan
									(handled below, `set.platesPerSide` still has plates to
									fall back to) and non-barbell loading, where
									`platesPerSide` is empty too. Without this guard the
									`{:else}` branch drew `<Plates plates={[]} />` for a
									dumbbell or bodyweight set, which prints "empty bar · 20 kg"
									— a false statement about a load that has no bar. A barbell
									set sitting at exactly the empty bar still renders that same
									line correctly, because it carries a `plate_change` with an
									empty `plates_per_side` rather than no change at all.
								-->
								{@const unchanged = barUnchangedFrom(session, set.position)}
								{@const showPrescribed =
									set.actualWeight === set.prescribedWeight && set.platesPerSide.length > 0}

								{#if change || unchanged || showPrescribed}
									<div class="mt-1 mb-1">
										{#if change}
											<!--
												What to do to the bar, not what the bar should end up
												as. The greedy breakdown of two adjacent weights can
												share almost nothing, so read as instructions it says
												strip two plates to add one — and the temptation is to
												put a convenient pair on instead and lift more than was
												asked for (D-04).
											-->
											{#if change.remove.length > 0}
												<p class="text-sm">
													<span class="eyebrow">take off</span>
													<span class="tabular">{change.remove.join(', ')}</span> per side
												</p>
											{/if}
											{#if change.add.length > 0}
												<p class="text-sm">
													<span class="eyebrow">add</span>
													<span class="tabular">{change.add.join(', ')}</span> per side
												</p>
											{/if}
											{#if change.remove.length === 0 && change.add.length === 0 && change.plates_per_side.length > 0}
												<!-- Same weight as the last set. Saying nothing here
												     would read as a screen that failed to load. -->
												<p class="eyebrow">bar is already loaded</p>
											{/if}

											<Plates plates={change.plates_per_side} />
										{:else if unchanged}
											<!--
												The plan is gone because this weight was edited, but
												the bar is where the last set left it and that is the
												whole instruction. No stack is drawn: nobody computed
												one for an edited weight, and the words were always
												the instruction while the picture was the nicety
												(D-04, D-11).
											-->
											<p class="eyebrow">bar is already loaded</p>
										{:else}
											<!--
												Stale for one of the *other* reasons — an earlier set
												of this exercise skipped, or logged at a weight other
												than its own. This set still sits at its own
												prescription, so the breakdown is true about the
												weight it names, and it stays dimmed and labelled.
											-->
											<div class="opacity-60">
												<Plates plates={set.platesPerSide} />
												<p class="text-xs">for the prescribed {set.prescribedWeight} kg</p>
											</div>
										{/if}
									</div>
								{/if}

								<!--
									One cue per line. Joined with a separator they read as a
									single sentence, and an athlete glancing down mid-set has to
									parse the whole run to find the one thing they are about to
									get wrong. Keyed by index: cues are plain strings off the
									response and nothing stops an exercise carrying the same one
									twice, which is exactly how the peek screen threw
									`each_key_duplicate`.
								-->
								{#if cues.length > 0}
									<ul class="list-disc space-y-1 pl-5 text-sm opacity-60 marker:opacity-50">
										{#each cues as cue, index (index)}
											<li>{cue}</li>
										{/each}
									</ul>
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

							<!--
								Why the weight changed. Appears only on the set being performed
								and only once it actually differs; vanishes if it goes back.
								Nothing is selected, no tap is a valid answer, and Log stays one
								tap either way — honesty must never cost more than dishonesty
								(D-07).
							-->
							{#if set.position === current && set.actualWeight !== set.prescribedWeight}
								<fieldset class="flex flex-wrap items-baseline gap-2">
									<legend class="eyebrow">why</legend>
									{#each DRIFT_REASONS as reason (reason.value)}
										<button
											class="btn btn-xs"
											class:btn-primary={set.driftReason === reason.value}
											class:btn-outline={set.driftReason !== reason.value}
											type="button"
											aria-pressed={set.driftReason === reason.value}
											onclick={() =>
												apply((s) =>
													setDriftReason(
														s,
														set.position,
														set.driftReason === reason.value ? null : reason.value
													)
												)}
										>
											{reason.label}
										</button>
									{/each}
								</fieldset>
							{/if}

							<!--
								Placed under the current set only, and reopened for a set that
								carries a note even after it is no longer current — the
								athlete gets the affordance where they are and can still read
								or edit what they wrote on an earlier set. Without the second
								condition this sat on every card regardless of status
								(Finding 4 of the branch review): on a Smolov Jr day roughly
								twenty-five extra "Add note" buttons for sets nobody is
								looking at. Invisible otherwise so logging a set as prescribed
								stays one tap — honesty must never cost more than dishonesty
								(D-07), and a field that is always on screen is a field that
								asks to be filled in.
							-->
							{#if set.position === current || set.note}
								{#if noting === set.position}
									<label class="flex w-full flex-col">
										<span class="sr-only">Note for this set</span>
										<textarea
											class="textarea-bordered textarea w-full"
											rows="2"
											maxlength="500"
											placeholder="What happened on this set?"
											value={set.note ?? ''}
											oninput={(event) =>
												apply((s) => noteSet(s, set.position, event.currentTarget.value))}
										></textarea>
									</label>
									<button
										class="btn self-start btn-ghost btn-sm"
										type="button"
										onclick={() => (noting = null)}
									>
										Done
									</button>
								{:else if set.note}
									<button
										class="text-left text-sm opacity-70"
										type="button"
										onclick={() => (noting = set.position)}
									>
										{set.note}
									</button>
								{:else}
									<button
										class="self-start text-sm opacity-50"
										type="button"
										onclick={() => (noting = set.position)}
									>
										Add note
									</button>
								{/if}
							{/if}

							<div class="flex gap-2">
								{#if set.status === 'pending'}
									<button
										class="btn grow"
										class:action-primary={set.position === current}
										class:btn-primary={set.position === current}
										class:btn-outline={set.position !== current}
										type="button"
										onclick={() => apply((s) => logSet(s, set.position, new Date().toISOString()))}
									>
										Log
									</button>
									<button
										class="btn"
										type="button"
										onclick={() => apply((s) => skipSet(s, set.position, new Date().toISOString()))}
									>
										Skip
									</button>
								{:else}
									{@const interval = intervalBefore(session, set.position)}
									<div class="flex grow items-baseline gap-2 self-center">
										<span class="text-sm">
											{set.status === 'done'
												? `Logged ${set.actualWeight} kg × ${set.actualReps}`
												: 'Skipped'}
										</span>
										<!--
											When, and how long the gap before it was. Both describe work
											already done and both stop changing the moment they appear —
											which is the line between this and a rest timer. Nothing on
											this screen counts up toward the set being rested for (D-10).
										-->
										{#if set.loggedAt}
											<span class="ml-auto text-xs tabular opacity-50">
												{formatClock(new Date(set.loggedAt))}
												{#if interval !== null}
													· +{formatElapsed(interval * 1000)}
												{/if}
											</span>
										{/if}
									</div>
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
