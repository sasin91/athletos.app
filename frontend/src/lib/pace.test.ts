import { describe, expect, it } from 'vitest';

import { projectedFinish } from './pace';

// The median itself is no longer computed here. Its cases live in Rust, in
// `backend/crates/api/src/pace.rs`, asserted against the same table of examples
// this file used to hold.
describe('projectedFinish', () => {
	it('has nothing to project without a pace', () => {
		expect(projectedFinish(1_000, 10, null)).toBeNull();
		expect(projectedFinish(1_000, 10, 0)).toBeNull();
	});

	it('is now, once there is nothing left to lift', () => {
		expect(projectedFinish(1_000, 0, 90)).toBe(1_000);
	});

	it('adds one median set for every set left', () => {
		expect(projectedFinish(0, 12, 90)).toBe(12 * 90 * 1000);
	});
});
