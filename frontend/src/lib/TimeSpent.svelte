<script lang="ts">
	import { formatElapsed } from '$lib/time';
	import type { components } from '$lib/api/schema';

	/**
	 * Where the hour went (D-10).
	 *
	 * Every number here is computed in Rust and arrives in the response (D-11);
	 * this draws bars in proportion and formats seconds. The one thing it works
	 * out for itself is the width of a bar relative to the largest row, which is
	 * a property of the drawing rather than a fact about training.
	 *
	 * The bars are chalk on rubber like everything else on this screen. The
	 * plate colours are the product's one use of colour and they mean load, not
	 * duration — spending them here would say the two are the same kind of
	 * measurement.
	 */
	let { timing }: { timing: components['schemas']['SessionTiming'] } = $props();

	type Row = { key: string; label: string; seconds: number; muted: boolean };

	/**
	 * Lead-in and tail bracket the exercises rather than sorting among them.
	 *
	 * They are not lifts and the athlete cannot train them away, so they sit at
	 * the ends, dimmed. Sorting everything by size would put "getting started"
	 * above the main lift on a day the warm-up ran long, which reads as an
	 * accusation about the wrong thing.
	 */
	const rows = $derived<Row[]>([
		...(timing.lead_in_seconds !== null && timing.lead_in_seconds !== undefined
			? [
					{
						key: 'lead-in',
						label: 'Getting started',
						seconds: timing.lead_in_seconds,
						muted: true
					}
				]
			: []),
		...(timing.exercises ?? []).map((spend) => ({
			key: `exercise:${spend.exercise}`,
			label: spend.label,
			seconds: spend.seconds,
			muted: false
		})),
		...(timing.tail_seconds !== null && timing.tail_seconds !== undefined
			? [{ key: 'tail', label: 'After the last set', seconds: timing.tail_seconds, muted: true }]
			: [])
	]);

	const longest = $derived(Math.max(1, ...rows.map((row) => row.seconds)));

	/** Seconds as m:ss — the same clock the logger's header runs on. */
	const clock = (seconds: number) => formatElapsed(seconds * 1000);

	const counted = $derived(
		(timing.exercises ?? []).reduce((total, spend) => total + spend.counted_sets, 0)
	);
</script>

<section class="mt-6">
	<h2 class="mb-1 eyebrow">Where the time went</h2>

	<!--
		Said once, plainly, before the numbers rather than in a footnote after
		them. There is one tap per set, so a bar is the pause, the setup and the
		lift together — and an athlete reading "Back Squat 24:40" would otherwise
		reasonably assume it meant time under the bar.
	-->
	<p class="mb-3 text-xs opacity-50">
		Measured between logged sets, so each bar includes the pause before the lift as well as the lift
		itself.
	</p>

	<ul class="space-y-2">
		{#each rows as row (row.key)}
			<li>
				<div class="mb-1 flex items-baseline justify-between gap-3 text-sm">
					<span class:opacity-60={row.muted}>{row.label}</span>
					<span class="tracking-tight tabular" class:opacity-60={row.muted}>
						{clock(row.seconds)}
					</span>
				</div>
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-base-300">
					<div
						class="h-full rounded-full bg-base-content transition-[width] duration-300"
						class:opacity-35={row.muted}
						style="width: {(row.seconds / longest) * 100}%"
					></div>
				</div>
			</li>
		{/each}
	</ul>

	{#if timing.longest_interval}
		<p class="mt-3 text-sm opacity-60">
			Longest single gap <span class="tabular">{clock(timing.longest_interval.seconds)}</span>,
			before {timing.longest_interval.label}.
		</p>
	{/if}

	<!--
		When a measurement was thrown away the totals no longer add up to the wall
		clock, and the athlete will notice. Saying so is cheaper than letting them
		conclude the numbers are wrong — which, in a sense, is exactly what this
		is admitting.
	-->
	{#if timing.discarded_intervals > 0 || timing.unstamped_sets > 0}
		<p class="mt-2 text-xs opacity-45">
			{#if timing.discarded_intervals > 0}
				{timing.discarded_intervals}
				{timing.discarded_intervals === 1 ? 'gap' : 'gaps'} looked wrong and {timing.discarded_intervals ===
				1
					? 'was'
					: 'were'} left out, so these add up to less than the session took.
			{/if}
			{#if timing.unstamped_sets > 0}
				{timing.unstamped_sets}
				{timing.unstamped_sets === 1 ? 'set was' : 'sets were'} logged without a time.
			{/if}
		</p>
	{:else if counted > 0}
		<p class="mt-2 text-xs opacity-45">
			From {counted}
			{counted === 1 ? 'interval' : 'intervals'}.
		</p>
	{/if}
</section>
