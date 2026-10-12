<?php
/**
 * A verified athlete: what an authenticated operation receives as `$principal`.
 *
 * Deliberately just the id, as in the Rust API: v1 has one athlete per account
 * and no teams (D-14), so there is nothing else an authorization decision needs.
 */
final class Authenticated_athlete {

    public function __construct(
        public readonly string $athlete_id,
    ) {
    }
}
