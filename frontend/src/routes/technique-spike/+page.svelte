<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		blobsHaveSameBytes,
		canRunSpikeAction,
		createRecordingLifecycle,
		fixedSampleTargets,
		newBlobMeasurements,
		summariseLandmarks,
		summariseSpike,
		type LandmarkFrame,
		type SpikePhase,
		type SpikeReport
	} from './spike';

	type WorkerReply =
		| { type: 'result'; mediaTimeMs: number; frame: LandmarkFrame; elapsedMs: number }
		| { type: 'error'; mediaTimeMs: number; name: string; message: string };
	type ActiveRecording = { attempt: number; cancel: () => void };

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
	let landmarkFrames = $state<LandmarkFrame[]>([]);
	let sha256 = $state<SpikeReport['sha256']>({ elapsedMs: null, digestHexLength: null });
	let indexedDb = $state<SpikeReport['indexedDb']>({
		wrote: false,
		readSameBytes: false,
		elapsedMs: null
	});
	let memory = $state<SpikeReport['memory']>(emptyMemoryObservations());
	let cleanup = $state({ tracksEnded: false, objectUrlRevoked: false });
	let errors = $state<SpikeReport['errors']>([]);
	let status = $state('Request camera to begin.');
	let phase = $state<SpikePhase>('camera');
	const recordingLifecycle = createRecordingLifecycle();
	let activeRecording: ActiveRecording | null = null;

	const capabilities = $derived({
		mediaRecorder: typeof MediaRecorder !== 'undefined',
		camera: !!navigator.mediaDevices?.getUserMedia,
		worker: typeof Worker !== 'undefined',
		createImageBitmap: typeof createImageBitmap !== 'undefined',
		indexedDb: typeof indexedDB !== 'undefined',
		webCryptoSha256: !!crypto.subtle,
		performanceMemory: !!performanceMemory()
	});

	type PerformanceMemory = {
		usedJSHeapSize: number;
		totalJSHeapSize: number;
		jsHeapSizeLimit: number;
	};

	function performanceMemory(): PerformanceMemory | null {
		const candidate = performance as Performance & { memory?: PerformanceMemory };
		return candidate.memory ?? null;
	}

	function emptyMemoryObservations(): SpikeReport['memory'] {
		return performanceMemory()
			? { schemaVersion: 1, availability: 'performance-memory', observations: [] }
			: { schemaVersion: 1, availability: 'unavailable', observations: null };
	}

	function observeMemory(stage: string) {
		const snapshot = performanceMemory();
		if (!snapshot || !memory.observations) return;
		memory = {
			...memory,
			observations: [
				...memory.observations,
				{
					stage,
					timestampMs: performance.now(),
					usedJsHeapSize: snapshot.usedJSHeapSize,
					totalJsHeapSize: snapshot.totalJSHeapSize,
					jsHeapSizeLimit: snapshot.jsHeapSizeLimit
				}
			]
		};
	}

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
			landmarks: summariseLandmarks(landmarkFrames),
			sha256,
			indexedDb,
			memory,
			cleanup,
			errors
		};
	}

	async function requestCamera() {
		if (!canRunSpikeAction(phase, 'requestCamera')) return;
		try {
			stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
			settings = stream.getVideoTracks()[0]?.getSettings() ?? null;
			cleanup = { tracksEnded: false, objectUrlRevoked: false };
			phase = 'record';
			status = 'Camera ready.';
		} catch (error) {
			rememberError('request-camera', error);
		}
	}

	function supportedMediaType(): string | undefined {
		return codecCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
	}

	async function record(seconds: number) {
		if (!canRunSpikeAction(phase, seconds === 10 ? 'record10' : 'record45')) return;
		if (!stream || !stream.active) {
			stream = null;
			phase = 'camera';
			status = 'Camera is no longer active. Request it again.';
			return;
		}

		try {
			const attempt = recordingLifecycle.begin();
			if (attempt === null) return;
			recordingNow = true;
			phase = 'recording';
			resetBlobDerivedMeasurements();
			observeMemory('record-start');
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
			await new Promise<void>((resolve) => {
				const timer = window.setTimeout(resolve, seconds * 1000);
				activeRecording = {
					attempt,
					cancel: () => {
						window.clearTimeout(timer);
						resolve();
						if (recorder.state !== 'inactive') recorder.stop();
					}
				};
			});
			if (!recordingLifecycle.isCurrent(attempt)) return;
			if (recorder.state !== 'inactive') recorder.stop();
			await stopped;
			if (!recordingLifecycle.isCurrent(attempt)) return;

			const blob = new Blob(chunks, { type: recorder.mimeType });
			const url = recordingLifecycle.publish(
				attempt,
				() => URL.createObjectURL(blob),
				(url) => URL.revokeObjectURL(url)
			);
			if (!url) return;
			recording = blob;
			mediaType = recorder.mimeType;
			durationMs = performance.now() - started;
			recordingUrl = url;
			phase = 'analyze';
			observeMemory('record-complete');
			status = `Recorded ${seconds} seconds in ${recorder.mimeType}.`;
		} catch (error) {
			if (!recordingLifecycle.snapshot().disposed) {
				phase = 'record';
				rememberError('record', error);
			}
		} finally {
			if (!recordingLifecycle.snapshot().disposed) recordingNow = false;
			activeRecording = null;
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
		if (!canRunSpikeAction(phase, 'analyze') || !recording) return;

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
			landmarkFrames = [];

			for (const targetMs of requestedMs) {
				source.currentTime = targetMs / 1000;
				const actualMs = await waitForDecodedFrame(source);
				const reply = await analyzeBitmap(worker, await createImageBitmap(source), actualMs);
				decodedMs = [...decodedMs, actualMs];
				if (reply.type === 'error') throw new Error(`${reply.name}: ${reply.message}`);
				analysisMs = [...analysisMs, reply.elapsedMs];
				landmarkFrames = [...landmarkFrames, reply.frame];
			}
			phase = 'hash';
			observeMemory('analysis-complete');
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
		if (!canRunSpikeAction(phase, 'hash') || !recording) return;
		try {
			const started = performance.now();
			const digest = await crypto.subtle.digest('SHA-256', await recording.arrayBuffer());
			sha256 = { elapsedMs: performance.now() - started, digestHexLength: digest.byteLength * 2 };
			phase = 'indexed-db';
			observeMemory('hash-complete');
			status = 'SHA-256 measured.';
		} catch (error) {
			rememberError('hash-blob', error);
		}
	}

	function roundTripDatabase(blob: Blob): Promise<SpikeReport['indexedDb']> {
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
						const stored = read.result;
						void (
							stored instanceof Blob ? blobsHaveSameBytes(stored, blob) : Promise.resolve(false)
						)
							.then((readSameBytes) => {
								db.close();
								resolve({
									wrote: true,
									readSameBytes,
									elapsedMs: performance.now() - started
								});
							})
							.catch((error: unknown) => {
								db.close();
								reject(error);
							});
					};
				};
			};
		});
	}

	async function roundTripIndexedDb() {
		if (!canRunSpikeAction(phase, 'indexedDb') || !recording) return;
		try {
			indexedDb = await roundTripDatabase(recording);
			phase = 'cleanup';
			observeMemory('indexed-db-complete');
			status = 'IndexedDB round-trip measured.';
		} catch (error) {
			rememberError('indexed-db', error);
		}
	}

	function releaseResources() {
		activeRecording?.cancel();
		activeRecording = null;
		const tracks = stream?.getTracks() ?? [];
		tracks.forEach((track) => track.stop());
		const tracksEnded = tracks.length > 0 && tracks.every((track) => track.readyState === 'ended');
		const hadRecordingUrl = recordingLifecycle.release((url) => URL.revokeObjectURL(url));
		recordingUrl = null;
		stream = null;
		return { tracksEnded, objectUrlRevoked: hadRecordingUrl };
	}

	function resetBlobDerivedMeasurements() {
		const fresh = newBlobMeasurements();
		recording = null;
		mediaType = null;
		durationMs = 0;
		requestedMs = fresh.requestedMs;
		decodedMs = fresh.decodedMs;
		analysisMs = fresh.analysisMs;
		landmarkFrames = fresh.landmarkFrames;
		sha256 = fresh.sha256;
		indexedDb = fresh.indexedDb;
		memory = emptyMemoryObservations();
		recordingLifecycle.release((url) => URL.revokeObjectURL(url));
		recordingUrl = null;
	}

	function cleanUp() {
		if (!canRunSpikeAction(phase, 'cleanup')) return;
		cleanup = releaseResources();
		phase = 'download';
		observeMemory('cleanup-complete');
		status = 'Camera tracks stopped and recording URL revoked.';
	}

	function downloadReport() {
		if (!canRunSpikeAction(phase, 'download')) return;
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
		phase = 'finished';
	}

	onDestroy(() => {
		recordingLifecycle.dispose((url) => URL.revokeObjectURL(url));
		releaseResources();
	});
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
		<button
			class="btn"
			type="button"
			onclick={requestCamera}
			disabled={!canRunSpikeAction(phase, 'requestCamera')}>Request camera</button
		>
		<button
			class="btn"
			type="button"
			onclick={() => record(10)}
			disabled={!canRunSpikeAction(phase, 'record10') || recordingNow}>Record 10 s</button
		>
		<button
			class="btn"
			type="button"
			onclick={() => record(45)}
			disabled={!canRunSpikeAction(phase, 'record45') || recordingNow}>Record 45 s</button
		>
		<button
			class="btn"
			type="button"
			onclick={analyze}
			disabled={!canRunSpikeAction(phase, 'analyze') || analyzing}>Analyze</button
		>
		<button
			class="btn"
			type="button"
			onclick={hashBlob}
			disabled={!canRunSpikeAction(phase, 'hash')}>Hash Blob</button
		>
		<button
			class="btn"
			type="button"
			onclick={roundTripIndexedDb}
			disabled={!canRunSpikeAction(phase, 'indexedDb')}>Round-trip IndexedDB</button
		>
		<button
			class="btn"
			type="button"
			onclick={cleanUp}
			disabled={!canRunSpikeAction(phase, 'cleanup')}>Clean up</button
		>
		<button
			class="btn btn-primary"
			type="button"
			onclick={downloadReport}
			disabled={!canRunSpikeAction(phase, 'download')}>Download report</button
		>
	</div>

	<details>
		<summary>Live report preview</summary>
		<pre class="overflow-auto text-xs">{JSON.stringify(buildReport(), null, 2)}</pre>
	</details>
</main>
