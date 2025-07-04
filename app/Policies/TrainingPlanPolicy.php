<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\TrainingPlan;
use App\Models\User;

class TrainingPlanPolicy
{
    /**
     * Determine whether the user can view any training plans.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAthlete();
    }

    /**
     * Determine whether the user can view the training plan.
     */
    public function view(User $user, TrainingPlan $trainingPlan): bool
    {
        return $user->isAthlete();
    }

    /**
     * Determine whether the user can create training plans.
     */
    public function create(User $user): bool
    {
        return $user->isAthlete();
    }

    /**
     * Determine whether the user can update the training plan.
     */
    public function update(User $user, TrainingPlan $trainingPlan): bool
    {
        return $user->isAthlete();
    }

    /**
     * Determine whether the user can delete the training plan.
     */
    public function delete(User $user, TrainingPlan $trainingPlan): bool
    {
        return $user->isAthlete();
    }

    /**
     * Determine whether the user can restore the training plan.
     */
    public function restore(User $user, TrainingPlan $trainingPlan): bool
    {
        return $user->isAthlete();
    }

    /**
     * Determine whether the user can permanently delete the training plan.
     */
    public function forceDelete(User $user, TrainingPlan $trainingPlan): bool
    {
        return $user->isAthlete();
    }

    /**
     * Determine whether the user can assign the training plan.
     */
    public function assign(User $user, TrainingPlan $trainingPlan): bool
    {
        return $user->isAthlete();
    }
} 