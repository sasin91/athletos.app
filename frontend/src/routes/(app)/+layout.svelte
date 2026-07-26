<script lang="ts">
	import { resolve } from '$app/paths';
	import NavIcon from '$lib/NavIcon.svelte';
	import { page } from '$app/state';
	import { flushPending, queueSummary } from '$lib/submit';

	let { children } = $props();

	let queued = $state(0);
	let rejected = $state(0);
	let flushing = $state(false);

	/**
	 * Retry the queue on launch, and again whenever the phone reconnects (D-09).
	 *
	 * This is the "retries on next launch" half of the offline contract. It is
	 * safe to run as often as it likes: a submission the server already took
	 * comes back 200 with `duplicate: true` and is simply dropped.
	 */
	async function flush() {
		if (flushing) return;
		flushing = true;

		try {
			await flushPending();
			({ queued, rejected } = await queueSummary());
		} finally {
			flushing = false;
		}
	}

	$effect(() => {
		void flush();

		window.addEventListener('online', flush);
		return () => window.removeEventListener('online', flush);
	});

	const nav = [
		{ href: '/', label: 'Train', icon: 'train' },
		{ href: '/programs', label: 'Programs', icon: 'programs' },
		{ href: '/maxes', label: 'Maxes', icon: 'maxes' },
		{ href: '/history', label: 'History', icon: 'history' }
		// `as const` so each `href` keeps its literal type — `resolve()` is
		// typed against the real route table, and a bare `string` is not a route.
	] as const;
</script>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col">
	<header class="flex items-center justify-between gap-2 border-b p-3">
		<a href={resolve('/')} class="text-lg font-bold">AthletOS</a>
		<form method="POST" action="/logout">
			<button class="btn btn-ghost btn-sm" type="submit">Sign out</button>
		</form>
	</header>

	{#if queued > 0}
		<p class="m-3 alert alert-warning" role="status">
			{queued}
			{queued === 1 ? 'session is' : 'sessions are'} waiting to send.
			<button class="btn btn-sm" type="button" onclick={flush} disabled={flushing}>
				Retry now
			</button>
		</p>
	{/if}

	{#if rejected > 0}
		<p class="m-3 alert alert-error" role="alert">
			{rejected}
			{rejected === 1 ? 'session was' : 'sessions were'} refused by the server and will not be retried.
			They are still stored on this device.
		</p>
	{/if}

	<main class="grow p-3">
		{@render children()}
	</main>

	<!--
		Bottom navigation, because the phone is held one-handed and the top of a
		modern screen is not reachable with a thumb (D-10 is about time, but the
		same athlete is holding the same phone).
	-->
	<nav class="safe-bottom sticky bottom-0 z-20 grid grid-cols-4 border-t border-base-300 bg-base-100">
		{#each nav as item (item.href)}
			{@const active = page.url.pathname === item.href}
			<a
				href={resolve(item.href)}
				aria-current={active ? 'page' : undefined}
				class="relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 pt-1
				       transition-colors duration-150"
				class:text-base-content={active}
				class:opacity-45={!active}
			>
				<!--
					A short rule rather than a filled pill. The bar is the chassis of
					the app and should not light up like a button; the athlete needs
					to know where they are, not be congratulated for arriving.
				-->
				{#if active}
					<span
						class="absolute top-0 h-[3px] w-10 rounded-b-full bg-base-content"
						aria-hidden="true"
					></span>
				{/if}

				<NavIcon name={item.icon} />
				<span class="text-[0.6875rem] leading-none font-medium tracking-wide">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>
