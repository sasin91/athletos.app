<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Training;
use App\Models\User;
use App\Actions\CalculateTrainingOffset;
use Carbon\Carbon;
use Illuminate\Auth\Access\Response;

class TrainingPolicy
{
    public function __construct(
        private CalculateTrainingOffset $calculateTrainingOffset,
    ) {}

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
        return $user->isAthlete() && 
               $user->id === $training->athlete->user_id &&
               $training->completed_at !== null;
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

        // Optionally, check if the athlete has already completed all scheduled workouts for the plan
        // (This can be omitted if you want to allow unlimited training creation)
        //
        // Example: Only allow if there is an uncompleted training for today or in the future
        // $hasUncompleted = $user->athlete->trainings()->whereNull('completed_at')->exists();
        // if (!$hasUncompleted) {
        //     return Response::deny('No scheduled training available.');
        // }

        $startDate = $user->athlete->plan_start_date ? \Carbon\Carbon::instance($user->athlete->plan_start_date) : Carbon::now();
        if (!$this->calculateTrainingOffset->shouldTrainOnDate($user->athlete->training_frequency, Carbon::now(), $startDate)) {
            return Response::deny('This is a recovery week. No training scheduled for today.');
        }

        return Response::allow();
    }
} 