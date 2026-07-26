<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<!--
	The root layout deliberately has no `+layout.server.ts`.

	`/session` — the offline logger — is prerendered so that the service worker
	can serve it with no network at all, and a server load anywhere above it
	would need cookies at build time. Everything that needs a session lives
	under the `(app)` group, which has its own server layout.
-->
<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{@render children()}
