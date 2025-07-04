<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Gate;

class DashboardController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display the dashboard
     */
    public function index(#[CurrentUser] User $user): \Illuminate\View\View
    {
        Gate::authorize('isAthlete');

        return view('dashboard', [
            'athlete' => $user->athlete,
        ]);
    }
} 