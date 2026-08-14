export const BAR_TRACKER_V1 = {
	name: 'normalized-cross-correlation' as const,
	version: 1 as const,
	patchSize: 32,
	searchRadius: 48,
	coarseStep: 4,
	refineRadius: 4,
	confidenceThreshold: 0.75,
	ambiguityMargin: 0.03
};

export type BarCalibration = { mediaTimeMs: number; x: number; y: number };
export type BarPoint = { x: number; y: number; confidence: number };
export type BarSample = { mediaTimeMs: number; point: BarPoint | null };
export type GrayFrame = { mediaTimeMs: number; width: number; height: number; gray: Uint8Array };
export type GrayCrop = GrayFrame & {
	originX: number;
	originY: number;
	sourceWidth: number;
	sourceHeight: number;
};
export type BarTemplate = {
	width: number;
	height: number;
	centered: Float32Array;
	centeredNorm: number;
};

export type BarTrackingResult = {
	schemaVersion: 1;
	sourceWidth: number;
	sourceHeight: number;
	rotationDegrees: 0 | 90 | 180 | 270;
	samplingPolicy: { kind: 'fixed'; hz: 10 };
	tracker: {
		name: typeof BAR_TRACKER_V1.name;
		version: typeof BAR_TRACKER_V1.version;
		confidenceThreshold: number;
	};
	calibration: BarCalibration & { patchSize: number };
	samples: BarSample[];
};

export type BarTrackerConfig = Omit<typeof BAR_TRACKER_V1, 'name' | 'version'>;

type Candidate = { centerX: number; centerY: number; score: number };

const templateMeans = new WeakMap<BarTemplate, number>();
const edgeMessage = 'Choose a clearer frame with the bar away from the edge.';
const zeroNorm = 1e-9;

function resolvedConfig(config?: Partial<BarTrackerConfig>): BarTrackerConfig {
	return { ...BAR_TRACKER_V1, ...config };
}

function patchGeometry(patchSize: number) {
	if (!Number.isInteger(patchSize) || patchSize <= 0 || patchSize % 2 !== 0) {
		throw new Error('Bar tracker patchSize must be a positive even integer.');
	}
	return { half: patchSize / 2, width: patchSize, height: patchSize };
}

function sourceCenter(point: Pick<BarCalibration, 'x' | 'y'>, crop: GrayCrop) {
	return {
		x: Math.round(point.x * crop.sourceWidth),
		y: Math.round(point.y * crop.sourceHeight)
	};
}

function containsPatch(crop: GrayCrop, centerX: number, centerY: number, half: number) {
	const left = centerX - half - crop.originX;
	const top = centerY - half - crop.originY;
	return left >= 0 && top >= 0 && left + half * 2 <= crop.width && top + half * 2 <= crop.height;
}

function withinSearchRadius(
	centerX: number,
	centerY: number,
	prior: { x: number; y: number },
	searchRadius: number
) {
	return Math.abs(centerX - prior.x) <= searchRadius && Math.abs(centerY - prior.y) <= searchRadius;
}

export function fixedBarSampleTargets(durationMs: number) {
	const targets: number[] = [];
	for (let mediaTimeMs = 0; mediaTimeMs < durationMs; mediaTimeMs += 1000 / 10) {
		targets.push(mediaTimeMs);
	}
	return targets;
}

export function nearestBarSample(samples: readonly BarSample[], mediaTimeMs: number) {
	if (samples.length === 0) return undefined;

	let lower = 0;
	let upper = samples.length;
	while (lower < upper) {
		const middle = Math.floor((lower + upper) / 2);
		if (samples[middle].mediaTimeMs < mediaTimeMs) lower = middle + 1;
		else upper = middle;
	}

	if (lower === 0) return samples[0];
	if (lower === samples.length) return samples[samples.length - 1];
	const before = samples[lower - 1];
	const after = samples[lower];
	return mediaTimeMs - before.mediaTimeMs < after.mediaTimeMs - mediaTimeMs ? before : after;
}

export function createBarTemplate(
	crop: GrayCrop,
	calibration: BarCalibration,
	config?: Partial<BarTrackerConfig>
): BarTemplate {
	const settings = resolvedConfig(config);
	const { half, width, height } = patchGeometry(settings.patchSize);
	const center = sourceCenter(calibration, crop);
	if (
		center.x < half ||
		center.y < half ||
		center.x > crop.sourceWidth - half ||
		center.y > crop.sourceHeight - half ||
		!containsPatch(crop, center.x, center.y, half)
	) {
		throw new Error(edgeMessage);
	}

	const values = new Float32Array(width * height);
	let sum = 0;
	for (let y = 0; y < height; y += 1) {
		const sourceY = center.y - half + y - crop.originY;
		for (let x = 0; x < width; x += 1) {
			const sourceX = center.x - half + x - crop.originX;
			const value = crop.gray[sourceY * crop.width + sourceX];
			values[y * width + x] = value;
			sum += value;
		}
	}

	const mean = sum / values.length;
	let squared = 0;
	for (let index = 0; index < values.length; index += 1) {
		values[index] -= mean;
		squared += values[index] * values[index];
	}
	const template = { width, height, centered: values, centeredNorm: Math.sqrt(squared) };
	templateMeans.set(template, mean);
	return template;
}

function integralImages(crop: GrayCrop) {
	const stride = crop.width + 1;
	const sums = new Float64Array((crop.height + 1) * stride);
	const squaredSums = new Float64Array((crop.height + 1) * stride);
	for (let y = 1; y <= crop.height; y += 1) {
		let rowSum = 0;
		let rowSquaredSum = 0;
		for (let x = 1; x <= crop.width; x += 1) {
			const value = crop.gray[(y - 1) * crop.width + x - 1];
			rowSum += value;
			rowSquaredSum += value * value;
			sums[y * stride + x] = sums[(y - 1) * stride + x] + rowSum;
			squaredSums[y * stride + x] = squaredSums[(y - 1) * stride + x] + rowSquaredSum;
		}
	}
	return { sums, squaredSums, stride };
}

function rectangleSum(
	integral: Float64Array,
	stride: number,
	left: number,
	top: number,
	width: number,
	height: number
) {
	const right = left + width;
	const bottom = top + height;
	return (
		integral[bottom * stride + right] -
		integral[top * stride + right] -
		integral[bottom * stride + left] +
		integral[top * stride + left]
	);
}

function candidateScore(
	template: BarTemplate,
	crop: GrayCrop,
	integral: ReturnType<typeof integralImages>,
	centerX: number,
	centerY: number
) {
	const halfWidth = template.width / 2;
	const halfHeight = template.height / 2;
	const left = centerX - halfWidth - crop.originX;
	const top = centerY - halfHeight - crop.originY;
	const count = template.width * template.height;
	const sum = rectangleSum(
		integral.sums,
		integral.stride,
		left,
		top,
		template.width,
		template.height
	);
	const squaredSum = rectangleSum(
		integral.squaredSums,
		integral.stride,
		left,
		top,
		template.width,
		template.height
	);
	const candidateMean = sum / count;
	const candidateNorm = Math.sqrt(Math.max(0, squaredSum - (sum * sum) / count));

	if (template.centeredNorm <= zeroNorm) {
		if (candidateNorm > zeroNorm) return 0;
		return 1 - Math.abs(candidateMean - (templateMeans.get(template) ?? 0)) / 255;
	}
	if (candidateNorm <= zeroNorm) return 0;

	let dot = 0;
	for (let y = 0; y < template.height; y += 1) {
		const row = (top + y) * crop.width + left;
		const templateRow = y * template.width;
		for (let x = 0; x < template.width; x += 1)
			dot += template.centered[templateRow + x] * crop.gray[row + x];
	}
	return dot / (template.centeredNorm * candidateNorm);
}

function nonOverlapping(first: Candidate, second: Candidate, patchSize: number) {
	const minimumCenterDifference = patchSize / 2;
	return (
		Math.abs(first.centerX - second.centerX) >= minimumCenterDifference ||
		Math.abs(first.centerY - second.centerY) >= minimumCenterDifference
	);
}

function bestCandidate(candidates: readonly Candidate[]) {
	let best: Candidate | undefined;
	for (const candidate of candidates) {
		if (!best || candidate.score > best.score) best = candidate;
	}
	return best;
}

function bestNonOverlappingCandidate(
	candidates: readonly Candidate[],
	best: Candidate,
	patchSize: number
) {
	let second: Candidate | undefined;
	for (const candidate of candidates) {
		if (nonOverlapping(candidate, best, patchSize) && (!second || candidate.score > second.score))
			second = candidate;
	}
	return second;
}

function refineCandidate(
	coarse: Candidate,
	template: BarTemplate,
	crop: GrayCrop,
	integral: ReturnType<typeof integralImages>,
	prior: { x: number; y: number },
	settings: BarTrackerConfig,
	half: number
) {
	const candidates: Candidate[] = [];
	for (let offsetY = -settings.refineRadius; offsetY <= settings.refineRadius; offsetY += 1) {
		for (let offsetX = -settings.refineRadius; offsetX <= settings.refineRadius; offsetX += 1) {
			const centerX = coarse.centerX + offsetX;
			const centerY = coarse.centerY + offsetY;
			if (
				!withinSearchRadius(centerX, centerY, prior, settings.searchRadius) ||
				!containsPatch(crop, centerX, centerY, half)
			) {
				continue;
			}
			candidates.push({
				centerX,
				centerY,
				score: candidateScore(template, crop, integral, centerX, centerY)
			});
		}
	}
	return candidates;
}

export function matchBarCrop(
	template: BarTemplate,
	crop: GrayCrop,
	previous: Pick<BarPoint, 'x' | 'y'>,
	config?: Partial<BarTrackerConfig>
): BarSample {
	const settings = resolvedConfig(config);
	const { half } = patchGeometry(settings.patchSize);
	if (template.width !== settings.patchSize || template.height !== settings.patchSize) {
		throw new Error('Bar template dimensions must match the tracker patchSize.');
	}
	const prior = sourceCenter(previous, crop);
	const integral = integralImages(crop);
	const coarseCandidates: Candidate[] = [];
	for (
		let offsetY = -settings.searchRadius;
		offsetY <= settings.searchRadius;
		offsetY += settings.coarseStep
	) {
		for (
			let offsetX = -settings.searchRadius;
			offsetX <= settings.searchRadius;
			offsetX += settings.coarseStep
		) {
			const centerX = prior.x + offsetX;
			const centerY = prior.y + offsetY;
			if (!containsPatch(crop, centerX, centerY, half)) continue;
			coarseCandidates.push({
				centerX,
				centerY,
				score: candidateScore(template, crop, integral, centerX, centerY)
			});
		}
	}

	const coarseBest = bestCandidate(coarseCandidates);
	if (!coarseBest) return { mediaTimeMs: crop.mediaTimeMs, point: null };
	const coarseSecond = bestNonOverlappingCandidate(
		coarseCandidates,
		coarseBest,
		settings.patchSize
	);
	const refinedCandidates = refineCandidate(
		coarseBest,
		template,
		crop,
		integral,
		prior,
		settings,
		half
	);
	if (coarseSecond) {
		refinedCandidates.push(
			...refineCandidate(coarseSecond, template, crop, integral, prior, settings, half)
		);
	}

	const best = bestCandidate(refinedCandidates);
	if (!best) return { mediaTimeMs: crop.mediaTimeMs, point: null };
	const second = bestNonOverlappingCandidate(refinedCandidates, best, settings.patchSize);
	if (
		best.score < settings.confidenceThreshold ||
		(second !== undefined && best.score - second.score < settings.ambiguityMargin)
	) {
		return { mediaTimeMs: crop.mediaTimeMs, point: null };
	}
	return {
		mediaTimeMs: crop.mediaTimeMs,
		point: {
			x: best.centerX / crop.sourceWidth,
			y: best.centerY / crop.sourceHeight,
			confidence: best.score
		}
	};
}

function asFullCrop(frame: GrayFrame): GrayCrop {
	return {
		...frame,
		originX: 0,
		originY: 0,
		sourceWidth: frame.width,
		sourceHeight: frame.height
	};
}

function sortedDistinctFrames(frames: readonly GrayFrame[]) {
	const ordered = [...frames].sort((left, right) => left.mediaTimeMs - right.mediaTimeMs);
	return ordered.filter(
		(frame, index) => index === 0 || frame.mediaTimeMs !== ordered[index - 1].mediaTimeMs
	);
}

function nearestFrame(frames: readonly GrayFrame[], mediaTimeMs: number) {
	const samples: BarSample[] = frames.map((frame) => ({
		mediaTimeMs: frame.mediaTimeMs,
		point: null
	}));
	const nearest = nearestBarSample(samples, mediaTimeMs);
	return nearest ? frames.find((frame) => frame.mediaTimeMs === nearest.mediaTimeMs) : undefined;
}

export function trackBarFrames(
	frames: readonly GrayFrame[],
	calibration: BarCalibration,
	config?: Partial<BarTrackerConfig>
): BarTrackingResult {
	const settings = resolvedConfig(config);
	const orderedFrames = sortedDistinctFrames(frames);
	if (orderedFrames.length === 0)
		throw new Error('Cannot track bar frames without decoded frames.');
	const calibrationFrame = nearestFrame(orderedFrames, calibration.mediaTimeMs);
	if (!calibrationFrame) throw new Error('Cannot find a calibration frame.');
	const calibrationIndex = orderedFrames.indexOf(calibrationFrame);
	const calibrationCrop = asFullCrop(calibrationFrame);
	const template = createBarTemplate(calibrationCrop, calibration, settings);
	const samples: BarSample[] = [
		{
			mediaTimeMs: calibrationFrame.mediaTimeMs,
			point: { x: calibration.x, y: calibration.y, confidence: 1 }
		}
	];

	let forwardPoint: BarPoint = { x: calibration.x, y: calibration.y, confidence: 1 };
	for (let index = calibrationIndex + 1; index < orderedFrames.length; index += 1) {
		const sample = matchBarCrop(template, asFullCrop(orderedFrames[index]), forwardPoint, settings);
		samples.push(sample);
		if (!sample.point) break;
		forwardPoint = sample.point;
	}

	let backwardPoint: BarPoint = { x: calibration.x, y: calibration.y, confidence: 1 };
	for (let index = calibrationIndex - 1; index >= 0; index -= 1) {
		const sample = matchBarCrop(
			template,
			asFullCrop(orderedFrames[index]),
			backwardPoint,
			settings
		);
		samples.push(sample);
		if (!sample.point) break;
		backwardPoint = sample.point;
	}

	return {
		schemaVersion: 1,
		sourceWidth: calibrationFrame.width,
		sourceHeight: calibrationFrame.height,
		rotationDegrees: 0,
		samplingPolicy: { kind: 'fixed', hz: 10 },
		tracker: {
			name: BAR_TRACKER_V1.name,
			version: BAR_TRACKER_V1.version,
			confidenceThreshold: settings.confidenceThreshold
		},
		calibration: { ...calibration, patchSize: settings.patchSize },
		samples: samples.sort((left, right) => left.mediaTimeMs - right.mediaTimeMs)
	};
}
