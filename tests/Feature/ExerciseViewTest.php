<?php

use App\Enums\Exercise;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Athlete;

uses(RefreshDatabase::class);

it('has react pages for all exercises', function () {
    $user = User::factory()->athlete()->create();

    $exercises = Exercise::cases();
    
    expect(count($exercises))->toBeGreaterThan(0, 'No exercises found in enum');
    
    foreach ($exercises as $exercise) {
        $response = $this->actingAs($user)->get("/exercises/{$exercise->value}");
        
        $response->assertOk();
    }
});

it('allows exercise pages to be accessible', function () {
    $user = User::factory()->athlete()->create();

    $exercise = Exercise::Deadlift;
    expect($exercise)->not->toBeNull('Deadlift exercise not found');
    
    $response = $this->actingAs($user)->get("/exercises/{$exercise->value}");
    
    $response->assertOk();
});

it('returns 200 for all exercise pages', function () {
    $user = User::factory()->athlete()->create();
    
    $exercises = Exercise::cases();
    
    foreach ($exercises as $exercise) {
        $response = $this->actingAs($user)->get("/exercises/{$exercise->value}");
        $response->assertOk();
    }
}); 