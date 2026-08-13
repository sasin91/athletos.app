import type { CapturedClip, CaptureSettings, RecorderCapabilities, RecorderPort } from './types';

const CANDIDATE_TYPES = [
	'video/mp4;codecs=avc1.42E01E',
	'video/webm;codecs=vp9',
	'video/webm;codecs=vp8',
	'video/webm'
] as const;

const MAX_RECORDING_MS = 45_000;

type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>;

export type WakeLockSentinelPort = {
	released: boolean;
	release(): Promise<void>;
	addEventListener?(type: 'release', listener: () => void): void;
	removeEventListener?(type: 'release', listener: () => void): void;
};

export type RecorderEnvironment = {
	isSecureContext: boolean;
	mediaDevices: MediaDevices | undefined;
	MediaRecorder: typeof MediaRecorder | undefined;
	setTimeout(handler: () => void, timeout: number): TimeoutHandle;
	clearTimeout(handle: TimeoutHandle): void;
	performance: Pick<Performance, 'now'>;
	wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelPort> };
	createMetadataVideo?: () => HTMLVideoElement;
	createObjectURL?: (blob: Blob) => string;
	revokeObjectURL?: (url: string) => void;
};

export function chooseRecorderMimeType(mediaRecorder: typeof MediaRecorder): string | undefined {
	return CANDIDATE_TYPES.find((type) => mediaRecorder.isTypeSupported(type));
}

function browserEnvironment(): RecorderEnvironment {
	const browserNavigator = typeof navigator === 'undefined' ? undefined : navigator;
	return {
		isSecureContext: typeof isSecureContext !== 'undefined' && isSecureContext,
		mediaDevices: browserNavigator?.mediaDevices,
		MediaRecorder: typeof MediaRecorder === 'undefined' ? undefined : MediaRecorder,
		setTimeout: globalThis.setTimeout.bind(globalThis),
		clearTimeout: globalThis.clearTimeout.bind(globalThis),
		performance: globalThis.performance,
		wakeLock: browserNavigator?.wakeLock as
			{ request(type: 'screen'): Promise<WakeLockSentinelPort> } | undefined,
		createMetadataVideo: () => document.createElement('video'),
		createObjectURL: (blob) => URL.createObjectURL(blob),
		revokeObjectURL: (url) => URL.revokeObjectURL(url)
	};
}

async function decodedDimensions(
	blob: Blob,
	environment: RecorderEnvironment
): Promise<{ width: number; height: number }> {
	const createVideo = environment.createMetadataVideo ?? (() => document.createElement('video'));
	const createObjectURL =
		environment.createObjectURL ?? ((value: Blob) => URL.createObjectURL(value));
	const revokeObjectURL =
		environment.revokeObjectURL ?? ((value: string) => URL.revokeObjectURL(value));
	const video = createVideo();
	const url = createObjectURL(blob);

	try {
		return await new Promise((resolve, reject) => {
			video.preload = 'metadata';
			video.onloadedmetadata = () =>
				resolve({ width: video.videoWidth, height: video.videoHeight });
			video.onerror = () => reject(new Error('Unable to decode the recorded clip metadata'));
			video.src = url;
		});
	} finally {
		video.onloadedmetadata = null;
		video.onerror = null;
		revokeObjectURL(url);
	}
}

export function createBrowserRecorder(
	environment: RecorderEnvironment = browserEnvironment()
): RecorderPort {
	let stream: MediaStream | undefined;
	let preview: HTMLVideoElement | undefined;
	let videoTrack: MediaStreamTrack | undefined;
	let mediaRecorder: MediaRecorder | undefined;
	let timer: TimeoutHandle | undefined;
	let startedAt: number | undefined;
	let stoppedAt: number | undefined;
	let wakeLock: WakeLockSentinelPort | undefined;
	let wakeLockRequest: Promise<void> | undefined;
	let wakeLockRelease: Promise<void> | undefined;
	let recordingGeneration = 0;
	let disposed = false;
	let streamCleaned = false;
	let stopStarted = false;
	let chunks: Blob[] = [];
	let frameRate: number | null = null;
	let capturePromise: Promise<CapturedClip> | undefined;
	let resolveCapture: ((clip: CapturedClip) => void) | undefined;
	let rejectCapture: ((error: unknown) => void) | undefined;

	const capabilities = (): RecorderCapabilities => {
		const secure = environment.isSecureContext;
		const camera = typeof environment.mediaDevices?.getUserMedia === 'function';
		const recorder = environment.MediaRecorder !== undefined;
		return { secure, camera, recorder, supported: secure && camera && recorder };
	};

	const clearHardStop = () => {
		if (timer === undefined) return;
		environment.clearTimeout(timer);
		timer = undefined;
	};

	const releaseWakeLock = (): Promise<void> => {
		if (wakeLockRelease) return wakeLockRelease;
		const heldWakeLock = wakeLock;
		wakeLock = undefined;
		if (!heldWakeLock || heldWakeLock.released) return Promise.resolve();
		const release = (async () => {
			try {
				await heldWakeLock.release();
			} catch {
				// Wake Lock is best-effort; browser revocation and release failures are harmless.
			} finally {
				wakeLockRelease = undefined;
			}
		})();
		wakeLockRelease = release;
		return release;
	};

	const acquireWakeLock = async (generation: number) => {
		if (!environment.wakeLock) return;
		try {
			const acquired = await environment.wakeLock.request('screen');
			if (disposed || generation !== recordingGeneration || stopStarted) {
				if (!acquired.released) await acquired.release().catch(() => undefined);
				return;
			}
			wakeLock = acquired;
		} catch {
			// Camera recording remains usable when Wake Lock is absent or permission is denied.
		}
	};

	const endWakeLockScope = async () => {
		await wakeLockRequest;
		await releaseWakeLock();
	};

	const cleanupStream = () => {
		if (streamCleaned) return;
		streamCleaned = true;
		if (videoTrack) videoTrack.removeEventListener('ended', handleTrackEnded);
		for (const track of stream?.getTracks() ?? []) track.stop();
		const currentPreview = preview;
		if (currentPreview && currentPreview.srcObject === stream) currentPreview.srcObject = null;
	};

	const beginStop = async () => {
		if (stopStarted) return endWakeLockScope();
		stopStarted = true;
		recordingGeneration += 1;
		stoppedAt = environment.performance.now();
		clearHardStop();
		if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
		await endWakeLockScope();
	};

	function handleTrackEnded() {
		void beginStop();
	}

	const requestPreview = async (video: HTMLVideoElement): Promise<CaptureSettings> => {
		if (disposed) throw new Error('Recorder has been disposed');
		if (!capabilities().supported || !environment.mediaDevices) {
			throw new Error('Browser camera recording is not supported');
		}
		if (stream) cleanupStream();

		stream = await environment.mediaDevices.getUserMedia({
			audio: false,
			video: {
				facingMode: { ideal: 'environment' },
				width: { ideal: 1280 },
				height: { ideal: 720 },
				frameRate: { ideal: 30 }
			}
		});
		streamCleaned = false;
		preview = video;
		video.srcObject = stream;
		videoTrack = stream.getVideoTracks()[0];
		if (!videoTrack) throw new Error('Camera did not provide a video track');
		videoTrack.addEventListener('ended', handleTrackEnded);
		await video.play();
		const settings = videoTrack.getSettings();
		frameRate = settings.frameRate ?? null;
		return {
			width: settings.width ?? 0,
			height: settings.height ?? 0,
			frameRate
		};
	};

	const start = async () => {
		if (disposed) throw new Error('Recorder has been disposed');
		if (!stream || !videoTrack)
			throw new Error('Camera preview must be requested before recording');
		if (mediaRecorder?.state === 'recording') throw new Error('Recording has already started');
		if (!environment.MediaRecorder) throw new Error('MediaRecorder is not supported');

		const mimeType = chooseRecorderMimeType(environment.MediaRecorder);
		mediaRecorder = mimeType
			? new environment.MediaRecorder(stream, { mimeType })
			: new environment.MediaRecorder(stream);
		chunks = [];
		stopStarted = false;
		stoppedAt = undefined;
		const generation = ++recordingGeneration;
		capturePromise = new Promise<CapturedClip>((resolve, reject) => {
			resolveCapture = resolve;
			rejectCapture = reject;
		});

		mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) chunks.push(event.data);
		};
		mediaRecorder.onerror = (event) => {
			clearHardStop();
			recordingGeneration += 1;
			stopStarted = true;
			void endWakeLockScope();
			cleanupStream();
			const recorderError = 'error' in event ? event.error : undefined;
			rejectCapture?.(recorderError ?? new Error('MediaRecorder failed'));
		};
		mediaRecorder.onstop = () => {
			clearHardStop();
			void endWakeLockScope();
			const durationMs = Math.max(
				0,
				(stoppedAt ?? environment.performance.now()) - (startedAt ?? environment.performance.now())
			);
			const actualMimeType = mediaRecorder?.mimeType ?? '';
			const blob = new Blob(chunks, { type: actualMimeType });
			void decodedDimensions(blob, environment).then(
				({ width, height }) =>
					resolveCapture?.({
						blob,
						mimeType: actualMimeType,
						durationMs,
						width,
						height,
						frameRate,
						rotationDegrees: 0
					}),
				rejectCapture
			);
		};

		startedAt = environment.performance.now();
		mediaRecorder.start(1000);
		timer = environment.setTimeout(() => void beginStop(), MAX_RECORDING_MS);
		const request = acquireWakeLock(generation);
		wakeLockRequest = request;
		try {
			await request;
		} finally {
			if (wakeLockRequest === request) wakeLockRequest = undefined;
		}
	};

	const stop = async (): Promise<CapturedClip> => {
		if (!capturePromise) throw new Error('Recording has not started');
		await beginStop();
		return capturePromise;
	};

	const dispose = async () => {
		if (disposed) return;
		disposed = true;
		recordingGeneration += 1;
		clearHardStop();
		if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
		await endWakeLockScope();
		cleanupStream();
	};

	return { capabilities, requestPreview, start, stop, dispose };
}
