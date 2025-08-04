<?php

namespace App\Providers;

use App\Enums\UserRole;
use App\Models\Athlete;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Training;
use App\Models\TrainingPlan;
use App\Models\User;
use App\Policies\AthletePolicy;
use App\Policies\ChatMessagePolicy;
use App\Policies\ChatSessionPolicy;
use App\Policies\TrainingPolicy;
use App\Policies\TrainingPlanPolicy;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\Onboard\Facades\Onboard;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register policies
        Gate::policy(Training::class, TrainingPolicy::class);
        Gate::policy(Athlete::class, AthletePolicy::class);
        Gate::policy(TrainingPlan::class, TrainingPlanPolicy::class);
        Gate::policy(ChatSession::class, ChatSessionPolicy::class);
        Gate::policy(ChatMessage::class, ChatMessagePolicy::class);

        // Define a gate for athlete dashboard access
        Gate::define('isAthlete', function (User $user) {
            return $user->isAthlete();
        });

        // Register component namespaces
        Blade::componentNamespace('App\\View\\Components\\Onboarding', 'onboarding');

        // Configure onboarding steps
        $this->configureOnboarding();
    }

    /**
     * Configure the onboarding flow for athletes
     */
    private function configureOnboarding(): void
    {
        Onboard::addStep('Complete Profile Information')
            ->link('/onboarding/profile')
            ->cta('Set Profile')
            ->completeIf(function (User $model) {
                return $model->athlete && 
                       $model->athlete->experience_level && 
                       $model->athlete->primary_goal;
            });

        Onboard::addStep('Choose Training Plan')
            ->link('/onboarding/plan')  
            ->cta('Select Plan')
            ->completeIf(function (User $model) {
                return $model->athlete && $model->athlete->current_plan_id;
            });

        Onboard::addStep('Set Training Schedule')
            ->link('/onboarding/schedule')
            ->cta('Set Schedule')
            ->completeIf(function (User $model) {
                return $model->athlete && 
                       $model->athlete->training_days && 
                       $model->athlete->preferred_time && 
                       $model->athlete->session_duration;
            });

        Onboard::addStep('Enter Current Stats')
            ->link('/onboarding/stats')
            ->cta('Add Stats')
            ->completeIf(function (User $model) {
                // This step is optional - always complete if athlete profile exists
                return $model->athlete !== null;
            });

        Onboard::addStep('Set Preferences')
            ->link('/onboarding/preferences')
            ->cta('Set Preferences')
            ->completeIf(function (User $model) {
                return $model->athlete && $model->athlete->difficulty_preference;
            });
    }
}
