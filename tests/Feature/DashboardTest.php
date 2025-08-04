<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function dashboard_returns_inertia_response()
    {
        $user = User::factory()
            ->athlete()
            ->create(['email' => 'jonas.kerwin.hansen@gmail.com']);

        $response = $this->actingAs($user)
            ->get('/dashboard');

        $response->assertOk();
    }

    #[Test]
    public function chat_returns_inertia_response()
    {
        $user = User::factory()
            ->athlete()
            ->create(['email' => 'jonas.kerwin.hansen@gmail.com']);

        $response = $this->actingAs($user)
            ->get('/chat');

        $response->assertOk();
    }
}