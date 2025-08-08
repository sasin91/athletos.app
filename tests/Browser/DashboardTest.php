<?php

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\be;

it('sees the dashboard', function () {
    $user = User::factory()
        ->athlete()
        ->create(['email' => 'jonas.kerwin.hansen@gmail.com']);

    be($user);

    visit(route('dashboard'))
        ->assertNoSmoke();
});
