/// <reference lib="webworker" />

import { createBarTemplate, matchBarCrop } from './bar-path';
import type { BarPoint, BarSample, BarTemplate, GrayCrop } from './bar-path';
import type { BAR_TRACKER_V1 } from './bar-path';

type MatcherRequest =
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

type MatcherResponse =
	| { type: 'ready' }
	| { type: 'result'; requestId: number; sample: BarSample }
	| { type: 'error'; requestId: number | null; message: string };

let template: BarTemplate | undefined;
const previousByDirection: Partial<Record<'backward' | 'forward', BarPoint>> = {};

function stableMessage(error: unknown) {
	return error instanceof Error && error.message ? error.message : 'Bar matcher failed.';
}

function post(message: MatcherResponse) {
	self.postMessage(message);
}

function calibrationCrop(request: Extract<MatcherRequest, { type: 'calibrate' }>): GrayCrop {
	return {
		mediaTimeMs: 0,
		width: request.width,
		height: request.height,
		gray: request.gray,
		originX: 0,
		originY: 0,
		sourceWidth: request.width,
		sourceHeight: request.height
	};
}

function cropFromStep(request: Extract<MatcherRequest, { type: 'step' }>): GrayCrop {
	return {
		mediaTimeMs: request.mediaTimeMs,
		width: request.width,
		height: request.height,
		gray: request.gray,
		originX: request.originX,
		originY: request.originY,
		sourceWidth: request.sourceWidth,
		sourceHeight: request.sourceHeight
	};
}

self.onmessage = ({ data }: MessageEvent<MatcherRequest>) => {
	try {
		if (data.type === 'close') {
			template = undefined;
			delete previousByDirection.backward;
			delete previousByDirection.forward;
			self.close();
			return;
		}
		if (data.type === 'calibrate') {
			template = createBarTemplate(
				calibrationCrop(data),
				{ mediaTimeMs: 0, x: 0.5, y: 0.5 },
				data.config
			);
			delete previousByDirection.backward;
			delete previousByDirection.forward;
			post({ type: 'ready' });
			return;
		}
		if (!template) throw new Error('Bar matcher has not been calibrated.');
		const crop = cropFromStep(data);
		const previous = previousByDirection[data.direction] ?? {
			x: (crop.originX + crop.width / 2) / crop.sourceWidth,
			y: (crop.originY + crop.height / 2) / crop.sourceHeight,
			confidence: 1
		};
		const sample = matchBarCrop(template, crop, previous);
		if (sample.point) previousByDirection[data.direction] = sample.point;
		else delete previousByDirection[data.direction];
		post({ type: 'result', requestId: data.requestId, sample });
	} catch (error) {
		post({
			type: 'error',
			requestId: data.type === 'step' ? data.requestId : null,
			message: stableMessage(error)
		});
	}
};

post({ type: 'ready' });
