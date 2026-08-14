import { describe, expect, it } from 'vitest';
import {
	BAR_TRACKER_V1,
	createBarTemplate,
	fixedBarSampleTargets,
	matchBarCrop,
	nearestBarSample,
	trackBarFrames
} from './bar-path';

function frame(mediaTimeMs: number, dotX: number | null): {
	mediaTimeMs: number;
	width: number;
	height: number;
	gray: Uint8Array;
} {
	const width = 96;
	const height = 48;
	const gray = new Uint8Array(width * height).fill(24);
	if (dotX !== null) {
		for (let y = 20; y < 28; y += 1) {
			for (let x = dotX - 4; x < dotX + 4; x += 1) gray[y * width + x] = 230;
		}
	}
	return { mediaTimeMs, width, height, gray };
}

function doubleDotFrame(mediaTimeMs: number, firstDotX: number, secondDotX: number) {
	const result = frame(mediaTimeMs, null);
	for (const dotX of [firstDotX, secondDotX]) {
		for (let y = 20; y < 28; y += 1) {
			for (let x = dotX - 4; x < dotX + 4; x += 1) result.gray[y * result.width + x] = 230;
		}
	}
	return result;
}

const pattern = [
	[30, 34, 42, 50, 50, 42, 34, 30],
	[34, 48, 70, 94, 94, 70, 48, 34],
	[42, 70, 115, 160, 160, 115, 70, 42],
	[50, 94, 160, 230, 230, 160, 94, 50],
	[50, 94, 160, 230, 230, 160, 94, 50],
	[42, 70, 115, 160, 160, 115, 70, 42],
	[34, 48, 70, 94, 94, 70, 48, 34],
	[30, 34, 42, 50, 50, 42, 34, 30]
];

function patternedFrame(mediaTimeMs: number, centers: number[]) {
	const result = frame(mediaTimeMs, null);
	for (const centerX of centers) {
		for (let y = 0; y < pattern.length; y += 1) {
			for (let x = 0; x < pattern[y].length; x += 1) {
				result.gray[(20 + y) * result.width + centerX - 4 + x] = pattern[y][x];
			}
		}
	}
	return result;
}

function crop(source: ReturnType<typeof frame>, originX: number, originY: number, width: number, height: number) {
	const gray = new Uint8Array(width * height);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) gray[y * width + x] = source.gray[(originY + y) * source.width + originX + x];
	}
	return {
		mediaTimeMs: source.mediaTimeMs,
		width,
		height,
		gray,
		originX,
		originY,
		sourceWidth: source.width,
		sourceHeight: source.height
	};
}

const trackerConfig = {
	...BAR_TRACKER_V1,
	patchSize: 8,
	searchRadius: 8,
	coarseStep: 2,
	refineRadius: 2
};

describe('fixedBarSampleTargets', () => {
	it('targets 10 Hz without including a target at or beyond duration', () => {
		expect(fixedBarSampleTargets(340)).toEqual([0, 100, 200, 300]);
	});
});

it('tracks independently backward and forward from one calibration', () => {
	const result = trackBarFrames(
		[frame(0, 36), frame(100, 38), frame(200, 40)],
		{ mediaTimeMs: 100, x: 38 / 96, y: 24 / 48 },
		trackerConfig
	);
	expect(result.samples.map((sample) => sample.mediaTimeMs)).toEqual([0, 100, 200]);
	expect(result.samples[0].point?.x).toBeCloseTo(36 / 96, 2);
	expect(result.samples[2].point?.x).toBeCloseTo(40 / 96, 2);
});

it('stores the rejected timestamp and fabricates no later samples after loss', () => {
	const result = trackBarFrames(
		[frame(0, 36), frame(100, 38), frame(200, null), frame(300, 42)],
		{ mediaTimeMs: 100, x: 38 / 96, y: 24 / 48 },
		trackerConfig
	);
	expect(result.samples.find((sample) => sample.mediaTimeMs === 200)?.point).toBeNull();
	expect(result.samples.some((sample) => sample.mediaTimeMs === 300)).toBe(false);
});

it('selects the closest actual timestamp and resolves equal distance toward the later sample', () => {
	const samples = [
		{ mediaTimeMs: 0, point: null },
		{ mediaTimeMs: 105, point: null },
		{ mediaTimeMs: 310, point: null }
	];
	expect(nearestBarSample(samples, 200)?.mediaTimeMs).toBe(105);
	expect(nearestBarSample(samples, 207.5)?.mediaTimeMs).toBe(310);
});

it('rejects calibration too close to any source edge', () => {
	const source = frame(100, 4);
	expect(() =>
		createBarTemplate(
			{ ...source, originX: 0, originY: 0, sourceWidth: source.width, sourceHeight: source.height },
			{ mediaTimeMs: 100, x: 4 / 96, y: 24 / 48 },
			trackerConfig
		)
	).toThrow('Choose a clearer frame with the bar away from the edge.');
});

it('rejects equally plausible non-overlapping candidates instead of selecting one', () => {
	const calibration = frame(0, 36);
	const template = createBarTemplate(
		{
			...calibration,
			originX: 0,
			originY: 0,
			sourceWidth: calibration.width,
			sourceHeight: calibration.height
		},
		{ mediaTimeMs: 0, x: 36 / 96, y: 24 / 48 },
		trackerConfig
	);
	const sample = matchBarCrop(
		template,
		{
			...doubleDotFrame(100, 32, 40),
			originX: 0,
			originY: 0,
			sourceWidth: 96,
			sourceHeight: 48
		},
		{ x: 36 / 96, y: 24 / 48 },
		trackerConfig
	);
	expect(sample).toEqual({ mediaTimeMs: 100, point: null });
});

it('does not refine a coarse boundary candidate beyond the configured search radius', () => {
	const calibration = patternedFrame(0, [48]);
	const template = createBarTemplate(
		{ ...calibration, originX: 0, originY: 0, sourceWidth: 96, sourceHeight: 48 },
		{ mediaTimeMs: 0, x: 48 / 96, y: 24 / 48 },
		{ ...trackerConfig, searchRadius: 4, coarseStep: 4, refineRadius: 2, confidenceThreshold: 0.75 }
	);
	const sample = matchBarCrop(
		template,
		{ ...patternedFrame(100, [54]), originX: 0, originY: 0, sourceWidth: 96, sourceHeight: 48 },
		{ x: 48 / 96, y: 24 / 48 },
		{ ...trackerConfig, searchRadius: 4, coarseStep: 4, refineRadius: 2, confidenceThreshold: 0.75 }
	);
	expect(sample).toEqual({ mediaTimeMs: 100, point: null });
});

it('rejects off-grid ambiguous candidates after pixel refinement', () => {
	const calibration = patternedFrame(0, [36]);
	const template = createBarTemplate(
		{ ...calibration, originX: 0, originY: 0, sourceWidth: 96, sourceHeight: 48 },
		{ mediaTimeMs: 0, x: 36 / 96, y: 24 / 48 },
		{ ...trackerConfig, coarseStep: 8, refineRadius: 3, confidenceThreshold: 0.5 }
	);
	const sample = matchBarCrop(
		template,
		{ ...patternedFrame(100, [33, 42]), originX: 0, originY: 0, sourceWidth: 96, sourceHeight: 48 },
		{ x: 36 / 96, y: 24 / 48 },
		{ ...trackerConfig, coarseStep: 8, refineRadius: 3, confidenceThreshold: 0.5 }
	);
	expect(sample).toEqual({ mediaTimeMs: 100, point: null });
});

it('matches in a bounded crop using normalized source coordinates and rejects a crop-edge template', () => {
	const calibration = patternedFrame(0, [36]);
	const template = createBarTemplate(crop(calibration, 20, 10, 40, 28), { mediaTimeMs: 0, x: 36 / 96, y: 24 / 48 }, trackerConfig);
	const sample = matchBarCrop(
		template,
		crop(patternedFrame(100, [40]), 20, 10, 40, 28),
		{ x: 36 / 96, y: 24 / 48 },
		trackerConfig
	);
	expect(sample.point?.x).toBeCloseTo(40 / 96, 5);
	expect(sample.point?.y).toBeCloseTo(24 / 48, 5);
	expect(() =>
		createBarTemplate(crop(calibration, 20, 10, 40, 28), { mediaTimeMs: 0, x: 23 / 96, y: 24 / 48 }, trackerConfig)
	).toThrow('Choose a clearer frame with the bar away from the edge.');
});

it('sorts frames and timestamped samples by actual media time', () => {
	const result = trackBarFrames(
		[frame(200, 40), frame(0, 36), frame(100, 38)],
		{ mediaTimeMs: 100, x: 38 / 96, y: 24 / 48 },
		trackerConfig
	);
	expect(result.samples.map((sample) => sample.mediaTimeMs)).toEqual([0, 100, 200]);
});
