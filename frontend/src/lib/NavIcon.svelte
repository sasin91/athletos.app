<script lang="ts">
	/**
	 * The four navigation glyphs, inline.
	 *
	 * Inline rather than an icon package: it is four shapes, and a PWA that has
	 * to open with no network should not carry a dependency to draw them.
	 *
	 * Two of the four are taken from the subject rather than from a generic set —
	 * a loaded barbell for training, and a plate seen face-on for maxes. At this
	 * size an athlete reads them peripherally, without reading the label.
	 */
	export type NavIconName = 'train' | 'programs' | 'maxes' | 'history';

	let { name }: { name: NavIconName } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	class="h-6 w-6"
	aria-hidden="true"
>
	{#if name === 'train'}
		<!-- A loaded bar, seen from the side. Two plates, not five strokes: at
		     24px a denser drawing reads as a tally mark. -->
		<path d="M4 12h16" />
		<rect x="5.25" y="7.25" width="3.25" height="9.5" rx="1.25" />
		<rect x="15.5" y="7.25" width="3.25" height="9.5" rx="1.25" />
	{:else if name === 'programs'}
		<!-- Two cards in a stack: the catalogue. -->
		<rect x="3.5" y="4.5" width="17" height="6" rx="1.5" />
		<rect x="3.5" y="13.5" width="17" height="6" rx="1.5" />
	{:else if name === 'maxes'}
		<!-- A plate, face-on, collar hole and all. -->
		<circle cx="12" cy="12" r="8.25" />
		<circle cx="12" cy="12" r="2.5" />
	{:else if name === 'history'}
		<!-- Sessions already behind you. -->
		<circle cx="12" cy="12" r="8.25" />
		<path d="M12 7.25V12l3 1.75" />
	{/if}
</svg>
