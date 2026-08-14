import { expect, it, vi } from 'vitest';
import { createBrowserBarTracker, trackDecodedBar } from './bar-decoder';
import type { BarMatcher } from './bar-decoder';

function crop(mediaTimeMs: number) {
	return {
		mediaTimeMs,
		width: 64,
		height: 64,
		originX: 0,
		originY: 0,
		gray: new Uint8Array(64 * 64)
	};
}

function matcher(
	step: BarMatcher['step'] = async ({ mediaTimeMs }) => ({
		mediaTimeMs,
		point: { x: 0.5, y: 0.5, confidence: 0.9 }
	})
) {
	return {
		calibrate: vi.fn(async () => undefined),
		step,
		dispose: vi.fn(async () => undefined)
	};
}

const input = { durationMs: 340, width: 64, height: 64, rotationDegrees: 0 as const };
const calibration = { mediaTimeMs: 200, x: 0.5, y: 0.5 };

it('decodes from calibration backward and forward and preserves actual times', async () => {
	const decode = vi.fn(async (target: number) => crop(target + 3));
	const trackingMatcher = matcher();

	const result = await trackDecodedBar(
		input,
		calibration,
		decode,
		trackingMatcher,
		() => {},
		new AbortController().signal
	);

	expect(decode.mock.calls.map(([time]) => time)).toEqual([200, 100, 0, 300]);
	expect(result.samples.map((sample) => sample.mediaTimeMs)).toEqual([3, 103, 203, 303]);
});

it('stops only the direction whose match is lost', async () => {
	const decode = vi.fn(async (target: number) => crop(target));
	const trackingMatcher = matcher(
		vi.fn(
			async ({
				direction,
				mediaTimeMs
			}: {
				direction: 'backward' | 'forward';
				mediaTimeMs: number;
			}) => ({
				mediaTimeMs,
				point: direction === 'backward' ? null : { x: 0.5, y: 0.5, confidence: 0.9 }
			})
		)
	);

	const result = await trackDecodedBar(
		input,
		calibration,
		decode,
		trackingMatcher,
		() => {},
		new AbortController().signal
	);

	expect(decode.mock.calls.map(([time]) => time)).toEqual([200, 100, 300]);
	expect(result.samples).toContainEqual({ mediaTimeMs: 100, point: null });
	expect(result.samples).toContainEqual({
		mediaTimeMs: 300,
		point: { x: 0.5, y: 0.5, confidence: 0.9 }
	});
});

it('checks abort before every decode and disposes both collaborators once', async () => {
	const controller = new AbortController();
	const decode = vi.fn(async (target: number) => {
		if (target === 100) controller.abort();
		return crop(target);
	});
	const trackingMatcher = matcher();

	await expect(
		trackDecodedBar(input, calibration, decode, trackingMatcher, () => {}, controller.signal)
	).rejects.toThrow('Bar tracking aborted.');

	expect(decode.mock.calls.map(([time]) => time)).toEqual([200, 100]);
	expect(trackingMatcher.dispose).toHaveBeenCalledTimes(1);
});

it('deduplicates equal actual decoded timestamps', async () => {
	const decode = vi.fn(async () => crop(205));
	const trackingMatcher = matcher();

	const result = await trackDecodedBar(
		input,
		calibration,
		decode,
		trackingMatcher,
		() => {},
		new AbortController().signal
	);

	expect(result.samples.map((sample) => sample.mediaTimeMs)).toEqual([205]);
});

it('reports monotonic completed progress using each actual decoded time', async () => {
	const progress: Array<{ completed: number; total: number; mediaTimeMs: number }> = [];
	const decode = vi.fn(async (target: number) => crop(target + 7));

	await trackDecodedBar(
		input,
		calibration,
		decode,
		matcher(),
		(update) => progress.push(update),
		new AbortController().signal
	);

	expect(progress).toEqual([
		{ completed: 1, total: 4, mediaTimeMs: 207 },
		{ completed: 2, total: 4, mediaTimeMs: 107 },
		{ completed: 3, total: 4, mediaTimeMs: 7 },
		{ completed: 4, total: 4, mediaTimeMs: 307 }
	]);
});

it('releases each crop before decoding the next one', async () => {
	let live = 0;
	const decode = vi.fn(async (target: number) => {
		expect(live).toBe(0);
		live += 1;
		return { ...crop(target), release: () => (live -= 1) };
	});

	await trackDecodedBar(
		input,
		calibration,
		decode,
		matcher(),
		() => {},
		new AbortController().signal
	);

	expect(live).toBe(0);
});

it('does not dispatch calibration after an abort during async decode work', async () => {
	const controller = new AbortController();
	let resolveDecode: (() => void) | undefined;
	const decode = vi.fn(async (target: number) => {
		await new Promise<void>((resolve) => (resolveDecode = resolve));
		return crop(target);
	});
	const trackingMatcher = matcher();
	const tracking = trackDecodedBar(
		input,
		calibration,
		decode,
		trackingMatcher,
		() => {},
		controller.signal
	);
	await Promise.resolve();
	controller.abort();
	resolveDecode?.();

	await expect(tracking).rejects.toThrow('Bar tracking aborted.');
	expect(trackingMatcher.calibrate).not.toHaveBeenCalled();
});

class FakeVideo extends EventTarget {
	muted = false;
	playsInline = false;
	preload = '';
	videoWidth = 128;
	videoHeight = 128;
	currentTime = 0;
	pause = vi.fn();
	removeAttribute = vi.fn();
	load = vi.fn();
	requestVideoFrameCallback(callback: () => void) {
		queueMicrotask(callback);
		return 0;
	}
}

class FakeWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;
	posts: Array<{ type: string; [key: string]: unknown }> = [];
	terminated = 0;
	respondToCalibration: 'ready' | 'error' = 'ready';
	respondToSteps = true;
	crashOnCalibration = false;
	postMessage(message: { type: string; [key: string]: unknown }) {
		this.posts.push(message);
		if (message.type === 'calibrate') {
			if (this.crashOnCalibration) {
				this.onerror?.();
				return;
			}
			if (this.respondToCalibration === 'ready') this.emit({ type: 'ready' });
			else this.emit({ type: 'error', requestId: null, message: 'calibration failed' });
		}
		if (message.type === 'step' && this.respondToSteps) {
			this.emit({
				type: 'result',
				requestId: message.requestId,
				sample: { mediaTimeMs: message.mediaTimeMs, point: { x: 0.5, y: 0.5, confidence: 0.9 } }
			});
		}
	}
	terminate() {
		this.terminated += 1;
	}
	emit(data: unknown) {
		this.onmessage?.({ data } as MessageEvent);
	}
}

function browserHarness(yieldWork: () => Promise<void> = () => Promise.resolve()) {
	const video = new FakeVideo();
	const worker = new FakeWorker();
	const canvas = {
		width: 0,
		height: 0,
		getContext: () => ({
			drawImage: () => {},
			getImageData: () => ({ data: new Uint8ClampedArray(canvas.width * canvas.height * 4) })
		})
	};
	return {
		video,
		worker,
		tracker: createBrowserBarTracker({
			createVideo: () => video as never,
			createCanvas: () => canvas as never,
			createWorker: () => worker as never,
			createObjectURL: () => 'blob:bar',
			revokeObjectURL: () => {},
			yield: yieldWork
		})
	};
}

function clip() {
	return {
		blob: new Blob(['bar']),
		mimeType: 'video/webm',
		durationMs: 210,
		width: 128,
		height: 128,
		frameRate: 30,
		rotationDegrees: 0 as const
	};
}

it('hands a 32 by 32 calibration crop to the worker and waits for its ready acknowledgement', async () => {
	const harness = browserHarness();
	const tracking = harness.tracker.track(
		clip(),
		{ mediaTimeMs: 100, x: 0.5, y: 0.5 },
		() => {},
		new AbortController().signal
	);
	harness.worker.emit({ type: 'ready' });
	harness.video.dispatchEvent(new Event('loadedmetadata'));
	await tracking;
	const calibrationMessage = harness.worker.posts.find((message) => message.type === 'calibrate');
	expect(calibrationMessage).toMatchObject({ type: 'calibrate', width: 32, height: 32 });
	expect((calibrationMessage?.gray as Uint8Array).byteLength).toBe(1024);
});

it('propagates a worker calibration error instead of dispatching steps', async () => {
	const harness = browserHarness();
	harness.worker.respondToCalibration = 'error';
	const tracking = harness.tracker.track(
		clip(),
		{ mediaTimeMs: 100, x: 0.5, y: 0.5 },
		() => {},
		new AbortController().signal
	);
	harness.worker.emit({ type: 'ready' });
	harness.video.dispatchEvent(new Event('loadedmetadata'));
	await expect(tracking).rejects.toThrow('calibration failed');
	expect(harness.worker.posts.some((message) => message.type === 'step')).toBe(false);
});

it('rejects an in-flight calibration when the worker crashes after startup', async () => {
	const harness = browserHarness();
	harness.worker.crashOnCalibration = true;
	const tracking = harness.tracker.track(
		clip(),
		{ mediaTimeMs: 100, x: 0.5, y: 0.5 },
		() => {},
		new AbortController().signal
	);
	harness.worker.emit({ type: 'ready' });
	harness.video.dispatchEvent(new Event('loadedmetadata'));
	await expect(tracking).rejects.toThrow('Bar matcher worker failed.');
});

it('rejects a source-edge calibration before handing pixels to the worker', async () => {
	const harness = browserHarness();
	const tracking = harness.tracker.track(
		clip(),
		{ mediaTimeMs: 100, x: 0, y: 0.5 },
		() => {},
		new AbortController().signal
	);
	harness.worker.emit({ type: 'ready' });
	harness.video.dispatchEvent(new Event('loadedmetadata'));
	await expect(tracking).rejects.toThrow('Choose a clearer frame with the bar away from the edge.');
	expect(harness.worker.posts.some((message) => message.type === 'calibrate')).toBe(false);
});

it('does not send a crop to the worker after an abort during the browser yield', async () => {
	let releaseYield: (() => void) | undefined;
	const harness = browserHarness(() => new Promise((resolve) => (releaseYield = resolve)));
	const controller = new AbortController();
	const tracking = harness.tracker.track(
		clip(),
		{ mediaTimeMs: 100, x: 0.5, y: 0.5 },
		() => {},
		controller.signal
	);
	harness.worker.emit({ type: 'ready' });
	harness.video.dispatchEvent(new Event('loadedmetadata'));
	await new Promise((resolve) => setTimeout(resolve, 0));
	controller.abort();
	releaseYield?.();
	await expect(tracking).rejects.toThrow('Bar tracking aborted.');
	expect(harness.worker.posts.some((message) => message.type === 'calibrate')).toBe(false);
});

it('rejects promptly and terminates the worker when aborting pending matcher work', async () => {
	let resolveStep:
		| ((sample: {
				mediaTimeMs: number;
				point: { x: number; y: number; confidence: number };
		  }) => void)
		| undefined;
	const controller = new AbortController();
	const trackingMatcher = matcher(() => new Promise((resolve) => (resolveStep = resolve)));
	const tracking = trackDecodedBar(
		input,
		calibration,
		async (target) => crop(target),
		trackingMatcher,
		() => {},
		controller.signal
	);
	await new Promise((resolve) => setTimeout(resolve, 0));
	controller.abort();
	await expect(
		Promise.race([
			tracking.then(
				() => 'settled',
				() => 'settled'
			),
			new Promise((resolve) => setTimeout(() => resolve('timeout'), 25))
		])
	).resolves.toBe('settled');
	resolveStep?.({ mediaTimeMs: 100, point: { x: 0.5, y: 0.5, confidence: 0.9 } });
	expect(trackingMatcher.dispose).toHaveBeenCalledTimes(1);
});
