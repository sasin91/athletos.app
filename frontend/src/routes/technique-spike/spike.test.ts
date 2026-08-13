import { describe, expect, it } from 'vitest';
import {
	blobsHaveSameBytes,
	canRunSpikeAction,
	createRecordingLifecycle,
	fixedSampleTargets,
	newBlobMeasurements,
	summariseSpike
} from './spike';

describe('technique spike report', () => {
	// Catches a sampler that requests frames at an implied rate rather than fixed 10 Hz targets.
	it('requests fixed 10 Hz targets without inventing decoded timestamps', () => {
		expect(fixedSampleTargets(350)).toEqual([0, 100, 200, 300]);
	});

	// Catches a report summary that discards decoder-provided timestamps or misreports analysis cost.
	it('retains irregular decoded timestamps in the report', () => {
		const report = summariseSpike({
			requestedMs: [0, 100, 200],
			decodedMs: [0, 101.4, 198.8],
			analysisMs: [12, 11, 14]
		});
		expect(report.decodedMs).toEqual([0, 101.4, 198.8]);
		expect(report.analysis.totalMs).toBe(37);
	});

	// Catches IndexedDB reporting same-sized but different bytes as a successful round-trip.
	it('rejects equal-size blobs whose bytes differ', async () => {
		expect(
			await blobsHaveSameBytes(new Blob([Uint8Array.of(1, 2)]), new Blob([Uint8Array.of(1, 3)]))
		).toBe(false);
	});

	// Catches a replacement recording retaining SHA, storage, analysis, or memory values from an old blob.
	it('clears every blob-derived measurement before a replacement recording', () => {
		expect(newBlobMeasurements()).toEqual({
			requestedMs: [],
			decodedMs: [],
			analysisMs: [],
			landmarkFrames: [],
			sha256: { elapsedMs: null, digestHexLength: null },
			indexedDb: { wrote: false, readSameBytes: false, elapsedMs: null }
		});
	});

	// Catches controls enabling a later phase or download before one complete, cleaned-up run exists.
	it('requires the ordered workflow before enabling actions or download', () => {
		expect(canRunSpikeAction('record', 'record10')).toBe(true);
		expect(canRunSpikeAction('record', 'analyze')).toBe(false);
		expect(canRunSpikeAction('cleanup', 'download')).toBe(false);
		expect(canRunSpikeAction('download', 'download')).toBe(true);
	});

	// Catches an unmounted component publishing a late recording URL after its owner has been torn down.
	it('rejects a recording URL published after teardown and leaves no owned URL', () => {
		const lifecycle = createRecordingLifecycle();
		const attempt = lifecycle.begin();
		const revoked: string[] = [];

		const published = lifecycle.publish(
			attempt,
			() => {
				lifecycle.dispose((url) => revoked.push(url));
				return 'blob:late-recording';
			},
			(url) => revoked.push(url)
		);

		expect(published).toBeNull();
		expect(lifecycle.snapshot()).toEqual({ disposed: true, ownedObjectUrl: null });
		expect(revoked).toEqual(['blob:late-recording']);
	});
});
