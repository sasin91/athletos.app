import type { BarPoint, BarSample, BarTrackingResult } from './bar-path';

type Size = { width: number; height: number };
type ViewportPoint = { x: number; y: number };
type SourceTransform = Size & {
	rotationDegrees?: 0 | 90 | 180 | 270;
	mirrored?: boolean;
};

export type ContainedVideo = ViewportPoint & Size;
export type BarOverlayState = { bar: 'visible' | 'needs-calibration' | 'tracking-lost' };

const maximumInterpolationGapMs = 110;

function displayedSize(source: SourceTransform): Size {
	return source.rotationDegrees === 90 || source.rotationDegrees === 270
		? { width: source.height, height: source.width }
		: { width: source.width, height: source.height };
}

export function fitContainedVideo(source: SourceTransform, viewport: Size): ContainedVideo {
	const displayed = displayedSize(source);
	if (
		displayed.width <= 0 ||
		displayed.height <= 0 ||
		viewport.width <= 0 ||
		viewport.height <= 0
	) {
		throw new Error('Video and viewport dimensions must be positive.');
	}
	const scale = Math.min(viewport.width / displayed.width, viewport.height / displayed.height);
	const width = displayed.width * scale;
	const height = displayed.height * scale;
	return {
		x: (viewport.width - width) / 2,
		y: (viewport.height - height) / 2,
		width,
		height
	};
}

function displayToSource(u: number, v: number, rotationDegrees: 0 | 90 | 180 | 270) {
	switch (rotationDegrees) {
		case 90:
			return { x: v, y: 1 - u };
		case 180:
			return { x: 1 - u, y: 1 - v };
		case 270:
			return { x: 1 - v, y: u };
		default:
			return { x: u, y: v };
	}
}

function sourceToDisplay(point: Pick<BarPoint, 'x' | 'y'>, rotationDegrees: 0 | 90 | 180 | 270) {
	switch (rotationDegrees) {
		case 90:
			return { u: 1 - point.y, v: point.x };
		case 180:
			return { u: 1 - point.x, v: 1 - point.y };
		case 270:
			return { u: point.y, v: 1 - point.x };
		default:
			return { u: point.x, v: point.y };
	}
}

export function viewportToSource(
	point: ViewportPoint,
	source: SourceTransform,
	viewport: Size
): { x: number; y: number } | null {
	const contained = fitContainedVideo(source, viewport);
	let u = (point.x - contained.x) / contained.width;
	const v = (point.y - contained.y) / contained.height;
	if (u < 0 || u > 1 || v < 0 || v > 1) return null;
	if (source.mirrored) u = 1 - u;
	return displayToSource(u, v, source.rotationDegrees ?? 0);
}

function viewportPoint(
	point: Pick<BarPoint, 'x' | 'y'>,
	source: SourceTransform,
	viewport: Size,
	contained = fitContainedVideo(source, viewport)
) {
	const display = sourceToDisplay(point, source.rotationDegrees ?? 0);
	let { u } = display;
	const { v } = display;
	if (source.mirrored) u = 1 - u;
	return { x: contained.x + u * contained.width, y: contained.y + v * contained.height };
}

function interpolate(left: BarPoint, right: BarPoint, amount: number): BarPoint {
	return {
		x: left.x + (right.x - left.x) * amount,
		y: left.y + (right.y - left.y) * amount,
		confidence: left.confidence + (right.confidence - left.confidence) * amount
	};
}

export function barEvidenceAt(
	samples: readonly BarSample[],
	mediaTimeMs: number
): { path: BarPoint[]; current: BarPoint | null; lost: boolean } {
	const ordered = [...samples].sort((left, right) => left.mediaTimeMs - right.mediaTimeMs);
	const path: BarPoint[] = [];
	let current: BarPoint | null = null;
	let lost = false;
	let previous: BarSample | undefined;
	let next: BarSample | undefined;

	for (const sample of ordered) {
		if (sample.mediaTimeMs > mediaTimeMs) {
			next = sample;
			break;
		}
		if (!sample.point) {
			current = null;
			lost = true;
			previous = sample;
			continue;
		}
		if (
			previous &&
			(!previous.point || sample.mediaTimeMs - previous.mediaTimeMs > maximumInterpolationGapMs)
		) {
			path.length = 0;
		}
		path.push(sample.point);
		current = sample.point;
		lost = false;
		previous = sample;
	}

	if (previous?.point && next) {
		const gap = next.mediaTimeMs - previous.mediaTimeMs;
		if (next.point && gap > 0 && gap <= maximumInterpolationGapMs) {
			current = interpolate(previous.point, next.point, (mediaTimeMs - previous.mediaTimeMs) / gap);
			if (mediaTimeMs > previous.mediaTimeMs) path.push(current);
		} else if (gap > maximumInterpolationGapMs) {
			current = null;
			lost = true;
		}
	}

	return { path, current, lost };
}

export function drawBarOverlay(
	canvas: HTMLCanvasElement,
	result: BarTrackingResult | null,
	mediaTimeMs: number,
	viewport: Size,
	options: { devicePixelRatio?: number; mirrored?: boolean } = {}
): BarOverlayState {
	const ratio = Math.max(1, options.devicePixelRatio ?? 1);
	canvas.style.width = `${viewport.width}px`;
	canvas.style.height = `${viewport.height}px`;
	canvas.width = Math.round(viewport.width * ratio);
	canvas.height = Math.round(viewport.height * ratio);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Cannot create bar overlay canvas.');
	context.setTransform(ratio, 0, 0, ratio, 0, 0);
	context.clearRect(0, 0, viewport.width, viewport.height);
	if (!result) return { bar: 'needs-calibration' };

	const source = {
		width: result.sourceWidth,
		height: result.sourceHeight,
		rotationDegrees: result.rotationDegrees,
		mirrored: options.mirrored ?? false
	};
	const contained = fitContainedVideo(source, viewport);
	const calibration = viewportPoint(result.calibration, source, viewport, contained);
	context.beginPath();
	context.setLineDash([12, 8]);
	context.lineWidth = 2;
	context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
	context.moveTo(calibration.x, contained.y);
	context.lineTo(calibration.x, contained.y + contained.height);
	context.stroke();

	const evidence = barEvidenceAt(result.samples, mediaTimeMs);
	if (evidence.path.length > 0) {
		context.beginPath();
		context.setLineDash([]);
		context.lineWidth = 4;
		context.lineCap = 'round';
		context.strokeStyle = '#22d3ee';
		const first = viewportPoint(evidence.path[0], source, viewport, contained);
		context.moveTo(first.x, first.y);
		for (const point of evidence.path.slice(1)) {
			const mapped = viewportPoint(point, source, viewport, contained);
			context.lineTo(mapped.x, mapped.y);
		}
		context.stroke();
	}
	if (evidence.current) {
		const marker = viewportPoint(evidence.current, source, viewport, contained);
		context.beginPath();
		context.setLineDash([]);
		context.arc(marker.x, marker.y, 7, 0, Math.PI * 2);
		context.fillStyle = '#22d3ee';
		context.fill();
		context.lineWidth = 2;
		context.strokeStyle = '#030712';
		context.stroke();
	}

	return { bar: evidence.lost ? 'tracking-lost' : 'visible' };
}
