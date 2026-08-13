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
	landmarks: LandmarkSummary;
	sha256: { elapsedMs: number | null; digestHexLength: number | null };
	indexedDb: { wrote: boolean; readSameBytes: boolean; elapsedMs: number | null };
	memory: MemoryObservations;
	cleanup: { tracksEnded: boolean; objectUrlRevoked: boolean };
	errors: Array<{ stage: string; name: string; message: string }>;
};

export type ConfidenceSummary = {
	sampleCount: number;
	minimum: number;
	maximum: number;
	mean: number;
};

export type LandmarkFrame = {
	hasPose: boolean;
	landmarkCount: number;
	visibility: number[];
	presence: number[];
};

export type LandmarkSummary = {
	framesWithPose: number;
	framesWithoutPose: number;
	totalLandmarks: number;
	visibility: ConfidenceSummary | null;
	presence: ConfidenceSummary | null;
};

export type MemoryObservation = {
	stage: string;
	timestampMs: number;
	usedJsHeapSize: number;
	totalJsHeapSize: number;
	jsHeapSizeLimit: number;
};

export type MemoryObservations = {
	schemaVersion: 1;
	availability: 'performance-memory' | 'unavailable';
	observations: MemoryObservation[] | null;
};

export type BlobMeasurements = {
	requestedMs: number[];
	decodedMs: number[];
	analysisMs: number[];
	landmarkFrames: LandmarkFrame[];
	sha256: SpikeReport['sha256'];
	indexedDb: SpikeReport['indexedDb'];
};

export type SpikePhase =
	| 'camera'
	| 'record'
	| 'recording'
	| 'analyze'
	| 'hash'
	| 'indexed-db'
	| 'cleanup'
	| 'download'
	| 'finished';

export type SpikeAction =
	| 'requestCamera'
	| 'record10'
	| 'record45'
	| 'analyze'
	| 'hash'
	| 'indexedDb'
	| 'cleanup'
	| 'download';

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

export async function blobsHaveSameBytes(left: Blob, right: Blob): Promise<boolean> {
	if (left.size !== right.size) return false;

	const [leftBytes, rightBytes] = await Promise.all([left.arrayBuffer(), right.arrayBuffer()]);
	const leftView = new Uint8Array(leftBytes);
	const rightView = new Uint8Array(rightBytes);
	return leftView.every((value, index) => value === rightView[index]);
}

export function newBlobMeasurements(): BlobMeasurements {
	return {
		requestedMs: [],
		decodedMs: [],
		analysisMs: [],
		landmarkFrames: [],
		sha256: { elapsedMs: null, digestHexLength: null },
		indexedDb: { wrote: false, readSameBytes: false, elapsedMs: null }
	};
}

export function canRunSpikeAction(phase: SpikePhase, action: SpikeAction): boolean {
	const requiredPhase: Record<SpikeAction, SpikePhase> = {
		requestCamera: 'camera',
		record10: 'record',
		record45: 'record',
		analyze: 'analyze',
		hash: 'hash',
		indexedDb: 'indexed-db',
		cleanup: 'cleanup',
		download: 'download'
	};
	return phase === requiredPhase[action];
}

function confidenceSummary(values: number[]): ConfidenceSummary | null {
	if (values.length === 0) return null;
	return {
		sampleCount: values.length,
		minimum: Math.min(...values),
		maximum: Math.max(...values),
		mean: values.reduce((sum, value) => sum + value, 0) / values.length
	};
}

export function summariseLandmarks(frames: LandmarkFrame[]): LandmarkSummary {
	const withPose = frames.filter((frame) => frame.hasPose);
	return {
		framesWithPose: withPose.length,
		framesWithoutPose: frames.length - withPose.length,
		totalLandmarks: withPose.reduce((total, frame) => total + frame.landmarkCount, 0),
		visibility: confidenceSummary(withPose.flatMap((frame) => frame.visibility)),
		presence: confidenceSummary(withPose.flatMap((frame) => frame.presence))
	};
}

export type RecordingLifecycle = {
	begin: () => number | null;
	isCurrent: (attempt: number) => boolean;
	publish: (
		attempt: number | null,
		createObjectUrl: () => string,
		revokeObjectUrl: (url: string) => void
	) => string | null;
	release: (revokeObjectUrl: (url: string) => void) => boolean;
	dispose: (revokeObjectUrl: (url: string) => void) => boolean;
	snapshot: () => { disposed: boolean; ownedObjectUrl: string | null };
};

export function createRecordingLifecycle(): RecordingLifecycle {
	let disposed = false;
	let generation = 0;
	let ownedObjectUrl: string | null = null;

	const release = (revokeObjectUrl: (url: string) => void) => {
		if (!ownedObjectUrl) return false;
		revokeObjectUrl(ownedObjectUrl);
		ownedObjectUrl = null;
		return true;
	};

	return {
		begin: () => {
			if (disposed) return null;
			generation += 1;
			return generation;
		},
		isCurrent: (attempt) => !disposed && generation === attempt,
		publish: (attempt, createObjectUrl, revokeObjectUrl) => {
			if (attempt === null || disposed || generation !== attempt) return null;
			const url = createObjectUrl();
			if (disposed || generation !== attempt) {
				revokeObjectUrl(url);
				return null;
			}
			release(revokeObjectUrl);
			ownedObjectUrl = url;
			return url;
		},
		release,
		dispose: (revokeObjectUrl) => {
			disposed = true;
			generation += 1;
			return release(revokeObjectUrl);
		},
		snapshot: () => ({ disposed, ownedObjectUrl })
	};
}
