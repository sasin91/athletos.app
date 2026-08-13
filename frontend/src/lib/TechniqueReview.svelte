<script lang="ts">
	import { createBrowserRecorder } from '$lib/technique/recorder';
	import { createTechniqueReview, type TechniqueReview } from '$lib/technique/review';
	import type { TechniqueReviewSnapshot, TechniqueTarget } from '$lib/technique/types';

	let { target, onclose }: { target: TechniqueTarget; onclose: () => void } = $props();

	let review = $state<TechniqueReview | null>(null);
	let snapshot = $state<TechniqueReviewSnapshot>({ phase: 'checking' });
	let previewVideo = $state<HTMLVideoElement>();
	let recordingNow = $state(0);
	let acceptingIntents = true;

	$effect(() => {
		acceptingIntents = true;
		const active = createTechniqueReview(target, createBrowserRecorder(), performance);
		review = active;
		const unsubscribe = active.subscribe((next) => (snapshot = next));

		return () => {
			acceptingIntents = false;
			unsubscribe();
			if (review === active) review = null;
			void active.dispose();
		};
	});

	$effect(() => {
		if (snapshot.phase !== 'countdown') return;

		const active = review;
		const remaining = snapshot.remaining;
		const timeout = setTimeout(() => {
			if (!acceptingIntents || review !== active || !active) return;
			void active.send(
				remaining === 1
					? { type: 'countdown-finished' }
					: { type: 'countdown-tick', remaining: (remaining - 1) as 2 | 1 }
			);
		}, 1000);

		return () => clearTimeout(timeout);
	});

	$effect(() => {
		if (snapshot.phase !== 'recording') return;

		recordingNow = performance.now();
		const interval = setInterval(() => (recordingNow = performance.now()), 250);
		return () => clearInterval(interval);
	});

	const elapsedSeconds = $derived(
		snapshot.phase === 'recording'
			? Math.max(0, Math.floor((recordingNow - snapshot.startedAt) / 1000))
			: 0
	);

	function sendCameraIntent(type: 'request-camera' | 'record-again') {
		if (!acceptingIntents || !review || !previewVideo) return;
		void review.send({ type, video: previewVideo });
	}

	function send(type: 'start-countdown' | 'stop') {
		if (!acceptingIntents || !review) return;
		void review.send({ type });
	}

	async function close() {
		if (!acceptingIntents) return;
		acceptingIntents = false;
		const active = review;
		if (active) await active.send({ type: 'discard' });
		onclose();
	}
</script>

<div
	class="fixed inset-0 z-50 flex min-h-dvh flex-col bg-neutral text-neutral-content"
	role="dialog"
	aria-modal="true"
	aria-labelledby="technique-review-title"
>
	<header class="flex items-center gap-3 border-b border-white/15 px-4 py-3">
		<div>
			<p class="text-xs font-semibold tracking-[0.18em] uppercase opacity-60">Squat · side view</p>
			<h1 id="technique-review-title" class="text-lg font-bold">Technique review</h1>
		</div>
		<button class="btn ml-auto btn-ghost text-current" type="button" onclick={close}>Close</button>
	</header>

	<main class="relative flex min-h-0 grow flex-col">
		<section
			class="relative min-h-0 grow overflow-hidden bg-black"
			class:hidden={snapshot.phase === 'review'}
		>
			<video
				bind:this={previewVideo}
				class="absolute inset-0 size-full object-cover"
				class:opacity-35={snapshot.phase === 'checking' || snapshot.phase === 'permission'}
				muted
				playsinline
				aria-label="Rear camera preview"
			></video>

			<div class="pointer-events-none absolute inset-[8%] border border-dashed border-white/70">
				<svg
					class="absolute bottom-[8%] left-[8%] h-[76%] w-[34%] text-white/75"
					viewBox="0 0 120 300"
					fill="none"
					stroke="currentColor"
					stroke-width="7"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="76" cy="30" r="20"></circle>
					<path d="M72 53 53 113l23 58-28 61M55 111l48 24M76 171l29 59M48 232l-22 50M105 230l-2 52"
					></path>
				</svg>
				<span
					class="absolute right-3 bottom-3 bg-black/60 px-2 py-1 text-xs tracking-wide uppercase"
				>
					Fit your full side profile inside the frame
				</span>
			</div>

			{#if snapshot.phase === 'countdown'}
				<div class="absolute inset-0 grid place-items-center bg-black/35" aria-live="assertive">
					<span class="font-mono text-8xl font-black tabular-nums">{snapshot.remaining}</span>
				</div>
			{/if}

			{#if snapshot.phase === 'recording'}
				<div
					class="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/70 px-3 py-2"
				>
					<span class="size-2.5 rounded-full bg-error" aria-hidden="true"></span>
					<span class="font-mono tabular-nums">0:{elapsedSeconds.toString().padStart(2, '0')}</span>
				</div>
			{/if}
		</section>

		{#if snapshot.phase === 'review'}
			<section class="flex min-h-0 grow flex-col gap-3 bg-black p-4">
				<div>
					<p class="text-xs font-semibold tracking-[0.18em] uppercase opacity-60">Raw review</p>
					<p class="text-sm opacity-75">Nothing is saved. Review the clip, then discard it.</p>
				</div>
				<video
					class="min-h-0 grow bg-black object-contain"
					src={snapshot.url}
					controls
					muted
					playsinline
					aria-label="Recorded technique clip"
				></video>
			</section>
		{/if}
	</main>

	<footer class="space-y-3 border-t border-white/15 bg-neutral px-4 py-4">
		{#if snapshot.phase === 'unsupported'}
			<p class="alert alert-error" role="alert">{snapshot.reason}</p>
		{:else if snapshot.phase === 'permission' && snapshot.error}
			<p class="alert alert-error" role="alert">{snapshot.error}</p>
		{:else if snapshot.phase === 'failure'}
			<p class="alert alert-error" role="alert">{snapshot.message}</p>
		{/if}

		{#if snapshot.phase === 'checking' || snapshot.phase === 'permission'}
			<p class="text-sm opacity-75">
				Allow the rear camera to frame one squat set. The clip stays on this device and is discarded
				after review.
			</p>
			<button
				class="btn w-full btn-primary"
				type="button"
				onclick={() => sendCameraIntent('request-camera')}
			>
				Allow camera
			</button>
		{:else if snapshot.phase === 'preview'}
			<div class="flex items-center gap-3">
				<p class="font-medium">Camera ready</p>
				<button
					class="btn ml-auto btn-primary"
					type="button"
					onclick={() => send('start-countdown')}
				>
					Start recording
				</button>
			</div>
		{:else if snapshot.phase === 'countdown'}
			<p class="text-center text-sm font-semibold tracking-wide uppercase" aria-live="polite">
				Recording starts after the countdown
			</p>
		{:else if snapshot.phase === 'recording'}
			<button class="btn w-full btn-error" type="button" onclick={() => send('stop')}>Stop</button>
		{:else if snapshot.phase === 'review'}
			<div class="grid grid-cols-2 gap-3">
				<button
					class="btn btn-outline text-current"
					type="button"
					onclick={() => sendCameraIntent('record-again')}
				>
					Record again
				</button>
				<button class="btn btn-primary" type="button" onclick={close}>Discard</button>
			</div>
		{:else if snapshot.phase === 'failure'}
			<button
				class="btn w-full btn-primary"
				type="button"
				onclick={() => sendCameraIntent('request-camera')}
			>
				Try camera again
			</button>
		{/if}
	</footer>
</div>
