import type { BarTrackerPort, BarTrackingProgress } from './bar-decoder';
import { fixedBarSampleTargets } from './bar-path';
import type {
	CapturedClip,
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
	switch (errorName(error)) {
		case 'NotAllowedError':
			return { phase: 'permission', error: 'Camera permission was denied.' };
		case 'NotFoundError':
			return {
				phase: 'failure',
				stage: 'camera',
				message: 'No camera is available on this device.'
			};
		case 'NotReadableError':
			return {
				phase: 'failure',
				stage: 'camera',
				message: 'The camera could not be read. It may already be in use.'
			};
		case 'SecurityError':
			return {
				phase: 'failure',
				stage: 'camera',
				message: 'Camera access is blocked by browser security settings.'
			};
	}

	return { phase: 'failure', stage: 'camera', message: 'Camera preview could not be started.' };
}

export function createTechniqueReview(
	_target: TechniqueTarget,
	recorder: RecorderPort,
	barTracker: BarTrackerPort,
	clock: Clock
): TechniqueReview {
	let state: TechniqueReviewState = { phase: 'checking' };
	let url: string | null = null;
	let recorderDisposed = false;
	let barTrackerDisposed = false;
	let serial = Promise.resolve();
	const subscribers = new Set<Subscriber>();
	type ActiveRecording = {
		result: Promise<CapturedClip>;
		settled: boolean;
		manualStopInProgress: boolean;
	};
	let activeRecording: ActiveRecording | null = null;
	type ActiveBarAttempt = {
		controller: AbortController;
		progress: BarTrackingProgress;
	};
	let activeBarAttempt: ActiveBarAttempt | null = null;

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

	async function disposeBarTracker(): Promise<void> {
		if (barTrackerDisposed) return;
		barTrackerDisposed = true;
		try {
			await barTracker.dispose();
		} catch {
			// Closing the review must remain safe if tracking cleanup already finished.
		}
	}

	function cancelBarAttempt(): void {
		const attempt = activeBarAttempt;
		activeBarAttempt = null;
		attempt?.controller.abort();
	}

	function trackingFailureMessage(error: unknown): string {
		if (
			error instanceof Error &&
			error.message === 'Choose a clearer frame with the bar away from the edge.'
		) {
			return error.message;
		}
		return 'Bar tracking failed. Try recalibrating.';
	}

	function startBarTracking(
		clip: CapturedClip,
		reviewUrl: string,
		calibration: Extract<TechniqueReviewIntent, { type: 'calibrate-bar' }>['calibration']
	): void {
		cancelBarAttempt();
		const controller = new AbortController();
		const attempt: ActiveBarAttempt = {
			controller,
			progress: {
				completed: 0,
				total: fixedBarSampleTargets(clip.durationMs).length,
				mediaTimeMs: calibration.mediaTimeMs
			}
		};
		activeBarAttempt = attempt;
		publish({
			phase: 'tracking',
			clip,
			url: reviewUrl,
			progress: attempt.progress
		});

		let tracking: Promise<Awaited<ReturnType<BarTrackerPort['track']>>>;
		try {
			tracking = barTracker.track(
				clip,
				calibration,
				(progress) => {
					if (
						activeBarAttempt !== attempt ||
						attempt.controller.signal.aborted ||
						progress.completed < attempt.progress.completed
					) {
						return;
					}
					attempt.progress = progress;
					publish({ phase: 'tracking', clip, url: reviewUrl, progress });
				},
				controller.signal
			);
		} catch (error) {
			if (activeBarAttempt === attempt) {
				activeBarAttempt = null;
				publish({
					phase: 'review',
					clip,
					url: reviewUrl,
					bar: { kind: 'failure', message: trackingFailureMessage(error) }
				});
			}
			return;
		}

		void tracking.then(
			(result) => {
				if (activeBarAttempt !== attempt || attempt.controller.signal.aborted) return;
				activeBarAttempt = null;
				publish({ phase: 'review', clip, url: reviewUrl, bar: { kind: 'ready', result } });
			},
			(error: unknown) => {
				if (activeBarAttempt !== attempt || attempt.controller.signal.aborted) return;
				activeBarAttempt = null;
				publish({
					phase: 'review',
					clip,
					url: reviewUrl,
					bar: { kind: 'failure', message: trackingFailureMessage(error) }
				});
			}
		);
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

	function completeRecording(
		recording: ActiveRecording,
		clip: Awaited<ActiveRecording['result']>
	): void {
		if (activeRecording !== recording || recording.settled || state.phase === 'closed') return;
		recording.settled = true;
		activeRecording = null;
		try {
			url = URL.createObjectURL(clip.blob);
			publish({ phase: 'review', clip, url, bar: { kind: 'idle' } });
		} catch {
			publish({
				phase: 'failure',
				stage: 'review',
				message: 'Recording could not be prepared for review.'
			});
		}
	}

	function failRecording(recording: ActiveRecording, message: string): void {
		if (activeRecording !== recording || recording.settled || state.phase === 'closed') return;
		recording.settled = true;
		activeRecording = null;
		publish({ phase: 'failure', stage: 'recording', message });
	}

	function observeRecording(recording: ActiveRecording): void {
		void recording.result.then(
			(clip) => completeRecording(recording, clip),
			() => {
				if (!recording.manualStopInProgress) {
					failRecording(recording, 'Recording could not be completed.');
				}
			}
		);
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
					const recording: ActiveRecording = {
						result: recorder.recordingResult(),
						settled: false,
						manualStopInProgress: false
					};
					activeRecording = recording;
					publish({ phase: 'recording', startedAt: clock.now() });
					observeRecording(recording);
				} catch {
					publish({
						phase: 'failure',
						stage: 'recording',
						message: 'Recording could not be started.'
					});
				}
				return;
			case 'stop':
				if (state.phase !== 'recording' || !activeRecording) return;
				{
					const recording = activeRecording;
					recording.manualStopInProgress = true;
					try {
						const clip = await recorder.stop();
						completeRecording(recording, clip);
					} catch {
						failRecording(recording, 'Recording could not be stopped.');
					}
				}
				return;
			case 'record-again':
				if (state.phase !== 'review' && state.phase !== 'calibrating' && state.phase !== 'tracking')
					return;
				cancelBarAttempt();
				revokeReviewUrl();
				publish({ phase: 'checking' });
				await requestPreview(intent.video);
				return;
			case 'start-bar-calibration':
				if (state.phase !== 'review') return;
				publish({ phase: 'calibrating', clip: state.clip, url: state.url });
				return;
			case 'calibrate-bar':
				if (state.phase !== 'calibrating') return;
				startBarTracking(state.clip, state.url, intent.calibration);
				return;
			case 'cancel-bar-calibration':
				if (state.phase !== 'calibrating') return;
				publish({ phase: 'review', clip: state.clip, url: state.url, bar: { kind: 'idle' } });
				return;
			case 'recalibrate-bar':
				if (state.phase !== 'review' && state.phase !== 'calibrating' && state.phase !== 'tracking')
					return;
				{
					const { clip, url: reviewUrl } = state;
					cancelBarAttempt();
					publish({ phase: 'calibrating', clip, url: reviewUrl });
				}
				return;
			case 'discard':
				if (activeRecording) activeRecording.settled = true;
				activeRecording = null;
				cancelBarAttempt();
				revokeReviewUrl();
				await Promise.all([disposeRecorder(), disposeBarTracker()]);
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
