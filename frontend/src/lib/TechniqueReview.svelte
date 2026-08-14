<script lang="ts">
	import { createBrowserBarTracker } from '$lib/technique/bar-decoder';
	import { drawBarOverlay, viewportToSource } from '$lib/technique/bar-overlay';
	import { createBrowserRecorder } from '$lib/technique/recorder';
	import { createTechniqueReview, type TechniqueReview } from '$lib/technique/review';
	import type { TechniqueReviewSnapshot, TechniqueTarget } from '$lib/technique/types';

	let { target, onclose }: { target: TechniqueTarget; onclose: () => void } = $props();

	let review = $state<TechniqueReview | null>(null);
	let snapshot = $state<TechniqueReviewSnapshot>({ phase: 'checking' });
	let previewVideo = $state<HTMLVideoElement>();
	let reviewVideo = $state<HTMLVideoElement>();
	let overlayCanvas = $state<HTMLCanvasElement>();
	let reviewViewport = $state<HTMLDivElement>();
	let recordingNow = $state(0);
	let barPathVisible = $state(true);
	let barOverlayState = $state<'visible' | 'needs-calibration' | 'tracking-lost'>(
		'needs-calibration'
	);
	let calibrationTapPending = false;
	let acceptingIntents = true;
	const showingReview = $derived(
		snapshot.phase === 'review' || snapshot.phase === 'calibrating' || snapshot.phase === 'tracking'
	);

	$effect(() => {
		acceptingIntents = true;
		const active = createTechniqueReview(
			target,
			createBrowserRecorder(),
			createBrowserBarTracker(),
			performance
		);
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

	$effect(() => {
		if (snapshot.phase !== 'calibrating') return;
		calibrationTapPending = false;
		reviewVideo?.pause();
	});

	$effect(() => {
		const video = reviewVideo;
		const canvas = overlayCanvas;
		const viewport = reviewViewport;
		const result =
			snapshot.phase === 'review' && snapshot.bar.kind === 'ready' ? snapshot.bar.result : null;
		const visible = barPathVisible;
		if (!video || !canvas || !viewport || !result || !visible) {
			if (canvas) {
				canvas.width = 0;
				canvas.height = 0;
			}
			barOverlayState = result ? 'visible' : 'needs-calibration';
			return;
		}

		let cancelled = false;
		let callbackId: number | undefined;
		let callbackKind: 'video' | 'animation' | undefined;
		type FrameVideo = HTMLVideoElement & {
			requestVideoFrameCallback?: (callback: () => void) => number;
			cancelVideoFrameCallback?: (id: number) => void;
		};
		const frameVideo = video as FrameVideo;
		const schedule = () => {
			if (cancelled) return;
			if (frameVideo.requestVideoFrameCallback) {
				callbackKind = 'video';
				callbackId = frameVideo.requestVideoFrameCallback(redraw);
			} else {
				callbackKind = 'animation';
				callbackId = requestAnimationFrame(redraw);
			}
		};
		const redraw = () => {
			if (cancelled) return;
			const width = viewport.clientWidth;
			const height = viewport.clientHeight;
			if (width > 0 && height > 0) {
				barOverlayState = drawBarOverlay(
					canvas,
					result,
					video.currentTime * 1000,
					{ width, height },
					{ devicePixelRatio: window.devicePixelRatio, mirrored: false }
				).bar;
			}
			schedule();
		};
		redraw();

		return () => {
			cancelled = true;
			if (callbackId === undefined) return;
			if (callbackKind === 'video') frameVideo.cancelVideoFrameCallback?.(callbackId);
			else cancelAnimationFrame(callbackId);
		};
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

	function sendBarIntent(
		type: 'start-bar-calibration' | 'cancel-bar-calibration' | 'recalibrate-bar'
	) {
		if (!acceptingIntents || !review) return;
		if (type === 'start-bar-calibration' || type === 'recalibrate-bar') reviewVideo?.pause();
		void review.send({ type });
	}

	function calibrateBar(event: PointerEvent) {
		if (
			calibrationTapPending ||
			!acceptingIntents ||
			!review ||
			!reviewVideo ||
			!reviewViewport ||
			snapshot.phase !== 'calibrating'
		)
			return;
		const bounds = reviewViewport.getBoundingClientRect();
		const point = viewportToSource(
			{ x: event.clientX - bounds.left, y: event.clientY - bounds.top },
			{
				width: reviewVideo.videoWidth || snapshot.clip.width,
				height: reviewVideo.videoHeight || snapshot.clip.height,
				rotationDegrees: snapshot.clip.rotationDegrees,
				mirrored: false
			},
			{ width: bounds.width, height: bounds.height }
		);
		if (!point) return;
		calibrationTapPending = true;
		void review
			.send({
				type: 'calibrate-bar',
				calibration: { mediaTimeMs: reviewVideo.currentTime * 1000, ...point }
			})
			.finally(() => (calibrationTapPending = false));
	}

	function close() {
		if (!acceptingIntents) return;
		acceptingIntents = false;
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
		<section class="relative min-h-0 grow overflow-hidden bg-black" class:hidden={showingReview}>
			<video
				bind:this={previewVideo}
				class="absolute inset-0 size-full object-cover"
				class:opacity-35={snapshot.phase === 'checking' || snapshot.phase === 'permission'}
				muted
				playsinline
				aria-label="Front camera preview"
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

		{#if snapshot.phase === 'review' || snapshot.phase === 'calibrating' || snapshot.phase === 'tracking'}
			<section class="flex min-h-0 grow flex-col gap-3 bg-black p-4">
				<div>
					<p class="text-xs font-semibold tracking-[0.18em] uppercase opacity-60">Raw review</p>
					<p class="text-sm opacity-75">Nothing is saved. Review the clip, then discard it.</p>
				</div>
				<div bind:this={reviewViewport} class="relative min-h-0 grow overflow-hidden bg-black">
					<video
						bind:this={reviewVideo}
						class="absolute inset-0 size-full object-contain"
						src={snapshot.url}
						controls
						muted
						playsinline
						aria-label="Recorded technique clip"
					></video>
					<canvas
						bind:this={overlayCanvas}
						class="pointer-events-none absolute inset-0 size-full"
						aria-hidden="true"
					></canvas>
					{#if snapshot.phase === 'calibrating'}
						<button
							class="absolute inset-x-0 top-0 bottom-12 cursor-crosshair bg-transparent"
							type="button"
							aria-label="Calibrate bar position"
							data-testid="bar-calibration-surface"
							onpointerdown={calibrateBar}
						></button>
					{/if}
				</div>
				{#if snapshot.phase === 'calibrating'}
					<p class="text-sm font-medium" role="status">
						Pause at the top, then tap the visible sleeve or plate center.
					</p>
				{:else if snapshot.phase === 'review' && snapshot.bar.kind === 'ready' && barPathVisible && barOverlayState === 'tracking-lost'}
					<p class="text-sm font-medium text-warning" role="status">
						Tracking lost — recalibrate bar.
					</p>
				{/if}
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
		{:else if snapshot.phase === 'review' && snapshot.bar.kind === 'failure'}
			<p class="alert alert-error" role="alert">{snapshot.bar.message}</p>
		{/if}

		{#if snapshot.phase === 'checking' || snapshot.phase === 'permission'}
			<p class="text-sm opacity-75">
				Allow the front camera to frame one squat set. The clip stays on this device and is
				discarded after review.
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
		{:else if snapshot.phase === 'review' || snapshot.phase === 'calibrating' || snapshot.phase === 'tracking'}
			{#if snapshot.phase === 'review' && snapshot.bar.kind !== 'ready'}
				<button
					class="btn mb-3 w-full btn-secondary"
					type="button"
					onclick={() => sendBarIntent('start-bar-calibration')}
				>
					Track bar
				</button>
			{:else if snapshot.phase === 'review' && snapshot.bar.kind === 'ready'}
				<div class="mb-3 grid grid-cols-2 gap-3">
					<button
						class="btn btn-secondary"
						type="button"
						aria-pressed={barPathVisible}
						onclick={() => (barPathVisible = !barPathVisible)}
					>
						Bar path
					</button>
					<button
						class="btn btn-outline text-current"
						type="button"
						onclick={() => sendBarIntent('recalibrate-bar')}
					>
						Recalibrate bar
					</button>
				</div>
			{:else if snapshot.phase === 'calibrating'}
				<button
					class="btn mb-3 w-full btn-outline text-current"
					type="button"
					onclick={() => sendBarIntent('cancel-bar-calibration')}
				>
					Cancel calibration
				</button>
			{:else if snapshot.phase === 'tracking'}
				<div class="mb-3 space-y-2" aria-live="polite">
					<p class="text-sm font-medium">
						Tracking bar: {snapshot.progress.completed}/{snapshot.progress.total}
					</p>
					<progress
						class="progress w-full progress-secondary"
						value={snapshot.progress.completed}
						max={snapshot.progress.total}
					></progress>
				</div>
			{/if}
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
