<script lang="ts">
	import { fixedSampleTargets, summariseSpike, type SpikeReport } from './spike';

	type WorkerReply =
		| { type: 'result'; mediaTimeMs: number; hasPose: boolean; elapsedMs: number }
		| { type: 'error'; mediaTimeMs: number; name: string; message: string };

	const cameraConstraints: MediaStreamConstraints = {
		audio: false,
		video: {
			facingMode: { ideal: 'environment' },
			width: { ideal: 1280 },
			height: { ideal: 720 },
			frameRate: { ideal: 30 }
		}
	};
	const codecCandidates = [
		'video/mp4;codecs=avc1.42E01E',
		'video/webm;codecs=vp9',
		'video/webm;codecs=vp8'
	];

	let preview = $state<HTMLVideoElement | null>(null);
	let recording = $state<Blob | null>(null);
	let recordingUrl = $state<string | null>(null);
	let stream = $state<MediaStream | null>(null);
	let recordingNow = $state(false);
	let analyzing = $state(false);
	let mediaType = $state<string | null>(null);
	let settings = $state<MediaTrackSettings | null>(null);
	let durationMs = $state(0);
	let requestedMs = $state<number[]>([]);
	let decodedMs = $state<number[]>([]);
	let analysisMs = $state<number[]>([]);
	let framesWithPose = $state(0);
	let framesWithoutPose = $state(0);
	let sha256 = $state({ elapsedMs: 0, digestHexLength: 0 });
	let indexedDb = $state({ wrote: false, readSameBytes: false, elapsedMs: 0 });
	let cleanup = $state({ tracksEnded: false, objectUrlRevoked: false });
	let errors = $state<SpikeReport['errors']>([]);
	let status = $state('Request camera to begin.');

	const capabilities = $derived({
		mediaRecorder: typeof MediaRecorder !== 'undefined',
		camera: !!navigator.mediaDevices?.getUserMedia,
		worker: typeof Worker !== 'undefined',
		createImageBitmap: typeof createImageBitmap !== 'undefined',
		indexedDb: typeof indexedDB !== 'undefined',
		webCryptoSha256: !!crypto.subtle
	});

	function rememberError(stage: string, error: unknown) {
		const reason = error instanceof Error ? error : new Error(String(error));
		errors = [...errors, { stage, name: reason.name, message: reason.message }];
		status = `${stage}: ${reason.message}`;
	}

	function buildReport(): SpikeReport {
		const summary = summariseSpike({ requestedMs, decodedMs, analysisMs });
		return {
			userAgent: navigator.userAgent,
			displayMode: matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
			capabilities,
			mediaType,
			settings,
			blobBytes: recording?.size ?? 0,
			durationMs,
			requestedMs: summary.requestedMs,
			decodedMs: summary.decodedMs,
			analysis: summary.analysis,
			landmarks: { framesWithPose, framesWithoutPose },
			sha256,
			indexedDb,
			cleanup,
			errors
		};
	}

	async function requestCamera() {
		try {
			stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
			settings = stream.getVideoTracks()[0]?.getSettings() ?? null;
			cleanup = { tracksEnded: false, objectUrlRevoked: false };
			status = 'Camera ready.';
		} catch (error) {
			rememberError('request-camera', error);
		}
	}

	function supportedMediaType(): string | undefined {
		return codecCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
	}

	async function record(seconds: number) {
		if (!stream) return;

		try {
			recordingNow = true;
			const chosenType = supportedMediaType();
			const recorder = chosenType
				? new MediaRecorder(stream, { mimeType: chosenType })
				: new MediaRecorder(stream);
			const chunks: BlobPart[] = [];
			const started = performance.now();
			recorder.ondataavailable = ({ data }) => {
				if (data.size > 0) chunks.push(data);
			};
			const stopped = new Promise<void>((resolve, reject) => {
				recorder.onstop = () => resolve();
				recorder.onerror = () => reject(new Error('MediaRecorder failed'));
			});
			recorder.start(1000);
			await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
			recorder.stop();
			await stopped;

			recording = new Blob(chunks, { type: recorder.mimeType });
			mediaType = recorder.mimeType;
			durationMs = performance.now() - started;
			if (recordingUrl) URL.revokeObjectURL(recordingUrl);
			recordingUrl = URL.createObjectURL(recording);
			requestedMs = [];
			decodedMs = [];
			analysisMs = [];
			framesWithPose = 0;
			framesWithoutPose = 0;
			status = `Recorded ${seconds} seconds in ${recorder.mimeType}.`;
		} catch (error) {
			rememberError('record', error);
		} finally {
			recordingNow = false;
		}
	}

	function waitForDecodedFrame(video: HTMLVideoElement): Promise<number> {
		return new Promise((resolve) => {
			video.requestVideoFrameCallback((_now, metadata) => resolve(metadata.mediaTime * 1000));
		});
	}

	function analyzeBitmap(
		worker: Worker,
		bitmap: ImageBitmap,
		mediaTimeMs: number
	): Promise<WorkerReply> {
		return new Promise((resolve, reject) => {
			const onError = () => {
				worker.removeEventListener('message', onMessage);
				reject(new Error('Pose worker failed'));
			};
			const onMessage = ({ data }: MessageEvent<WorkerReply>) => {
				if (data.mediaTimeMs !== mediaTimeMs) return;
				worker.removeEventListener('message', onMessage);
				worker.removeEventListener('error', onError);
				resolve(data);
			};
			worker.addEventListener('message', onMessage);
			worker.addEventListener('error', onError, { once: true });
			try {
				worker.postMessage({ type: 'analyze', bitmap, mediaTimeMs }, [bitmap]);
			} catch (error) {
				worker.removeEventListener('message', onMessage);
				worker.removeEventListener('error', onError);
				bitmap.close();
				reject(error);
			}
		});
	}

	async function analyze() {
		if (!recording) return;

		let source: HTMLVideoElement | null = null;
		let sourceUrl: string | null = null;
		let worker: Worker | null = null;
		try {
			analyzing = true;
			source = document.createElement('video');
			source.muted = true;
			sourceUrl = URL.createObjectURL(recording);
			source.src = sourceUrl;
			await new Promise<void>((resolve, reject) => {
				source!.onloadedmetadata = () => resolve();
				source!.onerror = () => reject(new Error('Recorded video could not be decoded'));
			});
			worker = new Worker(new URL('./spike.worker.ts', import.meta.url), { type: 'module' });
			requestedMs = fixedSampleTargets(Math.min(durationMs, source.duration * 1000));
			decodedMs = [];
			analysisMs = [];
			framesWithPose = 0;
			framesWithoutPose = 0;

			for (const targetMs of requestedMs) {
				source.currentTime = targetMs / 1000;
				const actualMs = await waitForDecodedFrame(source);
				const reply = await analyzeBitmap(worker, await createImageBitmap(source), actualMs);
				decodedMs = [...decodedMs, actualMs];
				if (reply.type === 'error') throw new Error(`${reply.name}: ${reply.message}`);
				analysisMs = [...analysisMs, reply.elapsedMs];
				if (reply.hasPose) framesWithPose += 1;
				else framesWithoutPose += 1;
			}
			status = `Analyzed ${decodedMs.length} decoded frames.`;
		} catch (error) {
			rememberError('analyze', error);
		} finally {
			worker?.terminate();
			if (sourceUrl) URL.revokeObjectURL(sourceUrl);
			analyzing = false;
		}
	}

	async function hashBlob() {
		if (!recording) return;
		try {
			const started = performance.now();
			const digest = await crypto.subtle.digest('SHA-256', await recording.arrayBuffer());
			sha256 = { elapsedMs: performance.now() - started, digestHexLength: digest.byteLength * 2 };
			status = 'SHA-256 measured.';
		} catch (error) {
			rememberError('hash-blob', error);
		}
	}

	function roundTripDatabase(
		blob: Blob
	): Promise<{ wrote: boolean; readSameBytes: boolean; elapsedMs: number }> {
		const started = performance.now();
		return new Promise((resolve, reject) => {
			const request = indexedDB.open('athletos-technique-spike', 1);
			request.onupgradeneeded = () => request.result.createObjectStore('spike');
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const db = request.result;
				const write = db.transaction('spike', 'readwrite');
				write.objectStore('spike').put(blob, 'capture');
				write.onerror = () => reject(write.error);
				write.oncomplete = () => {
					const read = db.transaction('spike', 'readonly').objectStore('spike').get('capture');
					read.onerror = () => reject(read.error);
					read.onsuccess = () => {
						db.close();
						resolve({
							wrote: true,
							readSameBytes: (read.result as Blob | undefined)?.size === blob.size,
							elapsedMs: performance.now() - started
						});
					};
				};
			};
		});
	}

	async function roundTripIndexedDb() {
		if (!recording) return;
		try {
			indexedDb = await roundTripDatabase(recording);
			status = 'IndexedDB round-trip measured.';
		} catch (error) {
			rememberError('indexed-db', error);
		}
	}

	function cleanUp() {
		stream?.getTracks().forEach((track) => track.stop());
		const tracksEnded = stream
			? stream.getTracks().every((track) => track.readyState === 'ended')
			: false;
		const hadRecordingUrl = recordingUrl !== null;
		if (recordingUrl) URL.revokeObjectURL(recordingUrl);
		recordingUrl = null;
		cleanup = { tracksEnded, objectUrlRevoked: hadRecordingUrl };
		status = 'Camera tracks stopped and recording URL revoked.';
	}

	function downloadReport() {
		const report = buildReport();
		const href = URL.createObjectURL(
			new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
		);
		const link = Object.assign(document.createElement('a'), {
			href,
			download: `athletos-technique-spike-${Date.now()}.json`
		});
		link.click();
		URL.revokeObjectURL(href);
	}
</script>

<svelte:head><title>Technique capability spike · AthletOS</title></svelte:head>

<main class="mx-auto max-w-2xl space-y-4 p-4">
	<h1 class="text-xl font-bold">Technique review capability spike</h1>
	<p class="text-sm opacity-70">
		Disposable physical-device probe. The downloaded JSON is the result.
	</p>
	<video
		class="w-full rounded border"
		bind:this={preview}
		src={recordingUrl ?? undefined}
		controls
		playsinline
	>
		<track kind="captions" srclang="en" label="No audio" />
	</video>
	<p role="status">{status}</p>
	<div class="grid gap-2 sm:grid-cols-2">
		<button class="btn" type="button" onclick={requestCamera} disabled={!!stream}
			>Request camera</button
		>
		<button class="btn" type="button" onclick={() => record(10)} disabled={!stream || recordingNow}
			>Record 10 s</button
		>
		<button class="btn" type="button" onclick={() => record(45)} disabled={!stream || recordingNow}
			>Record 45 s</button
		>
		<button class="btn" type="button" onclick={analyze} disabled={!recording || analyzing}
			>Analyze</button
		>
		<button class="btn" type="button" onclick={hashBlob} disabled={!recording}>Hash Blob</button>
		<button class="btn" type="button" onclick={roundTripIndexedDb} disabled={!recording}
			>Round-trip IndexedDB</button
		>
		<button class="btn" type="button" onclick={cleanUp}>Clean up</button>
		<button class="btn btn-primary" type="button" onclick={downloadReport}>Download report</button>
	</div>

	<details>
		<summary>Live report preview</summary>
		<pre class="overflow-auto text-xs">{JSON.stringify(buildReport(), null, 2)}</pre>
	</details>
</main>
