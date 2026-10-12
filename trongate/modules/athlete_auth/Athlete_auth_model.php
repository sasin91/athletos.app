<?php
class Athlete_auth_model extends Model {

    /**
     * Whether the athlete a verified token names may still use it.
     *
     * Two checks in one round-trip, because this runs on every authenticated
     * request: the athlete exists and is not soft-deleted (their token may
     * still be inside its lifetime; this is what stops it working), and the
     * token's `jti` has not been revoked. A revoked token yields no row, which
     * is answered exactly like an unknown athlete: 401.
     */
    public function athlete_if_active(string $athlete_id, string $jti): bool {
        $rows = $this->db->query_bind(
            'select a.id
             from athletes a
             where a.id = :athlete_id
               and a.deleted_at is null
               and not exists (
                   select 1 from access_token_denylist d where d.jti = :jti
               )',
            ['athlete_id' => $athlete_id, 'jti' => $jti],
            'array'
        );

        return $rows !== [];
    }
}
