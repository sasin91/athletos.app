<?php
/**
 * Liveness and readiness probes.
 *
 * Unversioned, as in the Rust API: they are read by orchestrators, not
 * clients, and an orchestrator must not have to follow an API version bump.
 */
class Health extends Trongate {

    /**
     * The service name is the Rust API's, on purpose: whatever reads these
     * probes cannot tell which implementation answered, and must not need to.
     */
    private const SERVICE = 'athletos-api';

    #[OpenAPI(
        path: '/health',
        description: 'Liveness probe — answers as long as the process is serving requests.',
        operation_id: 'health',
        responses: [200 => ['The process is alive', Health_status::class]],
    )]
    public function health(): Health_status {
        return new Health_status('ok', self::SERVICE);
    }

    #[OpenAPI(
        path: '/health/ready',
        description: <<<'TXT'
            Readiness probe — additionally verifies the database is reachable, so an
            orchestrator does not route traffic to an instance that cannot serve it.
            TXT,
        operation_id: 'ready',
        responses: [200 => ['Dependencies are reachable', Health_status::class], 500 => 'A dependency is unreachable'],
    )]
    public function ready(): Health_status {
        $this->model->db->query('select 1');
        return new Health_status('ready', self::SERVICE);
    }
}
