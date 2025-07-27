<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BonusActivity;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function edit(Request $request): \Inertia\Response
    {
        return Inertia::render('settings/profile', [
            'user' => $request->user(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($user->id),
            ],
        ]);

        $user->fill($validated);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return to_route('settings.profile.edit')->with('status', __('Profile updated successfully'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        DB::transaction(function () use ($user) {
            // Delete related records in the correct order to avoid foreign key constraint violations
            if ($user->athlete) {
                // Delete performance indicators first
                $user->athlete->performanceIndicators()->delete();

                // Delete trainings
                $user->athlete->trainings()->delete();

                // Delete bonus activities
                $user->athlete->bonusActivities()->delete();

                // Delete the athlete
                $user->athlete->delete();
            }

            // Delete any bonus activities scheduled by this user
            BonusActivity::where('scheduled_by', $user->id)->delete();

            // Finally delete the user
            $user->delete();
        });

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('home');
    }
}
