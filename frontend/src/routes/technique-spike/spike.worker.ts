import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { LandmarkFrame } from './spike';

type AnalyzeMessage = { type: 'analyze'; bitmap: ImageBitmap; mediaTimeMs: number };

let landmarker: PoseLandmarker | null = null;

async function getLandmarker(): Promise<PoseLandmarker> {
	if (!landmarker) {
		const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
		landmarker = await PoseLandmarker.createFromOptions(vision, {
			baseOptions: { modelAssetPath: '/models/pose_landmarker_lite_v1.task' },
			runningMode: 'VIDEO'
		});
	}

	return landmarker;
}

self.onmessage = async ({ data }: MessageEvent<AnalyzeMessage>) => {
	if (data.type !== 'analyze') return;

	const started = performance.now();
	try {
		const result = (await getLandmarker()).detectForVideo(data.bitmap, data.mediaTimeMs);
		const landmarks = result.landmarks.flat();
		const visibility = landmarks
			.map((landmark) => landmark.visibility)
			.filter((value): value is number => typeof value === 'number');
		const frame: LandmarkFrame = {
			hasPose: result.landmarks.length > 0,
			landmarkCount: landmarks.length,
			visibility,
			// This MediaPipe result type exposes visibility but no per-landmark presence confidence.
			presence: []
		};
		self.postMessage({
			type: 'result',
			mediaTimeMs: data.mediaTimeMs,
			frame,
			elapsedMs: performance.now() - started
		});
	} catch (error) {
		const reason = error instanceof Error ? error : new Error(String(error));
		self.postMessage({
			type: 'error',
			mediaTimeMs: data.mediaTimeMs,
			name: reason.name,
			message: reason.message
		});
	} finally {
		data.bitmap.close();
	}
};
