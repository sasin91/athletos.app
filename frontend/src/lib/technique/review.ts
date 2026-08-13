import type {
	RecorderCapabilities,
	RecorderPort,
	TechniqueReviewIntent,
	TechniqueReviewSnapshot,
	TechniqueReviewState,
	TechniqueTarget
} from './types';

type Clock = { now(): number };
type Subscriber = (snapshot: TechniqueReviewSnapshot) => void;

export type TechniqueReview = {
	snapshot(): TechniqueReviewSnapshot;
	subscribe(subscriber: Subscriber): () => void;
	send(intent: TechniqueReviewIntent): Promise<void>;
	dispose(): Promise<void>;
};

function unsupportedReason(capabilities: RecorderCapabilities): string | null {
	if (!capabilities.secure) return 'Camera capture requires a secure connection.';
	if (!capabilities.camera) return 'This browser cannot access the camera.';
	if (!capabilities.recorder) return 'This browser cannot record video.';
	if (!capabilities.supported) return 'Camera recording is not supported on this device.';
	return null;
}

function errorName(error: unknown): string | null {
	return typeof error === 'object' &&
		error !== null &&
		'name' in error &&
		typeof error.name === 'string'
		? error.name
		: null;
}

function cameraError(error: unknown): TechniqueReviewState {
	if (errorName(error) === 'NotAllowedError') {
		return { phase: 'permission', error: 'Camera permission was denied.' };
	}

	return { phase: 'failure', stage: 'camera', message: 'Camera preview could not be started.' };
}

export function createTechniqueReview(
	_target: TechniqueTarget,
	recorder: RecorderPort,
	clock: Clock
): TechniqueReview {
	let state: TechniqueReviewState = { phase: 'checking' };
	let url: string | null = null;
	let recorderDisposed = false;
	let serial = Promise.resolve();
	const subscribers = new Set<Subscriber>();

	function publish(next: TechniqueReviewState): void {
		state = next;
		for (const subscriber of subscribers) subscriber(state);
	}

	function revokeReviewUrl(): void {
		if (url === null) return;
		URL.revokeObjectURL(url);
		url = null;
	}

	async function disposeRecorder(): Promise<void> {
		if (recorderDisposed) return;
		recorderDisposed = true;
		try {
			await recorder.dispose();
		} catch {
			// Closing the review must remain safe if a browser cleanup races its own teardown.
		}
	}

	async function requestPreview(video?: HTMLVideoElement): Promise<void> {
		let reason: string | null;
		try {
			reason = unsupportedReason(recorder.capabilities());
		} catch (error) {
			publish(cameraError(error));
			return;
		}

		if (reason !== null) {
			publish({ phase: 'unsupported', reason });
			return;
		}

		try {
			const settings = await recorder.requestPreview(video as HTMLVideoElement);
			publish({ phase: 'preview', settings });
		} catch (error) {
			publish(cameraError(error));
		}
	}

	async function handle(intent: TechniqueReviewIntent): Promise<void> {
		if (state.phase === 'closed') return;

		switch (intent.type) {
			case 'request-camera':
				if (
					state.phase === 'checking' ||
					state.phase === 'permission' ||
					state.phase === 'failure'
				) {
					await requestPreview(intent.video);
				}
				return;
			case 'start-countdown':
				if (state.phase === 'preview') publish({ phase: 'countdown', remaining: 3 });
				return;
			case 'countdown-tick':
				if (state.phase === 'countdown')
					publish({ phase: 'countdown', remaining: intent.remaining });
				return;
			case 'countdown-finished':
				if (state.phase !== 'countdown') return;
				try {
					await recorder.start();
					publish({ phase: 'recording', startedAt: clock.now() });
				} catch {
					publish({
						phase: 'failure',
						stage: 'recording',
						message: 'Recording could not be started.'
					});
				}
				return;
			case 'stop':
				if (state.phase !== 'recording') return;
				try {
					const clip = await recorder.stop();
					try {
						url = URL.createObjectURL(clip.blob);
						publish({ phase: 'review', clip, url });
					} catch {
						publish({
							phase: 'failure',
							stage: 'review',
							message: 'Recording could not be prepared for review.'
						});
					}
				} catch {
					publish({
						phase: 'failure',
						stage: 'recording',
						message: 'Recording could not be stopped.'
					});
				}
				return;
			case 'record-again':
				if (state.phase !== 'review') return;
				revokeReviewUrl();
				publish({ phase: 'checking' });
				await requestPreview(intent.video);
				return;
			case 'discard':
				revokeReviewUrl();
				await disposeRecorder();
				publish({ phase: 'closed' });
		}
	}

	async function handleSafely(intent: TechniqueReviewIntent): Promise<void> {
		try {
			await handle(intent);
		} catch (error) {
			publish(cameraError(error));
		}
	}

	function enqueue(intent: TechniqueReviewIntent): Promise<void> {
		const run = () => handleSafely(intent);
		serial = serial.then(run, run);
		return serial;
	}

	return {
		snapshot: () => state,
		subscribe(subscriber) {
			subscribers.add(subscriber);
			subscriber(state);
			return () => subscribers.delete(subscriber);
		},
		send(intent) {
			return enqueue(intent);
		},
		dispose() {
			return enqueue({ type: 'discard' });
		}
	};
}
