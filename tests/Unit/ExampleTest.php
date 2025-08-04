<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('true is true', function () {
    expect(true)->toBeTrue();
});
