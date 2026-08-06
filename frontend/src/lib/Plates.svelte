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

	/* The ink each plate carries its own number in, tokenised in layout.css for
	   the reason recorded there: the light theme re-tokenises the two pale
	   plates, so an ink chosen here would be right in the dark and wrong in
	   daylight. Which plate takes white and which takes dark is a fact about the
	   palette, not about this drawing, so it lives with the palette. */
	const INK: Record<string, string> = {
		'25': 'var(--color-plate-25-ink)',
		'20': 'var(--color-plate-20-ink)',
		'15': 'var(--color-plate-15-ink)',
		'10': 'var(--color-plate-10-ink)',
		'5': 'var(--color-plate-5-ink)',
		'2.5': 'var(--color-plate-2-5-ink)',
		'1.25': 'var(--color-plate-1-25-ink)'
	};

	/* Anything not in the table still draws, at a middling size in chrome, rather
	   than vanishing. A plate the app does not recognise is still a plate. */
	const key = (p: number) => String(p);
	const heightOf = (p: number) => HEIGHT[key(p)] ?? 55;
	const colourOf = (p: number) => COLOUR[key(p)] ?? 'var(--color-plate-1-25)';
	const inkOf = (p: number) => INK[key(p)] ?? 'var(--color-plate-1-25-ink)';

	/* The row used to be a fixed 104px whatever was on it, so a 2.5 + 1.25 set
	   reserved the same vertical box as 25 + 25 + 20 and spent most of it on
	   nothing. It is now the tallest plate present plus the 4px the borders and
	   the rounding want, which leaves the big loads exactly where they were and
	   gives the small ones their space back. Picking a maximum out of a list of
	   heights this file already owns is not arithmetic about the load (D-11):
	   nothing here is computed from a weight. */
	const tallest = $derived(plates.length > 0 ? Math.max(...plates.map(heightOf)) : 0);
</script>

{#if plates.length > 0}
	<!--
		The right-hand sleeve of a loaded bar, seen from the side. Anatomy runs
		outward from the middle of the bar: shaft, then plates largest-first, then
		the collar. The shaft stops at the collar because that is where it stops in
		life — drawn running past it, the plates look stranded at the end of an
		endless sleeve.

		That was right about the outboard end and said nothing about the inboard
		one, which is where the space was actually going. The shaft was `flex-1`,
		so it took every horizontal pixel the card had left over: with four plates
		— about 80px of stack — roughly 260px of a phone card was empty bar. It is
		now a fixed 24px stub, enough to say "this hangs off a bar" and no more,
		and the row shrink-wraps to its contents and sits at the left instead of
		stretching. Drawing the whole barbell was never the point; showing what is
		on the end of it is.
	-->
	<div class="flex w-fit items-center" style="height: {tallest + 4}px" aria-hidden="true">
		<div class="h-[5px] w-[24px] rounded-l-full" style="background: var(--color-bar)"></div>

		<div class="flex items-center gap-[3px]">
			{#each plates as plate, i (i)}
				<!--
					The plate's own value, on its face, rotated to read bottom-to-top the
					way a number stamped on a real plate does when it is on the bar.
					Colour and height alone were the whole signal, which works for anyone
					who has memorised the IWF colours and not for anyone who has not. The
					1.25 is the constraining case — about 22px of text on a 38px plate,
					in a rotated line-box about 11px wide inside 18px — and it fits with
					room to spare, so no plate is exempt and there is no size below which
					the rule changes. This sits inside the aria-hidden block, so it adds
					nothing for a screen reader to repeat.
				-->
				<div
					class="flex w-[18px] items-center justify-center rounded-[3px] border"
					style="height: {heightOf(plate)}px; background: {colourOf(plate)};
					       border-color: var(--color-plate-edge)"
				>
					<span
						class="rotate-180 text-[0.5625rem] leading-none font-semibold tabular-nums [writing-mode:vertical-rl]"
						style="color: {inkOf(plate)}">{plate}</span
					>
				</div>
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
