<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Training;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Access\Response;

class TrainingPolicy
{
    /**
     * Determine whether the user can view any trainings.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAthlete();
    }

    /**
     * Determine whether the user can view the training.
     */
    public function view(User $user, Training $training): bool
    {
        return $user->isAthlete() && $user->id === $training->athlete->user_id;
    }

    /**
     * Determine whether the user can view the completed training.
     */
    public function viewComplete(User $user, Training $training): bool
    {
        return $user->isAthlete() && $user->id === $training->athlete->user_id;
    }

    /**
     * Determine whether the user can complete the training.
     */
    public function complete(User $user, Training $training): bool
    {
        return $user->isAthlete() && $user->id === $training->athlete->user_id;
    }

    /**
     * Determine whether the user can update the training.
     */
    public function update(User $user, Training $training): bool
    {
        return $user->isAthlete() && $user->id === $training->athlete->user_id;
    }

    /**
     * Determine whether the user can delete the training.
     */
    public function delete(User $user, Training $training): bool
    {
        return $user->isAthlete() && $user->id === $training->athlete->user_id;
    }

    public function create(User $user): Response
    {
        if (!$user->isAthlete() || !$user->athlete->currentPlan) {
            return Response::deny('Please complete your athlete onboarding first.');
        }

        $dayOfWeek = strtolower(Carbon::now()->format('l'));
        $trainingDays = $user->athlete->training_days ?? [];

        if (!in_array($dayOfWeek, $trainingDays)) {
            return Response::deny('No training scheduled for today.');
        }

        return Response::allow();
    }
} 