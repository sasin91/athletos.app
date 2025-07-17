<?php

use App\Http\Controllers\Settings;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TrainingController;

use App\Http\Middleware\EnsureAthleteIsOnboarded;
use Illuminate\Support\Facades\Auth;

Route::get('/', function () {
    return view('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware(EnsureAthleteIsOnboarded::class)->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
        
        Route::get('trainings', [TrainingController::class, 'index'])->name('trainings.index');
        Route::post('trainings', [TrainingController::class, 'store'])->name('trainings.store');
        Route::get('trainings/{training}', App\Livewire\Training::class)->name('trainings.show');
        
        Route::get('training-plans/create', [App\Http\Controllers\TrainingPlanController::class, 'create'])->name('training-plans.create');
        Route::post('training-plans', [App\Http\Controllers\TrainingPlanController::class, 'store'])->name('training-plans.store');
        Route::get('training-plans/{trainingPlan}', [App\Http\Controllers\TrainingPlanController::class, 'show'])->name('training-plans.show');
        Route::post('training-plans/{trainingPlan}/assign', [App\Http\Controllers\TrainingPlanController::class, 'assign'])->name('training-plans.assign');

        Route::get('exercises/{exercise:slug}', [App\Http\Controllers\ExerciseController::class, 'show'])->name('exercises.show');
        
        Route::get('settings/athlete-profile', [Settings\AthleteProfileController::class, 'edit'])->name('settings.athlete-profile.edit');
        Route::put('settings/athlete-profile', [Settings\AthleteProfileController::class, 'update'])->name('settings.athlete-profile.update');
    });
    
    // Onboarding routes - individual pages for each step
    Route::prefix('onboarding')->name('onboarding.')->group(function () {
        Route::get('profile', [App\Http\Controllers\OnboardingController::class, 'profile'])->name('profile');
        Route::post('profile', [App\Http\Controllers\OnboardingController::class, 'storeProfile'])->name('profile.store');
        
        Route::get('plan', [App\Http\Controllers\OnboardingController::class, 'plan'])->name('plan');
        Route::post('plan', [App\Http\Controllers\OnboardingController::class, 'storePlan'])->name('plan.store');
        
        Route::get('schedule', [App\Http\Controllers\OnboardingController::class, 'schedule'])->name('schedule');
        Route::post('schedule', [App\Http\Controllers\OnboardingController::class, 'storeSchedule'])->name('schedule.store');
        
        Route::get('stats', [App\Http\Controllers\OnboardingController::class, 'stats'])->name('stats');
        Route::post('stats', [App\Http\Controllers\OnboardingController::class, 'storeStats'])->name('stats.store');
        
        Route::get('preferences', [App\Http\Controllers\OnboardingController::class, 'preferences'])->name('preferences');
        Route::post('preferences', [App\Http\Controllers\OnboardingController::class, 'storePreferences'])->name('preferences.store');
    });
    
    
    // Settings routes
    Route::get('settings/profile', [Settings\ProfileController::class, 'edit'])->name('settings.profile.edit');
    Route::match(['put', 'patch'], 'settings/profile', [Settings\ProfileController::class, 'update'])->name('settings.profile.update');
    Route::delete('settings/profile', [Settings\ProfileController::class, 'destroy'])->name('settings.profile.destroy');
    Route::get('settings/password', [Settings\PasswordController::class, 'edit'])->name('settings.password.edit');
    Route::put('settings/password', [Settings\PasswordController::class, 'update'])->name('settings.password.update');
    Route::get('settings/appearance', [Settings\AppearanceController::class, 'edit'])->name('settings.appearance.edit');
});

Route::view('/terms', 'terms')->name('terms');
Route::view('/privacy', 'privacy')->name('privacy');
Route::view('/about', 'about')->name('about');

require __DIR__.'/auth.php';
