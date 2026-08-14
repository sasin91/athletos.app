import { describe, expect, it, vi } from 'vitest';
import {
	createBrowserRecorder,
	type RecorderEnvironment,
	type WakeLockSentinelPort
} from './recorder';
import { createTechniqueReview } from './review';
import type { BarTrackerPort, BarTrackingProgress } from './bar-decoder';
import type { BarCalibration, BarTrackingResult } from './bar-path';
import type { CapturedClip, CaptureSettings, RecorderCapabilities, RecorderPort } from './types';

function capturedClip(value = 'clip'): CapturedClip {
	return {
		blob: new Blob([value], { type: 'video/webm' }),
		mimeType: 'video/webm',
		durationMs: 9000,
		width: 1280,
		height: 720,
		frameRate: 30,
		rotationDegrees: 0
	};
}

type FakeRecorder = Omit<RecorderPort, 'requestPreview'> & {
	requestPreview: ReturnType<typeof vi.fn<(video: HTMLVideoElement) => Promise<CaptureSettings>>>;
	dispose: ReturnType<typeof vi.fn>;
	recordingResult: () => Promise<CapturedClip>;
	complete(clip?: CapturedClip): void;
	fail(error: Error): void;
};

function fakeRecorder(): FakeRecorder {
	let resolveRecording: ((clip: CapturedClip) => void) | undefined;
	let rejectRecording: ((error: Error) => void) | undefined;
	let result: Promise<CapturedClip> | undefined;
	const recorder = {
		capabilities: () => ({ secure: true, camera: true, recorder: true, supported: true }),
		requestPreview: vi.fn(async () => ({ width: 1280, height: 720, frameRate: 30 })),
		start: vi.fn(async () => {
			result = new Promise<CapturedClip>((resolve, reject) => {
				resolveRecording = resolve;
				rejectRecording = reject;
			});
		}),
		recordingResult: () => {
			if (!result) throw new Error('Recording has not started');
			return result;
		},
		stop: vi.fn(async () => {
			resolveRecording?.(capturedClip());
			return recorder.recordingResult();
		}),
		dispose: vi.fn(async () => undefined),
		complete: (clip = capturedClip()) => resolveRecording?.(clip),
		fail: (error: Error) => rejectRecording?.(error)
	};
	return recorder as FakeRecorder;
}

type TrackingAttempt = {
	clip: CapturedClip;
	calibration: BarCalibration;
	onProgress: (progress: BarTrackingProgress) => void;
	signal: AbortSignal;
	resolve: (result: BarTrackingResult) => void;
	reject: (error: Error) => void;
};

type FakeBarTracker = BarTrackerPort & {
	track: ReturnType<typeof vi.fn<BarTrackerPort['track']>>;
	dispose: ReturnType<typeof vi.fn<BarTrackerPort['dispose']>>;
	attempts: TrackingAttempt[];
};

function barResult(calibration: BarCalibration, markerX = calibration.x): BarTrackingResult {
	return {
		schemaVersion: 1,
		sourceWidth: 1280,
		sourceHeight: 720,
		rotationDegrees: 0,
		samplingPolicy: { kind: 'fixed', hz: 10 },
		tracker: {
			name: 'normalized-cross-correlation',
			version: 1,
			confidenceThreshold: 0.75
		},
		calibration: { ...calibration, patchSize: 32 },
		samples: [
			{
				mediaTimeMs: calibration.mediaTimeMs,
				point: { x: markerX, y: calibration.y, confidence: 1 }
			}
		]
	};
}

function fakeBarTracker(): FakeBarTracker {
	const attempts: TrackingAttempt[] = [];
	const track = vi.fn<BarTrackerPort['track']>(
		(clip, calibration, onProgress, signal) =>
			new Promise<BarTrackingResult>((resolve, reject) => {
				attempts.push({ clip, calibration, onProgress, signal, resolve, reject });
			})
	);
	return {
		track,
		dispose: vi.fn(async () => undefined),
		attempts
	};
}

async function beginRawReview(recorder: FakeRecorder, barTracker: FakeBarTracker) {
	const review = createTechniqueReview(
		{ workoutId: 'w', setPosition: 2, exercise: 'squat' },
		recorder,
		barTracker,
		{ now: () => 1000 }
	);
	await beginRecording(review);
	await review.send({ type: 'stop' });
	return review;
}

async function beginRecording(review: ReturnType<typeof createTechniqueReview>): Promise<void> {
	await review.send({ type: 'request-camera' });
	await review.send({ type: 'start-countdown' });
	await review.send({ type: 'countdown-finished' });
}

describe('createTechniqueReview', () => {
	it('moves through checking, preview, countdown, recording and review', async () => {
		const recorder = fakeRecorder();
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 2, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 1000 }
		);
		await review.send({ type: 'request-camera' });
		expect(review.snapshot().phase).toBe('preview');
		await review.send({ type: 'start-countdown' });
		expect(review.snapshot().phase).toBe('countdown');
		await review.send({ type: 'countdown-finished' });
		expect(review.snapshot().phase).toBe('recording');
		await review.send({ type: 'stop' });
		expect(review.snapshot().phase).toBe('review');
	});

	it('enters review when the recorder hard-stops without a later Stop intent', async () => {
		const recorder = fakeRecorder();
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 2, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 1000 }
		);
		await beginRecording(review);

		recorder.complete(capturedClip('hard-stop'));

		await vi.waitFor(() => expect(review.snapshot().phase).toBe('review'));
		expect(recorder.stop).not.toHaveBeenCalled();
	});

	it('enters a stable recording failure when the recorder ends with an asynchronous error', async () => {
		const recorder = fakeRecorder();
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 2, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 1000 }
		);
		await beginRecording(review);

		recorder.fail(new Error('device disappeared'));

		await vi.waitFor(() =>
			expect(review.snapshot()).toEqual({
				phase: 'failure',
				stage: 'recording',
				message: 'Recording could not be completed.'
			})
		);
		await Promise.resolve();
		expect(review.snapshot().phase).toBe('failure');
	});

	it('settles a manual stop and asynchronous completion only once', async () => {
		const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:review');
		const recorder = fakeRecorder();
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 2, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 1000 }
		);
		await beginRecording(review);

		await review.send({ type: 'stop' });

		expect(review.snapshot().phase).toBe('review');
		expect(createObjectURL).toHaveBeenCalledOnce();
		createObjectURL.mockRestore();
	});

	it('preserves the manual stop failure when stop rejects the shared recording result', async () => {
		const recorder = fakeRecorder();
		recorder.stop = vi.fn(async () => {
			recorder.fail(new Error('stop failed'));
			return recorder.recordingResult();
		});
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 2, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 1000 }
		);
		await beginRecording(review);

		await review.send({ type: 'stop' });

		expect(review.snapshot()).toEqual({
			phase: 'failure',
			stage: 'recording',
			message: 'Recording could not be stopped.'
		});
	});

	it('starts recording and closes without waiting for a pending screen wake lock request', async () => {
		let resolveWakeLock: ((sentinel: WakeLockSentinelPort) => void) | undefined;
		const release = vi.fn(async () => undefined);
		const sentinel: WakeLockSentinelPort = { released: false, release };
		const track = {
			stop: vi.fn(),
			getSettings: () => ({ width: 1280, height: 720, frameRate: 30 }),
			addEventListener: () => undefined,
			removeEventListener: () => undefined
		};
		const stream = {
			getTracks: () => [track],
			getVideoTracks: () => [track]
		} as unknown as MediaStream;
		class MediaRecorderWithPendingWakeLock {
			static isTypeSupported() {
				return true;
			}

			state: RecordingState = 'inactive';
			mimeType = 'video/webm';
			ondataavailable: ((event: BlobEvent) => void) | null = null;
			onerror: ((event: Event) => void) | null = null;
			onstop: (() => void) | null = null;

			start() {
				this.state = 'recording';
			}

			stop() {
				this.state = 'inactive';
			}
		}
		const environment: RecorderEnvironment = {
			isSecureContext: true,
			mediaDevices: { getUserMedia: async () => stream } as unknown as MediaDevices,
			MediaRecorder: MediaRecorderWithPendingWakeLock as unknown as typeof MediaRecorder,
			setTimeout: () => 27 as unknown as ReturnType<typeof setTimeout>,
			clearTimeout: () => undefined,
			performance,
			wakeLock: {
				request: () =>
					new Promise<WakeLockSentinelPort>((resolve) => {
						resolveWakeLock = resolve;
					})
			}
		};
		const recorder = createBrowserRecorder(environment);
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 0, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			performance
		);
		const preview = { play: vi.fn(async () => undefined), srcObject: null };
		await review.send({ type: 'request-camera', video: preview as unknown as HTMLVideoElement });
		await review.send({ type: 'start-countdown' });

		const start = review.send({ type: 'countdown-finished' });
		let started = false;
		void start.then(() => (started = true));
		await vi.waitFor(() => expect(started).toBe(true), { timeout: 100 });
		expect(review.snapshot().phase).toBe('recording');

		const close = review.dispose();
		let closed = false;
		void close.then(() => (closed = true));
		await vi.waitFor(() => expect(closed).toBe(true), { timeout: 100 });
		expect(review.snapshot().phase).toBe('closed');
		expect(track.stop).toHaveBeenCalledOnce();

		resolveWakeLock?.(sentinel);
		await vi.waitFor(() => expect(release).toHaveBeenCalledOnce());
	});

	it('disposes the recorder from failure and review states', async () => {
		const recorder = fakeRecorder();
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 0, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 0 }
		);
		await review.send({ type: 'discard' });
		expect(recorder.dispose).toHaveBeenCalledOnce();
		await review.dispose();
		expect(recorder.dispose).toHaveBeenCalledOnce();
	});

	it('contains capability-check failures and keeps the queue usable for disposal', async () => {
		const recorder = fakeRecorder();
		recorder.capabilities = () => {
			throw new Error('camera capability lookup failed');
		};
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 0, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 0 }
		);

		await expect(review.send({ type: 'request-camera' })).resolves.toBeUndefined();
		expect(review.snapshot()).toEqual({
			phase: 'failure',
			stage: 'camera',
			message: 'Camera preview could not be started.'
		});

		await review.dispose();
		expect(review.snapshot().phase).toBe('closed');
		expect(recorder.dispose).toHaveBeenCalledOnce();
	});

	it.each([
		['NotAllowedError', { phase: 'permission', error: 'Camera permission was denied.' }],
		[
			'NotFoundError',
			{ phase: 'failure', stage: 'camera', message: 'No camera is available on this device.' }
		],
		[
			'NotReadableError',
			{
				phase: 'failure',
				stage: 'camera',
				message: 'The camera could not be read. It may already be in use.'
			}
		],
		[
			'SecurityError',
			{
				phase: 'failure',
				stage: 'camera',
				message: 'Camera access is blocked by browser security settings.'
			}
		]
	] as const)('maps %s to its distinct camera outcome', async (name, expected) => {
		const recorder = fakeRecorder();
		const error = new Error(name);
		Object.defineProperty(error, 'name', { value: name });
		recorder.requestPreview.mockRejectedValueOnce(error);
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 0, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 0 }
		);

		await review.send({ type: 'request-camera' });

		expect(review.snapshot()).toEqual(expected);
	});

	it.each([
		[
			{ secure: false, camera: true, recorder: true, supported: false },
			'Camera capture requires a secure connection.'
		],
		[
			{ secure: true, camera: false, recorder: true, supported: false },
			'This browser cannot access the camera.'
		],
		[
			{ secure: true, camera: true, recorder: false, supported: false },
			'This browser cannot record video.'
		],
		[
			{ secure: true, camera: true, recorder: true, supported: false },
			'Camera recording is not supported on this device.'
		]
	] as const)('preserves the unsupported message for %o', async (capabilities, reason) => {
		const recorder = fakeRecorder();
		recorder.capabilities = () => capabilities as RecorderCapabilities;
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 0, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 0 }
		);

		await review.send({ type: 'request-camera' });

		expect(review.snapshot()).toEqual({ phase: 'unsupported', reason });
	});

	it('revokes each review URL when recording again and discarding', async () => {
		const createObjectURL = vi
			.spyOn(URL, 'createObjectURL')
			.mockReturnValueOnce('blob:first')
			.mockReturnValueOnce('blob:second');
		const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
		const recorder = fakeRecorder();
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 0, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 0 }
		);

		await beginRecording(review);
		await review.send({ type: 'stop' });
		await review.send({ type: 'record-again' });
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:first');
		await review.send({ type: 'start-countdown' });
		await review.send({ type: 'countdown-finished' });
		await review.send({ type: 'stop' });
		await review.send({ type: 'discard' });

		expect(createObjectURL).toHaveBeenCalledTimes(2);
		expect(revokeObjectURL.mock.calls).toEqual([['blob:first'], ['blob:second']]);
		createObjectURL.mockRestore();
		revokeObjectURL.mockRestore();
	});

	it('reports object URL creation failure without attempting revocation', async () => {
		const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
			throw new Error('URL allocation failed');
		});
		const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
		const recorder = fakeRecorder();
		const review = createTechniqueReview(
			{ workoutId: 'w', setPosition: 0, exercise: 'squat' },
			recorder,
			fakeBarTracker(),
			{ now: () => 0 }
		);
		await beginRecording(review);

		await review.send({ type: 'stop' });

		expect(review.snapshot()).toEqual({
			phase: 'failure',
			stage: 'review',
			message: 'Recording could not be prepared for review.'
		});
		expect(revokeObjectURL).not.toHaveBeenCalled();
		createObjectURL.mockRestore();
		revokeObjectURL.mockRestore();
	});

	it('shows raw review before bar tracking is requested', async () => {
		const recorder = fakeRecorder();
		const barTracker = fakeBarTracker();
		const review = await beginRawReview(recorder, barTracker);

		expect(review.snapshot()).toMatchObject({ phase: 'review', bar: { kind: 'idle' } });
		expect(barTracker.track).not.toHaveBeenCalled();
	});

	it('enters calibration without losing the transient clip or URL', async () => {
		const recorder = fakeRecorder();
		const barTracker = fakeBarTracker();
		const review = await beginRawReview(recorder, barTracker);
		const raw = review.snapshot();
		expect(raw.phase).toBe('review');

		await review.send({ type: 'start-bar-calibration' });

		expect(review.snapshot()).toEqual({
			phase: 'calibrating',
			clip: raw.phase === 'review' ? raw.clip : undefined,
			url: raw.phase === 'review' ? raw.url : undefined
		});
	});

	it('publishes monotonic tracking progress and returns the ready result to raw review', async () => {
		const recorder = fakeRecorder();
		const barTracker = fakeBarTracker();
		const review = await beginRawReview(recorder, barTracker);
		const seen: number[] = [];
		review.subscribe((state) => {
			if (state.phase === 'tracking') seen.push(state.progress.completed);
		});
		await review.send({ type: 'start-bar-calibration' });
		const calibration = { mediaTimeMs: 800, x: 0.45, y: 0.4 };

		await review.send({ type: 'calibrate-bar', calibration });
		expect(review.snapshot()).toMatchObject({
			phase: 'tracking',
			progress: { completed: 0, total: 90 }
		});
		barTracker.attempts[0].onProgress({ completed: 2, total: 90, mediaTimeMs: 703 });
		barTracker.attempts[0].onProgress({ completed: 1, total: 90, mediaTimeMs: 603 });
		barTracker.attempts[0].onProgress({ completed: 3, total: 90, mediaTimeMs: 503 });
		barTracker.attempts[0].resolve(barResult(calibration));

		await vi.waitFor(() =>
			expect(review.snapshot()).toMatchObject({
				phase: 'review',
				bar: { kind: 'ready', result: barResult(calibration) }
			})
		);
		expect(seen).toEqual([0, 2, 3]);
	});

	it('returns tracker failure to usable raw review with the calibration edge message intact', async () => {
		const recorder = fakeRecorder();
		const barTracker = fakeBarTracker();
		const review = await beginRawReview(recorder, barTracker);
		await review.send({ type: 'start-bar-calibration' });
		await review.send({
			type: 'calibrate-bar',
			calibration: { mediaTimeMs: 0, x: 0.01, y: 0.5 }
		});

		barTracker.attempts[0].reject(
			new Error('Choose a clearer frame with the bar away from the edge.')
		);

		await vi.waitFor(() =>
			expect(review.snapshot()).toMatchObject({
				phase: 'review',
				bar: {
					kind: 'failure',
					message: 'Choose a clearer frame with the bar away from the edge.'
				}
			})
		);
	});

	it('recalibration aborts and replaces only the current bar attempt', async () => {
		const recorder = fakeRecorder();
		const barTracker = fakeBarTracker();
		const review = await beginRawReview(recorder, barTracker);
		const first = { mediaTimeMs: 100, x: 0.4, y: 0.5 };
		const second = { mediaTimeMs: 200, x: 0.6, y: 0.5 };
		await review.send({ type: 'start-bar-calibration' });
		await review.send({ type: 'calibrate-bar', calibration: first });

		await review.send({ type: 'recalibrate-bar' });
		expect(barTracker.attempts[0].signal.aborted).toBe(true);
		expect(review.snapshot()).toMatchObject({ phase: 'calibrating' });
		await review.send({ type: 'calibrate-bar', calibration: second });
		barTracker.attempts[0].resolve(barResult(first, 0.41));
		barTracker.attempts[1].resolve(barResult(second, 0.61));

		await vi.waitFor(() =>
			expect(review.snapshot()).toMatchObject({
				phase: 'review',
				bar: { kind: 'ready', result: barResult(second, 0.61) }
			})
		);
		expect(recorder.dispose).not.toHaveBeenCalled();
	});

	it('record again aborts active bar work while keeping the tracker reusable', async () => {
		const recorder = fakeRecorder();
		const barTracker = fakeBarTracker();
		const review = await beginRawReview(recorder, barTracker);
		await review.send({ type: 'start-bar-calibration' });
		await review.send({
			type: 'calibrate-bar',
			calibration: { mediaTimeMs: 100, x: 0.5, y: 0.5 }
		});

		await review.send({ type: 'record-again' });

		expect(barTracker.attempts[0].signal.aborted).toBe(true);
		expect(review.snapshot().phase).toBe('preview');
		expect(barTracker.dispose).not.toHaveBeenCalled();
	});

	it.each(['discard', 'dispose'] as const)(
		'%s aborts tracking and disposes recorder and tracker exactly once',
		async (action) => {
			const recorder = fakeRecorder();
			const barTracker = fakeBarTracker();
			const review = await beginRawReview(recorder, barTracker);
			await review.send({ type: 'start-bar-calibration' });
			await review.send({
				type: 'calibrate-bar',
				calibration: { mediaTimeMs: 100, x: 0.5, y: 0.5 }
			});

			if (action === 'discard') await review.send({ type: 'discard' });
			else await review.dispose();
			await review.dispose();

			expect(barTracker.attempts[0].signal.aborted).toBe(true);
			expect(review.snapshot().phase).toBe('closed');
			expect(recorder.dispose).toHaveBeenCalledTimes(1);
			expect(barTracker.dispose).toHaveBeenCalledTimes(1);
		}
	);

	it('ignores a late tracking result after discard without allocating another Blob URL', async () => {
		const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:raw');
		const recorder = fakeRecorder();
		const barTracker = fakeBarTracker();
		const review = await beginRawReview(recorder, barTracker);
		const calibration = { mediaTimeMs: 100, x: 0.5, y: 0.5 };
		await review.send({ type: 'start-bar-calibration' });
		await review.send({ type: 'calibrate-bar', calibration });
		await review.send({ type: 'discard' });

		barTracker.attempts[0].resolve(barResult(calibration));
		await Promise.resolve();
		await Promise.resolve();

		expect(review.snapshot().phase).toBe('closed');
		expect(createObjectURL).toHaveBeenCalledTimes(1);
		createObjectURL.mockRestore();
	});
});
