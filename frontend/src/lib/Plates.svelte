<script lang="ts">
	/**
	 * The plate stack, drawn.
	 *
	 * This is the one place the product spends colour. Everything else is chalk
	 * on rubber; these are the IWF calibrated colours the athlete will see on the
	 * rack in front of them, at heights proportional to real plate diameters. The
	 * point is that you recognise the load the way you recognise it loaded — by
	 * its shape and colour — rather than by parsing "25, 15, 5, 1.25".
	 *
	 * `plates_per_side` is computed in Rust (D-04, D-11) and arrives already
	 * rounded down to something loadable. Nothing here does arithmetic; it only
	 * draws what it is given, in the order it is given, which is the order the
	 * plates go on.
	 */
	let {
		plates,
		bar = 20
	}: {
		/** kg per side, largest first, exactly as the API returned it. */
		plates: number[];
		/** Bar weight in kg. Drawn as the sleeve the plates sit on. */
		bar?: number;
	} = $props();

	/* Real plate diameters, normalised. A 25 towers over a 1.25 on the bar and it
	   should here too, or the drawing lies about what you are looking at. */
	const HEIGHT: Record<string, number> = {
		'25': 100,
		'20': 100,
		'15': 92,
		'10': 82,
		'5': 62,
		'2.5': 48,
		'1.25': 38
	};

	const COLOUR: Record<string, string> = {
		'25': 'var(--color-plate-25)',
		'20': 'var(--color-plate-20)',
		'15': 'var(--color-plate-15)',
		'10': 'var(--color-plate-10)',
		'5': 'var(--color-plate-5)',
		'2.5': 'var(--color-plate-2-5)',
		'1.25': 'var(--color-plate-1-25)'
	};

	/* Anything not in the table still draws, at a middling size in chrome, rather
	   than vanishing. A plate the app does not recognise is still a plate. */
	const key = (p: number) => String(p);
	const heightOf = (p: number) => HEIGHT[key(p)] ?? 55;
	const colourOf = (p: number) => COLOUR[key(p)] ?? 'var(--color-plate-1-25)';
</script>

{#if plates.length > 0}
	<!--
		The right-hand sleeve of a loaded bar, seen from the side. Anatomy runs
		outward from the middle of the bar: shaft, then plates largest-first, then
		the collar. The shaft stops at the collar because that is where it stops in
		life — drawn running past it, the plates look stranded at the end of an
		endless sleeve.
	-->
	<div class="flex h-[104px] items-center" aria-hidden="true">
		<div class="h-[5px] flex-1 rounded-l-full" style="background: var(--color-bar)"></div>

		<div class="flex items-center gap-[3px]">
			{#each plates as plate, i (i)}
				<div
					class="w-[18px] rounded-[3px] border border-black/30"
					style="height: {heightOf(plate)}px; background: {colourOf(plate)}"
				></div>
			{/each}

			<div
				class="ml-[2px] h-[28px] w-[8px] rounded-[2px]"
				style="background: var(--color-bar)"
			></div>
		</div>
	</div>

	<!-- The drawing is decorative; this is what a screen reader gets, and what
	     anyone loading the bar actually needs said out loud. -->
	<p class="sr-only">
		{bar} kg bar plus {plates.join(', ')} kg per side
	</p>
{:else}
	<p class="eyebrow">empty bar · {bar} kg</p>
{/if}
