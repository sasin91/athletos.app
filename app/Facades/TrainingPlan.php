<?php

namespace App\Facades;

use App\Contracts\TrainingPlan as TrainingPlanContract;
use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;
use App\Managers\TrainingPlanManager;
use Illuminate\Support\Facades\Facade;

/**
 * @method static TrainingPlanContract driver(string $driver = null)
 * @method static TrainingPlanContract forGoal(TrainingGoal $goal)
 * @method static array getAvailableDrivers()
 * @method static array getAvailablePlanTypes()
 * @method static array getPlanInfo(string $planType)
 * @method static bool planTypeExists(string $planType)
 * @method static array buildPlan(ExperienceLevel $level)
 * @method static array getPhases()
 * @method static bool supports(TrainingGoal $goal)
 * @method static string getName()
 * @method static string getDescription()
 * @method static array getSupportedExperienceLevels()
 *
 * @see TrainingPlanManager
 */
class TrainingPlan extends Facade
{
    /**
     * Get the registered name of the component.
     */
    protected static function getFacadeAccessor(): string
    {
        return TrainingPlanManager::class;
    }
}