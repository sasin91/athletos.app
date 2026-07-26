import { describe, expect, it } from 'vitest';

import { uuidv7, uuidv7Timestamp } from './uuid';

/** Deterministic sources: a fixed clock and a fixed byte pattern. */
function sources(now: number, fill = 0xff) {
	return {
		now: () => now,
		randomBytes: (into: Uint8Array<ArrayBuffer>) => {
			into.fill(fill);
		}
	};
}

describe('uuidv7', () => {
	it('is a canonical uuid', () => {
		expect(uuidv7()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
	});

	it('carries version 7 and the RFC 4122 variant even when every random bit is set', () => {
		const id = uuidv7(sources(0, 0xff));

		expect(id[14]).toBe('7');
		expect('89ab').toContain(id[19]);
	});

	it('carries version 7 and the variant when no random bit is set', () => {
		const id = uuidv7(sources(0, 0x00));

		expect(id[14]).toBe('7');
		expect('89ab').toContain(id[19]);
	});

	it('puts the clock in the leading 48 bits', () => {
		const now = Date.UTC(2026, 6, 26, 9, 30, 0);

		expect(uuidv7Timestamp(uuidv7(sources(now)))).toBe(now);
	});

	it('sorts in the order the sessions were committed', () => {
		const morning = uuidv7(sources(Date.UTC(2026, 6, 26, 7, 0, 0)));
		const noon = uuidv7(sources(Date.UTC(2026, 6, 26, 12, 0, 0)));
		const week = uuidv7(sources(Date.UTC(2026, 7, 2, 7, 0, 0)));

		expect([week, morning, noon].sort()).toEqual([morning, noon, week]);
	});

	it('does not repeat itself', () => {
		const ids = new Set(Array.from({ length: 500 }, () => uuidv7()));

		expect(ids.size).toBe(500);
	});
});
