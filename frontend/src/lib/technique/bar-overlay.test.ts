import { expect, it, vi } from 'vitest';
import { barEvidenceAt, drawBarOverlay, fitContainedVideo, viewportToSource } from './bar-overlay';
import type { BarTrackingResult } from './bar-path';

it('fits landscape source inside a portrait viewport', () => {
	expect(fitContainedVideo({ width: 1280, height: 720 }, { width: 400, height: 400 })).toEqual({
		x: 0,
		y: 87.5,
		width: 400,
		height: 225
	});
});

it('inverts letterboxing and clockwise source rotation for calibration', () => {
	expect(
		viewportToSource(
			{ x: 312.5, y: 0 },
			{ width: 1280, height: 720, rotationDegrees: 90 },
			{ width: 400, height: 400 }
		)
	).toEqual({ x: 0, y: 0 });
});

it('rejects calibration taps in the letterbox', () => {
	expect(
		viewportToSource(
			{ x: 200, y: 50 },
			{ width: 1280, height: 720, rotationDegrees: 0 },
			{ width: 400, height: 400 }
		)
	).toBeNull();
});

it('does not implicitly mirror an unmirrored review video', () => {
	expect(
		viewportToSource(
			{ x: 100, y: 200 },
			{ width: 400, height: 400, rotationDegrees: 0, mirrored: false },
			{ width: 400, height: 400 }
		)
	).toEqual({ x: 0.25, y: 0.5 });
});

it('does not bridge a rejected sample', () => {
	const evidence = barEvidenceAt(
		[
			{ mediaTimeMs: 0, point: { x: 0.4, y: 0.4, confidence: 0.9 } },
			{ mediaTimeMs: 100, point: null },
			{ mediaTimeMs: 200, point: { x: 0.5, y: 0.5, confidence: 0.9 } }
		],
		150
	);
	expect(evidence.current).toBeNull();
	expect(evidence.path).toHaveLength(1);
	expect(evidence.lost).toBe(true);
});

it('draws only the progressive path up to the current playback time', () => {
	const evidence = barEvidenceAt(
		[
			{ mediaTimeMs: 0, point: { x: 0.2, y: 0.2, confidence: 0.9 } },
			{ mediaTimeMs: 100, point: { x: 0.3, y: 0.3, confidence: 0.9 } },
			{ mediaTimeMs: 200, point: { x: 0.4, y: 0.4, confidence: 0.9 } }
		],
		100
	);
	expect(evidence.path).toEqual([
		{ x: 0.2, y: 0.2, confidence: 0.9 },
		{ x: 0.3, y: 0.3, confidence: 0.9 }
	]);
	expect(evidence.current).toEqual({ x: 0.3, y: 0.3, confidence: 0.9 });
});

it('interpolates the current marker only between adjacent accepted samples', () => {
	expect(
		barEvidenceAt(
			[
				{ mediaTimeMs: 0, point: { x: 0.4, y: 0.2, confidence: 0.8 } },
				{ mediaTimeMs: 100, point: { x: 0.6, y: 0.4, confidence: 1 } }
			],
			50
		).current
	).toEqual({ x: 0.5, y: 0.30000000000000004, confidence: 0.9 });
});

it('does not interpolate or bridge an accepted gap longer than 110 ms', () => {
	const evidence = barEvidenceAt(
		[
			{ mediaTimeMs: 0, point: { x: 0.4, y: 0.4, confidence: 0.9 } },
			{ mediaTimeMs: 111, point: { x: 0.5, y: 0.5, confidence: 0.9 } }
		],
		50
	);
	expect(evidence).toEqual({
		path: [{ x: 0.4, y: 0.4, confidence: 0.9 }],
		current: null,
		lost: true
	});
});

function trackingResult(): BarTrackingResult {
	return {
		schemaVersion: 1,
		sourceWidth: 100,
		sourceHeight: 100,
		rotationDegrees: 0,
		samplingPolicy: { kind: 'fixed', hz: 10 },
		tracker: {
			name: 'normalized-cross-correlation',
			version: 1,
			confidenceThreshold: 0.75
		},
		calibration: { mediaTimeMs: 0, x: 0.25, y: 0.5, patchSize: 32 },
		samples: [
			{ mediaTimeMs: 0, point: { x: 0.25, y: 0.5, confidence: 1 } },
			{ mediaTimeMs: 100, point: { x: 0.3, y: 0.45, confidence: 0.9 } }
		]
	};
}

function canvasHarness() {
	const context = {
		setTransform: vi.fn(),
		clearRect: vi.fn(),
		setLineDash: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn(),
		lineWidth: 0,
		strokeStyle: '',
		fillStyle: '',
		lineCap: ''
	};
	const canvas = {
		width: 0,
		height: 0,
		style: { width: '', height: '' },
		getContext: () => context
	};
	return { canvas: canvas as unknown as HTMLCanvasElement, context };
}

it('sizes the canvas backing store by device pixel ratio while drawing in layout pixels', () => {
	const { canvas, context } = canvasHarness();
	drawBarOverlay(
		canvas,
		trackingResult(),
		50,
		{ width: 300, height: 200 },
		{ devicePixelRatio: 2 }
	);
	expect(canvas.width).toBe(600);
	expect(canvas.height).toBe(400);
	expect(canvas.style.width).toBe('300px');
	expect(canvas.style.height).toBe('200px');
	expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
});

it('draws a long-dashed vertical reference through calibration x', () => {
	const { canvas, context } = canvasHarness();
	drawBarOverlay(canvas, trackingResult(), 50, { width: 200, height: 100 });
	expect(context.setLineDash).toHaveBeenCalledWith([12, 8]);
	expect(context.moveTo).toHaveBeenCalledWith(75, 0);
	expect(context.lineTo).toHaveBeenCalledWith(75, 100);
});
