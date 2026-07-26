import { describe, expect, it } from 'vitest';

import { formatElapsed, formatMinutes } from './time';

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
