import { describe, expect, it, vi } from 'vitest';
import { createTechniqueReview } from './review';
import type { RecorderPort } from './types';

function fakeRecorder(): RecorderPort & { dispose: ReturnType<typeof vi.fn> } {
	return {
		capabilities: () => ({ secure: true, camera: true, recorder: true, supported: true }),
		requestPreview: vi.fn(async () => ({ width: 1280, height: 720, frameRate: 30 })),
		start: vi.fn(async () => undefined),
		stop: vi.fn(async () => ({
			blob: new Blob(['clip'], { type: 'video/webm' }),
			mimeType: 'video/webm',
			durationMs: 9000,
			width: 1280,
			height: 720,
			frameRate: 30,
			rotationDegrees: 0 as const
		})),
		dispose: vi.fn(async () => undefined)
	};
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
});
