export type SpikeReport = {
	userAgent: string;
	displayMode: 'browser' | 'standalone';
	capabilities: Record<string, boolean>;
	mediaType: string | null;
	settings: MediaTrackSettings | null;
	blobBytes: number;
	durationMs: number;
	requestedMs: number[];
	decodedMs: number[];
	analysis: { frameMs: number[]; totalMs: number };
	landmarks: { framesWithPose: number; framesWithoutPose: number };
	sha256: { elapsedMs: number; digestHexLength: number };
	indexedDb: { wrote: boolean; readSameBytes: boolean; elapsedMs: number };
	cleanup: { tracksEnded: boolean; objectUrlRevoked: boolean };
	errors: Array<{ stage: string; name: string; message: string }>;
};

export function fixedSampleTargets(durationMs: number): number[] {
	return Array.from({ length: Math.ceil(durationMs / 100) }, (_, index) => index * 100);
}

export function summariseSpike(input: {
	requestedMs: number[];
	decodedMs: number[];
	analysisMs: number[];
}) {
	return {
		...input,
		analysis: {
			frameMs: input.analysisMs,
			totalMs: input.analysisMs.reduce((sum, value) => sum + value, 0)
		}
	};
}
