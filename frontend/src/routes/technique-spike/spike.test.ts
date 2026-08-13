import { describe, expect, it } from 'vitest';
import { fixedSampleTargets, summariseSpike } from './spike';

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
});
