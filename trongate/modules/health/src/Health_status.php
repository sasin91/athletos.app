<?php
#[Api_schema(name: 'Health')]
final class Health_status {

    public function __construct(
        #[Api_field(example: 'ok')]
        public readonly string $status,
        #[Api_field(example: 'athletos-api')]
        public readonly string $service,
    ) {
    }
}
