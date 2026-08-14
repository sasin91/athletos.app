import { expect, it, vi } from 'vitest';
import { trackDecodedBar } from './bar-decoder';
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
