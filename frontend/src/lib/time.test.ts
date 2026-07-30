import { describe, expect, it } from 'vitest';

import { formatElapsed, formatMinutes, INTERVAL_CEILING_SECONDS, intervalBetween } from './time';

describe('formatElapsed', () => {
	it('counts minutes and seconds under an hour', () => {
		expect(formatElapsed(0)).toBe('0:00');
		expect(formatElapsed(9_000)).toBe('0:09');
		expect(formatElapsed(64_000)).toBe('1:04');
		expect(formatElapsed(59 * 60_000 + 59_000)).toBe('59:59');
	});

	it('grows an hours field rather than counting to ninety minutes', () => {
		expect(formatElapsed(3_600_000)).toBe('1:00:00');
		expect(formatElapsed(3_600_000 + 62_000)).toBe('1:01:02');
		expect(formatElapsed(10 * 3_600_000)).toBe('10:00:00');
	});

	it('truncates rather than rounds, so the clock never reads ahead of itself', () => {
		expect(formatElapsed(1_999)).toBe('0:01');
	});

	it('treats a clock that went backwards as zero', () => {
		expect(formatElapsed(-5_000)).toBe('0:00');
	});
});

describe('formatMinutes', () => {
	it('answers in whole minutes', () => {
		expect(formatMinutes(3_600)).toBe('60 min');
		expect(formatMinutes(3_450)).toBe('58 min');
	});

	it('has nothing to say about a session that never ended', () => {
		expect(formatMinutes(null)).toBeNull();
		expect(formatMinutes(undefined)).toBeNull();
	});
});

describe('intervalBetween', () => {
	it('is the gap in seconds', () => {
		expect(intervalBetween('2026-07-30T10:00:00.000Z', '2026-07-30T10:03:10.000Z')).toBe(190);
	});

	// The phone's clock is not trusted (D-10). It can be corrected by NTP or
	// changed by hand mid-session, and a genuine three-minute gap is
	// indistinguishable from one straddling a three-minute correction.
	it('does not believe a negative gap', () => {
		expect(intervalBetween('2026-07-30T10:03:00.000Z', '2026-07-30T10:00:00.000Z')).toBeNull();
	});

	it('does not believe a gap over the ceiling', () => {
		const later = new Date(Date.parse('2026-07-30T10:00:00.000Z') + 1_201_000).toISOString();
		expect(intervalBetween('2026-07-30T10:00:00.000Z', later)).toBeNull();
	});

	it('believes a gap exactly at the ceiling', () => {
		const later = new Date(Date.parse('2026-07-30T10:00:00.000Z') + 1_200_000).toISOString();
		expect(intervalBetween('2026-07-30T10:00:00.000Z', later)).toBe(INTERVAL_CEILING_SECONDS);
	});

	it('is null for an unparseable stamp', () => {
		expect(intervalBetween('not a time', '2026-07-30T10:00:00.000Z')).toBeNull();
	});
});
