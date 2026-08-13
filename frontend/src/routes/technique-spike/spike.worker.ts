import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

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
		self.postMessage({
			type: 'result',
			mediaTimeMs: data.mediaTimeMs,
			hasPose: result.landmarks.length > 0,
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
