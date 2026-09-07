import { describe, expect, it } from 'vitest';
import { safeDestination } from './auth-destination';

describe('sign-in destination', () => {
	it('preserves a shared workout path', () => {
		expect(safeDestination('/shared/workouts/opaque')).toBe('/shared/workouts/opaque');
	});
	it.each(['https://other.test', '//other.test', '/\\other.test', '/\n/other.test'])(
		'rejects browser-normalized external destination %j',
		(value) => {
			expect(safeDestination(value, '/maxes')).toBe('/maxes');
		}
	);
	it('keeps the normal registration destination when no intent was supplied', () => {
		expect(safeDestination(null, '/maxes')).toBe('/maxes');
	});
});
