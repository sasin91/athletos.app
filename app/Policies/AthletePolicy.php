<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Athlete;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AthletePolicy
{
    public function viewDashboard(User $user, Athlete $athlete): Response
    {
        if (! $user->isAthlete()) {
            return Response::deny('Must be an athlete to view dashboard.');
        }

        if (! $user->is($athlete->user)) {
            return Response::deny("Cannot view another athlete's dashboard.");
        }

        if (! $user->onboarding()->finished()) {
            return Response::deny('Athlete onboarding not finished.');
        }

        return Response::allow();
    }

    /**
     * Determine whether the user can view any athletes.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAthlete();
    }

    /**
     * Determine whether the user can view the athlete.
     */
    public function view(User $user, Athlete $athlete): bool
    {
        return $user->isAthlete() && $user->id === $athlete->user_id;
    }

    /**
     * Determine whether the user can create athletes.
     */
    public function create(User $user): bool
    {
        return $user->isAthlete();
    }

    /**
     * Determine whether the user can update the athlete.
     */
    public function update(User $user, Athlete $athlete): bool
    {
        return $user->isAthlete() && $user->id === $athlete->user_id;
    }

    /**
     * Determine whether the user can delete the athlete.
     */
    public function delete(User $user, Athlete $athlete): bool
    {
        return $user->isAthlete() && $user->id === $athlete->user_id;
    }

    /**
     * Determine whether the user can restore the athlete.
     */
    public function restore(User $user, Athlete $athlete): bool
    {
        return $user->isAthlete() && $user->id === $athlete->user_id;
    }

    /**
     * Determine whether the user can permanently delete the athlete.
     */
    public function forceDelete(User $user, Athlete $athlete): bool
    {
        return $user->isAthlete() && $user->id === $athlete->user_id;
    }
}
