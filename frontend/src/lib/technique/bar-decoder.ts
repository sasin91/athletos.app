import { BAR_TRACKER_V1, fixedBarSampleTargets, nearestBarSample } from './bar-path';
import type { BarCalibration, BarPoint, BarSample, BarTrackingResult, GrayCrop } from './bar-path';
import type { CapturedClip } from './types';

const calibrationEdgeMessage = 'Choose a clearer frame with the bar away from the edge.';
const abortMessage = 'Bar tracking aborted.';
const decodeTimeoutMs = 10_000;

export type BarTrackingProgress = { completed: number; total: number; mediaTimeMs: number };

export type BarTrackerPort = {
	track(
		clip: CapturedClip,
		calibration: BarCalibration,
		onProgress: (progress: BarTrackingProgress) => void,
		signal: AbortSignal
	): Promise<BarTrackingResult>;
	dispose(): Promise<void>;
};

export type DecodedBarCrop = Omit<GrayCrop, 'sourceWidth' | 'sourceHeight'> & {
	sourceWidth?: number;
	sourceHeight?: number;
	release?: () => void;
};

export type DecodeDirection = 'calibration' | 'backward' | 'forward';

export type DecodeRequest = {
	direction: DecodeDirection;
	calibration: BarCalibration;
	previous?: BarPoint;
	sourceWidth: number;
	sourceHeight: number;
};

export type BarCropDecoder = ((
	targetMediaTimeMs: number,
	request: DecodeRequest
) => Promise<DecodedBarCrop>) & {
	dispose?: () => Promise<void> | void;
};

export type BarMatcher = {
	calibrate(crop: DecodedBarCrop): Promise<void>;
	step(
		input: DecodedBarCrop & {
			direction: 'backward' | 'forward';
			sourceWidth: number;
			sourceHeight: number;
		}
	): Promise<BarSample>;
	dispose(): Promise<void>;
};

class TrackingLostAtEdge extends Error {
	constructor(readonly mediaTimeMs: number) {
		super('Bar tracking crop crossed the source edge.');
	}
}

function throwIfAborted(signal: AbortSignal) {
	if (signal.aborted) throw new Error(abortMessage);
}

function abortable<T>(work: Promise<T>, signal: AbortSignal) {
	return new Promise<T>((resolve, reject) => {
		const onAbort = () => finish(new Error(abortMessage));
		const finish = (error?: Error, value?: T) => {
			signal.removeEventListener('abort', onAbort);
			if (error) reject(error);
			else resolve(value as T);
		};
		work.then(
			(value) => finish(undefined, value),
			(error: unknown) => finish(error instanceof Error ? error : new Error('Bar matcher failed.'))
		);
		signal.addEventListener('abort', onAbort, { once: true });
		if (signal.aborted) onAbort();
	});
}

function sampleTargets(durationMs: number) {
	const targets = fixedBarSampleTargets(durationMs);
	if (targets.length === 0) throw new Error('Cannot track bar without a positive clip duration.');
	return targets;
}

function distinctSortedSamples(samples: readonly BarSample[]) {
	const sorted = [...samples].sort((left, right) => left.mediaTimeMs - right.mediaTimeMs);
	return sorted.filter(
		(sample, index) => index === 0 || sample.mediaTimeMs !== sorted[index - 1].mediaTimeMs
	);
}

function withSourceDimensions(
	crop: DecodedBarCrop,
	input: Pick<DecodeRequest, 'sourceWidth' | 'sourceHeight'>
) {
	return {
		...crop,
		sourceWidth: crop.sourceWidth ?? input.sourceWidth,
		sourceHeight: crop.sourceHeight ?? input.sourceHeight
	};
}

function releaseCrop(crop: DecodedBarCrop) {
	crop.release?.();
}

/** Pure target ordering and serial matcher orchestration. */
export async function trackDecodedBar(
	input: Pick<CapturedClip, 'durationMs' | 'width' | 'height' | 'rotationDegrees'>,
	calibration: BarCalibration,
	decode: BarCropDecoder,
	matcher: BarMatcher,
	onProgress: (progress: BarTrackingProgress) => void,
	signal: AbortSignal
): Promise<BarTrackingResult> {
	const targets = sampleTargets(input.durationMs);
	const nearest = nearestBarSample(
		targets.map((mediaTimeMs) => ({ mediaTimeMs, point: null })),
		calibration.mediaTimeMs
	);
	if (!nearest) throw new Error('Cannot select a bar calibration target.');

	const calibrationTarget = nearest.mediaTimeMs;
	const earlier = targets.filter((target) => target < calibrationTarget).reverse();
	const later = targets.filter((target) => target > calibrationTarget);
	const samples: BarSample[] = [];
	let completed = 0;

	const decodeOne = async (target: number, request: DecodeRequest) => {
		throwIfAborted(signal);
		const crop = await decode(target, request);
		throwIfAborted(signal);
		completed += 1;
		onProgress({ completed, total: targets.length, mediaTimeMs: crop.mediaTimeMs });
		return withSourceDimensions(crop, request);
	};

	try {
		const calibrationCrop = await decodeOne(calibrationTarget, {
			direction: 'calibration',
			calibration,
			sourceWidth: input.width,
			sourceHeight: input.height
		});
		try {
			throwIfAborted(signal);
			await abortable(matcher.calibrate(calibrationCrop), signal);
		} finally {
			releaseCrop(calibrationCrop);
		}
		samples.push({
			mediaTimeMs: calibrationCrop.mediaTimeMs,
			point: { x: calibration.x, y: calibration.y, confidence: 1 }
		});

		const walk = async (direction: 'backward' | 'forward', directionTargets: readonly number[]) => {
			let previous: BarPoint = { x: calibration.x, y: calibration.y, confidence: 1 };
			for (const target of directionTargets) {
				let crop: ReturnType<typeof withSourceDimensions> | undefined;
				try {
					crop = await decodeOne(target, {
						direction,
						calibration,
						previous,
						sourceWidth: input.width,
						sourceHeight: input.height
					});
					throwIfAborted(signal);
					const sample = await abortable(matcher.step({ ...crop, direction }), signal);
					samples.push(sample);
					if (!sample.point) return;
					previous = sample.point;
				} catch (error) {
					if (error instanceof TrackingLostAtEdge) {
						completed += 1;
						onProgress({ completed, total: targets.length, mediaTimeMs: error.mediaTimeMs });
						samples.push({ mediaTimeMs: error.mediaTimeMs, point: null });
						return;
					}
					throw error;
				} finally {
					if (crop) releaseCrop(crop);
				}
			}
		};

		await walk('backward', earlier);
		await walk('forward', later);
		return {
			schemaVersion: 1,
			sourceWidth: input.width,
			sourceHeight: input.height,
			rotationDegrees: input.rotationDegrees,
			samplingPolicy: { kind: 'fixed', hz: 10 },
			tracker: {
				name: BAR_TRACKER_V1.name,
				version: BAR_TRACKER_V1.version,
				confidenceThreshold: BAR_TRACKER_V1.confidenceThreshold
			},
			calibration: { ...calibration, patchSize: BAR_TRACKER_V1.patchSize },
			samples: distinctSortedSamples(samples)
		};
	} finally {
		await Promise.all([matcher.dispose(), decode.dispose?.()]);
	}
}

type VideoFrameCallbackVideo = HTMLVideoElement & {
	requestVideoFrameCallback?: (callback: () => void) => number;
};

type BrowserEnvironment = {
	createVideo: () => VideoFrameCallbackVideo;
	createCanvas: () => HTMLCanvasElement;
	createWorker: () => Worker;
	createObjectURL: (blob: Blob) => string;
	revokeObjectURL: (url: string) => void;
	yield: () => Promise<void>;
};

function defaultEnvironment(): BrowserEnvironment {
	return {
		createVideo: () => document.createElement('video') as VideoFrameCallbackVideo,
		createCanvas: () => document.createElement('canvas'),
		createWorker: () =>
			new Worker(new URL('./bar-matcher.worker.ts', import.meta.url), { type: 'module' }),
		createObjectURL: (blob) => URL.createObjectURL(blob),
		revokeObjectURL: (url) => URL.revokeObjectURL(url),
		yield: () => new Promise((resolve) => setTimeout(resolve, 0))
	};
}

function waitForEvent(target: EventTarget, event: string, signal: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(
			() => finish(new Error(`Timed out waiting for video ${event}.`)),
			decodeTimeoutMs
		);
		const onEvent = () => finish();
		const onAbort = () => finish(new Error(abortMessage));
		const finish = (error?: Error) => {
			clearTimeout(timeout);
			target.removeEventListener(event, onEvent);
			signal.removeEventListener('abort', onAbort);
			if (error) reject(error);
			else resolve();
		};
		target.addEventListener(event, onEvent, { once: true });
		signal.addEventListener('abort', onAbort, { once: true });
		if (signal.aborted) onAbort();
	});
}

async function waitForPaintedFrame(video: VideoFrameCallbackVideo, signal: AbortSignal) {
	if (video.requestVideoFrameCallback) {
		await new Promise<void>((resolve, reject) => {
			const onAbort = () => finish(new Error(abortMessage));
			const timeout = setTimeout(
				() => finish(new Error('Timed out waiting for a painted video frame.')),
				decodeTimeoutMs
			);
			const finish = (error?: Error) => {
				clearTimeout(timeout);
				signal.removeEventListener('abort', onAbort);
				if (error) reject(error);
				else resolve();
			};
			video.requestVideoFrameCallback?.(() => finish());
			signal.addEventListener('abort', onAbort, { once: true });
			if (signal.aborted) onAbort();
		});
		return;
	}
	await waitForEvent(video, 'seeked', signal);
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
	throwIfAborted(signal);
}

type WorkerRequest =
	| {
			type: 'calibrate';
			gray: Uint8Array;
			width: number;
			height: number;
			config: typeof BAR_TRACKER_V1;
	  }
	| {
			type: 'step';
			requestId: number;
			direction: 'backward' | 'forward';
			mediaTimeMs: number;
			gray: Uint8Array;
			width: number;
			height: number;
			originX: number;
			originY: number;
			sourceWidth: number;
			sourceHeight: number;
	  }
	| { type: 'close' };

type WorkerResponse =
	| { type: 'ready' }
	| { type: 'result'; requestId: number; sample: BarSample }
	| { type: 'error'; requestId: number | null; message: string };

function createWorkerMatcher(worker: Worker): BarMatcher {
	let requestId = 0;
	let disposed = false;
	let started = false;
	let failure: Error | undefined;
	let readyResolve: (() => void) | undefined;
	let readyReject: ((error: Error) => void) | undefined;
	let calibration: { resolve: () => void; reject: (error: Error) => void } | undefined;
	const pending = new Map<
		number,
		{ resolve: (sample: BarSample) => void; reject: (error: Error) => void }
	>();
	const ready = new Promise<void>((resolve, reject) => {
		readyResolve = resolve;
		readyReject = reject;
	});
	worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
		if (data.type === 'ready') {
			if (calibration) {
				calibration.resolve();
				calibration = undefined;
			} else if (!started) {
				started = true;
				readyResolve?.();
			}
			return;
		}
		if (data.type === 'error') {
			if (data.requestId === null) {
				if (calibration) {
					calibration.reject(new Error(data.message));
					calibration = undefined;
				} else readyReject?.(new Error(data.message));
			} else pending.get(data.requestId)?.reject(new Error(data.message));
			pending.delete(data.requestId ?? -1);
			return;
		}
		if (data.type === 'result') {
			pending.get(data.requestId)?.resolve(data.sample);
			pending.delete(data.requestId);
		}
	};
	worker.onerror = () => {
		const error = new Error('Bar matcher worker failed.');
		failure = error;
		readyReject?.(error);
		calibration?.reject(error);
		calibration = undefined;
		for (const request of pending.values()) request.reject(error);
		pending.clear();
	};

	return {
		async calibrate(crop) {
			if (failure) throw failure;
			await ready;
			if (failure) throw failure;
			if (disposed) throw new Error('Bar matcher worker is disposed.');
			if (calibration) throw new Error('Bar matcher calibration is already pending.');
			const settled = new Promise<void>((resolve, reject) => (calibration = { resolve, reject }));
			const message: WorkerRequest = {
				type: 'calibrate',
				gray: crop.gray,
				width: crop.width,
				height: crop.height,
				config: BAR_TRACKER_V1
			};
			worker.postMessage(message, [crop.gray.buffer]);
			return settled;
		},
		async step(crop) {
			if (failure) throw failure;
			await ready;
			if (failure) throw failure;
			if (disposed) throw new Error('Bar matcher worker is disposed.');
			if (calibration) throw new Error('Bar matcher calibration is pending.');
			const id = requestId++;
			const response = new Promise<BarSample>((resolve, reject) =>
				pending.set(id, { resolve, reject })
			);
			const message: WorkerRequest = {
				type: 'step',
				requestId: id,
				direction: crop.direction,
				mediaTimeMs: crop.mediaTimeMs,
				gray: crop.gray,
				width: crop.width,
				height: crop.height,
				originX: crop.originX,
				originY: crop.originY,
				sourceWidth: crop.sourceWidth,
				sourceHeight: crop.sourceHeight
			};
			worker.postMessage(message, [crop.gray.buffer]);
			return response;
		},
		async dispose() {
			if (disposed) return;
			disposed = true;
			readyReject?.(new Error('Bar matcher worker is disposed.'));
			calibration?.reject(new Error('Bar matcher worker is disposed.'));
			calibration = undefined;
			try {
				worker.postMessage({ type: 'close' } satisfies WorkerRequest);
			} finally {
				worker.terminate();
				const error = new Error('Bar matcher worker is disposed.');
				for (const request of pending.values()) request.reject(error);
				pending.clear();
			}
		}
	};
}

function cropBounds(request: DecodeRequest) {
	const size =
		request.direction === 'calibration'
			? BAR_TRACKER_V1.patchSize
			: BAR_TRACKER_V1.patchSize + 2 * BAR_TRACKER_V1.searchRadius;
	const center = request.direction === 'calibration' ? request.calibration : request.previous;
	if (!center) throw new Error('Bar tracking crop requires a previous point.');
	return {
		size,
		left: Math.round(center.x * request.sourceWidth) - size / 2,
		top: Math.round(center.y * request.sourceHeight) - size / 2
	};
}

/** Browser-backed adapter. It owns a metadata video, one bounded canvas, and one worker per track call. */
export function createBrowserBarTracker(
	environment: Partial<BrowserEnvironment> = {}
): BarTrackerPort {
	const browser = { ...defaultEnvironment(), ...environment };
	let activeDispose: (() => Promise<void>) | undefined;
	let disposed = false;

	return {
		async track(clip, calibration, onProgress, signal) {
			if (disposed) throw new Error('Bar tracker is disposed.');
			if (activeDispose) await activeDispose();

			const video = browser.createVideo();
			const canvas = browser.createCanvas();
			const worker = browser.createWorker();
			const matcher = createWorkerMatcher(worker);
			const url = browser.createObjectURL(clip.blob);
			let released = false;
			const cleanup = async () => {
				if (released) return;
				released = true;
				await matcher.dispose();
				video.pause();
				video.removeAttribute('src');
				video.load();
				canvas.width = 0;
				canvas.height = 0;
				browser.revokeObjectURL(url);
				if (activeDispose === cleanup) activeDispose = undefined;
			};
			activeDispose = cleanup;
			video.muted = true;
			video.playsInline = true;
			video.preload = 'metadata';
			video.src = url;

			try {
				await waitForEvent(video, 'loadedmetadata', signal);
				const sourceWidth = video.videoWidth;
				const sourceHeight = video.videoHeight;
				if (sourceWidth <= 0 || sourceHeight <= 0)
					throw new Error('Video metadata did not provide source dimensions.');
				const decode = (async (target, request) => {
					throwIfAborted(signal);
					video.currentTime = target / 1000;
					await waitForPaintedFrame(video, signal);
					throwIfAborted(signal);
					const mediaTimeMs = video.currentTime * 1000;
					const bounds = cropBounds({ ...request, sourceWidth, sourceHeight });
					if (
						bounds.left < 0 ||
						bounds.top < 0 ||
						bounds.left + bounds.size > sourceWidth ||
						bounds.top + bounds.size > sourceHeight
					) {
						if (request.direction === 'calibration') throw new Error(calibrationEdgeMessage);
						throw new TrackingLostAtEdge(mediaTimeMs);
					}
					throwIfAborted(signal);
					canvas.width = bounds.size;
					canvas.height = bounds.size;
					const context = canvas.getContext('2d', { willReadFrequently: true });
					if (!context) throw new Error('Cannot create bar tracking canvas.');
					context.drawImage(
						video,
						bounds.left,
						bounds.top,
						bounds.size,
						bounds.size,
						0,
						0,
						bounds.size,
						bounds.size
					);
					const rgba = context.getImageData(0, 0, bounds.size, bounds.size).data;
					const gray = new Uint8Array(bounds.size * bounds.size);
					for (let index = 0; index < gray.length; index += 1) {
						const rgbaIndex = index * 4;
						gray[index] = Math.round(
							rgba[rgbaIndex] * 0.299 + rgba[rgbaIndex + 1] * 0.587 + rgba[rgbaIndex + 2] * 0.114
						);
					}
					await browser.yield();
					throwIfAborted(signal);
					return {
						mediaTimeMs,
						width: bounds.size,
						height: bounds.size,
						originX: bounds.left,
						originY: bounds.top,
						sourceWidth,
						sourceHeight,
						gray,
						release: () => {
							if (gray.byteLength > 0) gray.fill(0);
						}
					};
				}) as BarCropDecoder;
				decode.dispose = cleanup;
				return await trackDecodedBar(
					{ ...clip, width: sourceWidth, height: sourceHeight },
					calibration,
					decode,
					matcher,
					onProgress,
					signal
				);
			} finally {
				await cleanup();
			}
		},
		async dispose() {
			if (disposed) return;
			disposed = true;
			await activeDispose?.();
		}
	};
}
