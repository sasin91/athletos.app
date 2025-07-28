<?php

use App\Http\Controllers\Settings;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExerciseController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\TrainingController;
use App\Http\Controllers\TrainingPlanController;
use App\Http\Middleware\EnsureAthleteIsOnboarded;

Route::get('/', HomeController::class)->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware(EnsureAthleteIsOnboarded::class)->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::get('trainings', [TrainingController::class, 'index'])->name('trainings.index');
        Route::post('trainings', [TrainingController::class, 'store'])->name('trainings.store');
        Route::get('trainings/{training}', [TrainingController::class, 'show'])->name('trainings.show');
        Route::get('trainings/{training}/complete', [TrainingController::class, 'complete'])->name('trainings.complete');
        Route::get('training-plans/create', [TrainingPlanController::class, 'create'])->name('training-plans.create');
        Route::post('training-plans', [TrainingPlanController::class, 'store'])->name('training-plans.store');
        Route::get('training-plans/{trainingPlan}', [TrainingPlanController::class, 'show'])->name('training-plans.show');
        Route::post('training-plans/{trainingPlan}/assign', [TrainingPlanController::class, 'assign'])->name('training-plans.assign');
        Route::get('exercises/{exercise:slug}', [ExerciseController::class, 'show'])->name('exercises.show');

        // Chat routes
        Route::get('chat', [ChatController::class, 'index'])->name('chat.index');
        Route::get('chat/{session}', [ChatController::class, 'index'])->name('chat.session');
        Route::post('chat/stream/start', [ChatController::class, 'startStream'])->name('chat.stream.start');
        Route::get('chat/stream/{streamId}', [ChatController::class, 'stream'])->name('chat.stream');

        // Dashboard actions
        Route::post('dashboard/start-training', [DashboardController::class, 'startTraining'])->name('dashboard.start-training');

        Route::get('settings/athlete-profile', [Settings\AthleteProfileController::class, 'edit'])->name('settings.athlete-profile.edit');
        Route::put('settings/athlete-profile', [Settings\AthleteProfileController::class, 'update'])->name('settings.athlete-profile.update');
    });

    // Onboarding routes - individual pages for each step
    Route::prefix('onboarding')->name('onboarding.')->group(function () {
        Route::get('profile', [OnboardingController::class, 'profile'])->name('profile');
        Route::post('profile', [OnboardingController::class, 'storeProfile'])->name('profile.store');

        Route::get('plan', [OnboardingController::class, 'plan'])->name('plan');
        Route::post('plan', [OnboardingController::class, 'storePlan'])->name('plan.store');

        Route::get('schedule', [OnboardingController::class, 'schedule'])->name('schedule');
        Route::post('schedule', [OnboardingController::class, 'storeSchedule'])->name('schedule.store');

        Route::get('stats', [OnboardingController::class, 'stats'])->name('stats');
        Route::post('stats', [OnboardingController::class, 'storeStats'])->name('stats.store');

        Route::get('preferences', [OnboardingController::class, 'preferences'])->name('preferences');
        Route::post('preferences', [OnboardingController::class, 'storePreferences'])->name('preferences.store');
    });


    // Settings routes
    Route::get('settings/profile', [Settings\ProfileController::class, 'edit'])->name('settings.profile.edit');
    Route::match(['put', 'patch'], 'settings/profile', [Settings\ProfileController::class, 'update'])->name('settings.profile.update');
    Route::delete('settings/profile', [Settings\ProfileController::class, 'destroy'])->name('settings.profile.destroy');
    Route::get('settings/password', [Settings\PasswordController::class, 'edit'])->name('settings.password.edit');
    Route::put('settings/password', [Settings\PasswordController::class, 'update'])->name('settings.password.update');
    Route::get('settings/appearance', [Settings\AppearanceController::class, 'edit'])->name('settings.appearance.edit');
});

Route::get('/terms', fn() => \Inertia\Inertia::render('Terms'))->name('terms');
Route::get('/privacy', fn() => \Inertia\Inertia::render('Privacy'))->name('privacy');
Route::get('/about', fn() => \Inertia\Inertia::render('About'))->name('about');

require __DIR__ . '/auth.php';
