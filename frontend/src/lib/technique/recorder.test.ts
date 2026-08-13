import { describe, expect, it, vi } from 'vitest';
import {
	chooseRecorderMimeType,
	createBrowserRecorder,
	type RecorderEnvironment,
	type WakeLockSentinelPort
} from './recorder';

const constraints = {
	audio: false,
	video: {
		facingMode: { ideal: 'environment' },
		width: { ideal: 1280 },
		height: { ideal: 720 },
		frameRate: { ideal: 30 }
	}
};

type Listener = () => void;

function fakeTrack(settings = { width: 1280, height: 720, frameRate: 30 }) {
	const listeners = new Map<string, Set<Listener>>();
	return {
		stop: vi.fn(),
		getSettings: vi.fn(() => settings),
		addEventListener: vi.fn((type: string, listener: Listener) => {
			const current = listeners.get(type) ?? new Set();
			current.add(listener);
			listeners.set(type, current);
		}),
		removeEventListener: vi.fn((type: string, listener: Listener) => {
			listeners.get(type)?.delete(listener);
		}),
		dispatch(type: string) {
			for (const listener of listeners.get(type) ?? []) listener();
		}
	};
}

function fakeStream(track = fakeTrack(), otherTracks: ReturnType<typeof fakeTrack>[] = []) {
	return {
		track,
		stream: {
			getTracks: () => [track, ...otherTracks],
			getVideoTracks: () => [track]
		} as unknown as MediaStream
	};
}

function recorderHarness(actualMimeType = 'video/webm;codecs=vp8') {
	const instances: FakeMediaRecorder[] = [];

	class FakeMediaRecorder {
		static isTypeSupported = vi.fn((value: string) => value === 'video/webm;codecs=vp8');
		ondataavailable: ((event: BlobEvent) => void) | null = null;
		onerror: ((event: Event) => void) | null = null;
		onstop: (() => void) | null = null;
		state: RecordingState = 'inactive';
		readonly mimeType = actualMimeType;
		readonly options: MediaRecorderOptions | undefined;
		readonly stream: MediaStream;
		readonly start = vi.fn((timeslice?: number) => {
			this.state = 'recording';
			void timeslice;
		});
		readonly stop = vi.fn(() => {
			if (this.state === 'inactive') return;
			this.state = 'inactive';
			this.onstop?.();
		});

		constructor(stream: MediaStream, options?: MediaRecorderOptions) {
			this.stream = stream;
			this.options = options;
			instances.push(this);
		}

		emitData(blob: Blob) {
			this.ondataavailable?.({ data: blob } as BlobEvent);
		}

		emitError() {
			this.onerror?.(new Event('error'));
		}
	}

	return { MediaRecorder: FakeMediaRecorder as unknown as typeof MediaRecorder, instances };
}

function timerHarness() {
	let scheduled: (() => void) | undefined;
	const setTimeout = vi.fn((handler: () => void, timeout: number) => {
		scheduled = handler;
		void timeout;
		return 27 as unknown as ReturnType<typeof globalThis.setTimeout>;
	});
	const clearTimeout = vi.fn((_handle: ReturnType<typeof globalThis.setTimeout>) => undefined);
	return {
		setTimeout,
		clearTimeout,
		fire: () => scheduled?.()
	};
}

function metadataHarness(width = 720, height = 1280) {
	const revokeObjectURL = vi.fn();
	let onloadedmetadata: (() => void) | null = null;
	const video = {
		preload: '',
		videoWidth: width,
		videoHeight: height,
		get onloadedmetadata() {
			return onloadedmetadata;
		},
		set onloadedmetadata(listener: (() => void) | null) {
			onloadedmetadata = listener;
		},
		onerror: null as (() => void) | null,
		set src(_value: string) {
			queueMicrotask(() => onloadedmetadata?.());
		}
	} as unknown as HTMLVideoElement;

	return {
		createMetadataVideo: vi.fn(() => video),
		createObjectURL: vi.fn(() => 'blob:clip'),
		revokeObjectURL
	};
}

function environment(
	overrides: Partial<RecorderEnvironment> = {},
	actualMimeType = 'video/webm;codecs=vp8'
) {
	const { track, stream } = fakeStream();
	const media = recorderHarness(actualMimeType);
	const timers = timerHarness();
	const metadata = metadataHarness();
	let now = 100;
	const getUserMedia = vi.fn(async () => stream);
	const value: RecorderEnvironment = {
		isSecureContext: true,
		mediaDevices: { getUserMedia } as unknown as MediaDevices,
		MediaRecorder: media.MediaRecorder,
		setTimeout: timers.setTimeout,
		clearTimeout: timers.clearTimeout,
		performance: { now: () => now } as Performance,
		...metadata,
		...overrides
	};
	return {
		value,
		track,
		stream,
		getUserMedia,
		instances: media.instances,
		timers,
		metadata,
		setNow: (value: number) => {
			now = value;
		}
	};
}

async function previewAndStart(harness: ReturnType<typeof environment>) {
	const preview = {
		play: vi.fn(async () => undefined),
		srcObject: null
	} as unknown as HTMLVideoElement;
	const recorder = createBrowserRecorder(harness.value);
	await recorder.requestPreview(preview);
	await recorder.start();
	return { recorder, preview };
}

function wakeLockHarness() {
	const listeners = new Set<Listener>();
	const sentinel: WakeLockSentinelPort = {
		released: false,
		release: vi.fn(async () => {
			sentinel.released = true;
			for (const listener of listeners) listener();
		}),
		addEventListener: vi.fn((_type: 'release', listener: Listener) => listeners.add(listener)),
		removeEventListener: vi.fn((_type: 'release', listener: Listener) => listeners.delete(listener))
	};
	return {
		sentinel,
		request: vi.fn(async () => sentinel),
		unexpectedRelease() {
			sentinel.released = true;
			for (const listener of listeners) listener();
		}
	};
}

function sequencedWakeLocks() {
	const locks: ReturnType<typeof wakeLockHarness>[] = [];
	const request = vi.fn(async () => {
		const lock = wakeLockHarness();
		locks.push(lock);
		return lock.sentinel;
	});
	return { locks, request };
}

function visibilityHarness(initial: DocumentVisibilityState = 'visible') {
	let visibilityState = initial;
	const listeners = new Set<Listener>();
	return {
		value: {
			get visibilityState() {
				return visibilityState;
			},
			addEventListener: vi.fn((_type: 'visibilitychange', listener: Listener) =>
				listeners.add(listener)
			),
			removeEventListener: vi.fn((_type: 'visibilitychange', listener: Listener) =>
				listeners.delete(listener)
			)
		},
		set(next: DocumentVisibilityState) {
			visibilityState = next;
			for (const listener of listeners) listener();
		}
	};
}

describe('chooseRecorderMimeType', () => {
	it('chooses the first actually supported media type', () => {
		const supported = vi.fn((value: string) => value === 'video/webm;codecs=vp8');
		expect(
			chooseRecorderMimeType({ isTypeSupported: supported } as unknown as typeof MediaRecorder)
		).toBe('video/webm;codecs=vp8');
		expect(supported.mock.calls.map(([value]) => value)).toEqual([
			'video/mp4;codecs=avc1.42E01E',
			'video/webm;codecs=vp9',
			'video/webm;codecs=vp8'
		]);
	});

	it('returns undefined when no candidate is supported', () => {
		expect(
			chooseRecorderMimeType({ isTypeSupported: () => false } as unknown as typeof MediaRecorder)
		).toBeUndefined();
	});
});

describe('createBrowserRecorder', () => {
	it('reports unsupported when the context is not secure', () => {
		const recorder = createBrowserRecorder({
			isSecureContext: false,
			mediaDevices: undefined,
			MediaRecorder: undefined,
			setTimeout,
			clearTimeout,
			performance
		});
		expect(recorder.capabilities()).toEqual({
			secure: false,
			camera: false,
			recorder: false,
			supported: false
		});
	});

	it('requests the rear camera and exposes its actual preview settings', async () => {
		const harness = environment();
		const preview = { play: vi.fn(async () => undefined), srcObject: null };
		const recorder = createBrowserRecorder(harness.value);

		await expect(recorder.requestPreview(preview as unknown as HTMLVideoElement)).resolves.toEqual({
			width: 1280,
			height: 720,
			frameRate: 30
		});
		expect(harness.getUserMedia).toHaveBeenCalledWith(constraints);
		expect(preview.srcObject).toBe(harness.stream);
		expect(preview.play).toHaveBeenCalledOnce();
	});

	it('stops every acquired track on dispose even when preview setup fails', async () => {
		const stop = vi.fn();
		const getUserMedia = vi.fn(
			async () =>
				({ getTracks: () => [{ stop }], getVideoTracks: () => [] }) as unknown as MediaStream
		);
		const harness = environment({ mediaDevices: { getUserMedia } as unknown as MediaDevices });
		const recorder = createBrowserRecorder(harness.value);

		await expect(
			recorder.requestPreview({ play: async () => undefined } as HTMLVideoElement)
		).rejects.toThrow();
		await recorder.dispose();
		expect(stop).toHaveBeenCalledOnce();
	});

	it('stops the prior preview stream before requesting a replacement', async () => {
		const first = fakeStream();
		const second = fakeStream();
		const getUserMedia = vi
			.fn<() => Promise<MediaStream>>()
			.mockResolvedValueOnce(first.stream)
			.mockResolvedValueOnce(second.stream);
		const harness = environment({ mediaDevices: { getUserMedia } as unknown as MediaDevices });
		const recorder = createBrowserRecorder(harness.value);
		const preview = {
			play: vi.fn(async () => undefined),
			srcObject: null
		} as unknown as HTMLVideoElement;

		await recorder.requestPreview(preview);
		await recorder.requestPreview(preview);

		expect(first.track.stop).toHaveBeenCalledOnce();
		expect(preview.srcObject).toBe(second.stream);
	});

	it('uses an explicit supported MIME, a one-second timeslice, and the recorder actual MIME', async () => {
		const harness = environment({}, 'video/webm;codecs=vp8;profile=actual');
		const { recorder } = await previewAndStart(harness);
		const instance = harness.instances[0];
		instance.emitData(new Blob(['clip-part']));
		harness.setNow(650);

		const clip = await recorder.stop();

		expect(instance.options).toEqual({ mimeType: 'video/webm;codecs=vp8' });
		expect(instance.start).toHaveBeenCalledWith(1000);
		expect(clip.mimeType).toBe('video/webm;codecs=vp8;profile=actual');
		expect(clip.durationMs).toBe(550);
		expect(clip.blob.size).toBe(9);
		expect(clip).toMatchObject({
			width: 720,
			height: 1280,
			frameRate: 30,
			rotationDegrees: 0
		});
		expect(harness.metadata.createObjectURL).toHaveBeenCalledWith(clip.blob);
		expect(harness.metadata.revokeObjectURL).toHaveBeenCalledWith('blob:clip');
	});

	it('hard-stops after 45 seconds and resolves the same completed clip', async () => {
		const harness = environment();
		const { recorder } = await previewAndStart(harness);
		const instance = harness.instances[0];
		harness.setNow(45_100);

		expect(harness.timers.setTimeout).toHaveBeenCalledWith(expect.any(Function), 45_000);
		harness.timers.fire();
		const clip = await recorder.stop();

		expect(instance.stop).toHaveBeenCalledOnce();
		expect(clip.durationMs).toBe(45_000);
	});

	it.each(['manual stop', 'hard stop', 'track end'] as const)(
		'stops every stream track after %s while preserving the recorded Blob',
		async (termination) => {
			const videoTrack = fakeTrack();
			const auxiliaryTrack = fakeTrack();
			const source = fakeStream(videoTrack, [auxiliaryTrack]);
			const getUserMedia = vi.fn(async () => source.stream);
			const harness = environment({
				mediaDevices: { getUserMedia } as unknown as MediaDevices
			});
			const { recorder } = await previewAndStart(harness);
			harness.instances[0].emitData(new Blob(['reviewable-clip']));

			if (termination === 'hard stop') harness.timers.fire();
			if (termination === 'track end') videoTrack.dispatch('ended');
			const clip = await recorder.stop();

			expect(videoTrack.stop).toHaveBeenCalledOnce();
			expect(auxiliaryTrack.stop).toHaveBeenCalledOnce();
			expect(await clip.blob.text()).toBe('reviewable-clip');
			expect(clip.width).toBe(720);
			expect(clip.height).toBe(1280);
		}
	);

	it('stops recording and releases the wake lock when the video track ends', async () => {
		const wakeLock = wakeLockHarness();
		const harness = environment({ wakeLock: { request: wakeLock.request } });
		await previewAndStart(harness);
		const instance = harness.instances[0];

		harness.track.dispatch('ended');
		await vi.waitFor(() => expect(wakeLock.sentinel.release).toHaveBeenCalledOnce());
		expect(instance.stop).toHaveBeenCalledOnce();
	});

	it('acquires a scoped screen wake lock and releases it on manual stop', async () => {
		const wakeLock = wakeLockHarness();
		const harness = environment({ wakeLock: { request: wakeLock.request } });
		const { recorder } = await previewAndStart(harness);

		expect(wakeLock.request).toHaveBeenCalledWith('screen');
		await recorder.stop();
		expect(wakeLock.sentinel.release).toHaveBeenCalledOnce();
	});

	it('releases the wake lock on hard stop, recorder error, and dispose', async () => {
		for (const end of ['hard-stop', 'error', 'dispose'] as const) {
			const wakeLock = wakeLockHarness();
			const harness = environment({ wakeLock: { request: wakeLock.request } });
			const { recorder } = await previewAndStart(harness);

			if (end === 'hard-stop') harness.timers.fire();
			if (end === 'error') {
				harness.instances[0].emitError();
				await expect(recorder.stop()).rejects.toThrow('MediaRecorder failed');
			}
			if (end === 'dispose') await recorder.dispose();

			await vi.waitFor(() => expect(wakeLock.sentinel.release).toHaveBeenCalledOnce());
		}
	});

	it('continues recording when the wake lock is unavailable or denied', async () => {
		for (const wakeLock of [
			undefined,
			{ request: vi.fn(async () => Promise.reject(new Error('denied'))) }
		]) {
			const harness = environment({ wakeLock });
			const { recorder } = await previewAndStart(harness);
			expect(harness.instances[0].state).toBe('recording');
			await recorder.stop();
		}
	});

	it('reacquires an unexpectedly released wake lock only after the page becomes visible', async () => {
		const wakeLocks = sequencedWakeLocks();
		const visibility = visibilityHarness();
		const harness = environment({
			wakeLock: { request: wakeLocks.request },
			visibility: visibility.value
		} as unknown as Partial<RecorderEnvironment>);
		const { recorder } = await previewAndStart(harness);
		visibility.set('hidden');
		wakeLocks.locks[0].unexpectedRelease();

		await Promise.resolve();
		expect(wakeLocks.request).toHaveBeenCalledOnce();

		visibility.set('visible');
		await vi.waitFor(() => expect(wakeLocks.request).toHaveBeenCalledTimes(2));
		await recorder.stop();
	});

	it.each(['stop', 'dispose'] as const)(
		'never reacquires after an unexpected release followed by %s',
		async (termination) => {
			const wakeLocks = sequencedWakeLocks();
			const visibility = visibilityHarness();
			const harness = environment({
				wakeLock: { request: wakeLocks.request },
				visibility: visibility.value
			} as unknown as Partial<RecorderEnvironment>);
			const { recorder } = await previewAndStart(harness);
			visibility.set('hidden');
			wakeLocks.locks[0].unexpectedRelease();

			if (termination === 'stop') await recorder.stop();
			else await recorder.dispose();
			visibility.set('visible');
			await Promise.resolve();

			expect(wakeLocks.request).toHaveBeenCalledOnce();
		}
	);

	it('does not reacquire when intentional release dispatches a release event', async () => {
		const wakeLocks = sequencedWakeLocks();
		const visibility = visibilityHarness();
		const harness = environment({
			wakeLock: { request: wakeLocks.request },
			visibility: visibility.value
		} as unknown as Partial<RecorderEnvironment>);
		const { recorder } = await previewAndStart(harness);

		await recorder.stop();
		await Promise.resolve();

		expect(wakeLocks.locks[0].sentinel.release).toHaveBeenCalledOnce();
		expect(wakeLocks.request).toHaveBeenCalledOnce();
	});

	it('waits for a pending wake lock request and releases it before dispose resolves', async () => {
		const wakeLock = wakeLockHarness();
		let resolveRequest: ((sentinel: WakeLockSentinelPort) => void) | undefined;
		const request = vi.fn(
			() => new Promise<WakeLockSentinelPort>((resolve) => (resolveRequest = resolve))
		);
		const harness = environment({ wakeLock: { request } });
		const preview = {
			play: vi.fn(async () => undefined),
			srcObject: null
		} as unknown as HTMLVideoElement;
		const recorder = createBrowserRecorder(harness.value);
		await recorder.requestPreview(preview);
		const startPromise = recorder.start();
		const disposePromise = recorder.dispose();
		let disposed = false;
		void disposePromise.then(() => (disposed = true));

		await Promise.resolve();
		await Promise.resolve();
		expect(disposed).toBe(false);

		resolveRequest?.(wakeLock.sentinel);
		await startPromise;
		await disposePromise;
		expect(wakeLock.sentinel.release).toHaveBeenCalledOnce();
	});

	it('shares pending cleanup across concurrent dispose callers', async () => {
		const wakeLock = wakeLockHarness();
		let resolveRequest: ((sentinel: WakeLockSentinelPort) => void) | undefined;
		const request = vi.fn(
			() => new Promise<WakeLockSentinelPort>((resolve) => (resolveRequest = resolve))
		);
		const harness = environment({ wakeLock: { request } });
		const preview = {
			play: vi.fn(async () => undefined),
			srcObject: null
		} as unknown as HTMLVideoElement;
		const recorder = createBrowserRecorder(harness.value);
		await recorder.requestPreview(preview);
		const startPromise = recorder.start();

		const firstDispose = recorder.dispose();
		const secondDispose = recorder.dispose();
		let firstSettled = false;
		let secondSettled = false;
		void firstDispose.then(() => (firstSettled = true));
		void secondDispose.then(() => (secondSettled = true));

		expect(harness.track.stop).toHaveBeenCalledOnce();
		await Promise.resolve();
		await Promise.resolve();
		expect(firstSettled).toBe(false);
		expect(secondSettled).toBe(false);

		resolveRequest?.(wakeLock.sentinel);
		await startPromise;
		await Promise.all([firstDispose, secondDispose]);
		expect(wakeLock.sentinel.release).toHaveBeenCalledOnce();
	});

	it('stops tracks, releases resources, and tolerates repeated dispose', async () => {
		const wakeLock = wakeLockHarness();
		const harness = environment({ wakeLock: { request: wakeLock.request } });
		const { recorder } = await previewAndStart(harness);

		await recorder.dispose();
		await expect(recorder.dispose()).resolves.toBeUndefined();

		expect(harness.track.stop).toHaveBeenCalledOnce();
		expect(harness.timers.clearTimeout).toHaveBeenCalled();
		expect(wakeLock.sentinel.release).toHaveBeenCalledOnce();
	});
});
