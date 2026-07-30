<script lang="ts">
	/**
	 * Light or dark, and nothing else.
	 *
	 * Two states rather than three. The initial value is seeded from
	 * `prefers-color-scheme` by the script in `app.html` on first run and is an
	 * explicit choice from then on — an "auto" that changes the screen at sunset
	 * while the athlete is mid-session is a surprise, not a feature.
	 *
	 * The write is the whole of this component: the *read* happens before first
	 * paint in `app.html`, because a theme applied in a component runs after
	 * hydration and the athlete would watch the page change colour.
	 */
	const SURFACES = { athletos: '#121211', solarized: '#fdf6e3' } as const;
	type Theme = keyof typeof SURFACES;

	let theme = $state<Theme>('athletos');

	// Read back what app.html decided, after hydration. Runs before paint of
	// this component's own update, so the icon does not flicker.
	$effect.pre(() => {
		const stamped = document.documentElement.dataset.theme;
		if (stamped === 'athletos' || stamped === 'solarized') theme = stamped;
	});

	function toggle() {
		theme = theme === 'athletos' ? 'solarized' : 'athletos';

		document.documentElement.dataset.theme = theme;
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SURFACES[theme]);

		try {
			localStorage.setItem('athletos:theme', theme);
		} catch {
			// The theme still changed; it just will not survive a reload.
		}
	}
</script>

<button
	class="btn btn-ghost btn-sm"
	type="button"
	onclick={toggle}
	aria-label={theme === 'athletos' ? 'Switch to the light theme' : 'Switch to the dark theme'}
>
	{#if theme === 'athletos'}
		<!-- Sun: what tapping this gets you, not what you are in. A control
		     labelled with its current state is a control nobody can predict. -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="size-5">
			<circle cx="12" cy="12" r="4" />
			<path
				stroke-linecap="round"
				d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
			/>
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="size-5">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
			/>
		</svg>
	{/if}
</button>
