import { describe, expect, it, vi } from 'vitest';
import {
	createBrowserRecorder,
	type RecorderEnvironment,
	type WakeLockSentinelPort
} from './recorder';
import { createTechniqueReview } from './review';
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
});
