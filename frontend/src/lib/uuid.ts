/**
 * UUIDv7, minted on the phone before the session starts (D-09).
 *
 * The workout id is the idempotency key for `POST /v1/workouts`, and it has to
 * exist before there is a network to ask for one — a queued submit that is
 * retried must carry the *same* id, or the retry advances the program a second
 * time and a 5/3/1 training max moves 5 kg instead of 2.5, silently and
 * permanently.
 *
 * v7 rather than v4 because the ids are the primary key of a growing table and
 * time-ordered keys cluster in its btree. The API does not check the version —
 * refusing a v4 would strand a queued workout in a retry loop nothing could get
 * it out of — so this is a convention kept on the client's side of the wire.
 *
 * Layout (RFC 9562 §5.7):
 *
 *     0                   1                   2                   3
 *     unix_ts_ms (48 bits) | ver (4) | rand_a (12) | var (2) | rand_b (62)
 */

/** Everything impure, injected so the generator can be tested. */
export type UuidV7Sources = {
	/** Milliseconds since the epoch. */
	now: () => number;
	/** Fills a byte array with random values, `crypto.getRandomValues`-shaped. */
	randomBytes: (into: Uint8Array<ArrayBuffer>) => void;
};

const defaultSources: UuidV7Sources = {
	now: () => Date.now(),
	randomBytes: (into) => {
		crypto.getRandomValues(into);
	}
};

const HEX = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0'));

/**
 * A fresh UUIDv7 in canonical hyphenated form.
 *
 * Two calls in the same millisecond differ in `rand_a`/`rand_b` and are
 * therefore distinct, but are not guaranteed to be ordered relative to each
 * other. That is fine here: ids are minted once per session, not in a loop.
 */
export function uuidv7(sources: UuidV7Sources = defaultSources): string {
	const bytes = new Uint8Array(16);
	sources.randomBytes(bytes);

	const timestamp = Math.max(0, Math.floor(sources.now()));

	// 48 bits of milliseconds, big-endian. Written with division rather than
	// shifts because `<<` in JavaScript is a 32-bit operation and the timestamp
	// is not.
	bytes[0] = Math.floor(timestamp / 2 ** 40) & 0xff;
	bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff;
	bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff;
	bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff;
	bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff;
	bytes[5] = timestamp & 0xff;

	// Version 7 in the high nibble of byte 6, RFC 4122 variant in byte 8.
	bytes[6] = (bytes[6] & 0x0f) | 0x70;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const hex = Array.from(bytes, (byte) => HEX[byte]).join('');

	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20, 32)
	].join('-');
}

/** The 48-bit timestamp back out of a v7 id, in milliseconds. */
export function uuidv7Timestamp(id: string): number {
	return Number.parseInt(id.replace(/-/g, '').slice(0, 12), 16);
}
