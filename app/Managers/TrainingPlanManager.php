<?php

namespace App\Managers;

use App\Contracts\TrainingPlan;
use App\Drivers\HypertrophyPlanDriver;
use App\Drivers\PowerliftingPlanDriver;
use App\Enums\TrainingGoal;
use Illuminate\Support\Manager;

class TrainingPlanManager extends Manager
{
    /**
     * Get the default driver name
     */
    public function getDefaultDriver(): string
    {
        return 'hypertrophy';
    }

    /**
     * Create an instance of the hypertrophy driver
     */
    public function createHypertrophyDriver(): TrainingPlan
    {
        return new HypertrophyPlanDriver();
    }

    /**
     * Create an instance of the powerlifting driver
     */
    public function createPowerliftingDriver(): TrainingPlan
    {
        return new PowerliftingPlanDriver();
    }

    /**
     * Get the best driver for the given training goal
     */
    public function forGoal(TrainingGoal $goal): TrainingPlan
    {
        $drivers = [
            'hypertrophy' => $this->driver('hypertrophy'),
            'powerlifting' => $this->driver('powerlifting'),
        ];

        foreach ($drivers as $driver) {
            if ($driver->supports($goal)) {
                return $driver;
            }
        }

        // Fallback to default driver
        return $this->driver();
    }

    /**
     * Get all available drivers
     *
     * @return array<string, TrainingPlan>
     */
    public function getAvailableDrivers(): array
    {
        return [
            'hypertrophy' => $this->driver('hypertrophy'),
            'powerlifting' => $this->driver('powerlifting'),
        ];
    }

    /**
     * Get all available plan types
     *
     * @return array<string>
     */
    public function getAvailablePlanTypes(): array
    {
        return ['hypertrophy', 'powerlifting'];
    }

    /**
     * Get plan information for a given plan type
     *
     * @return array{name: string, description: string, supported_levels: array<ExperienceLevel>}
     */
    public function getPlanInfo(string $planType): array
    {
        $driver = $this->driver($planType);
        
        return [
            'name' => $driver->getName(),
            'description' => $driver->getDescription(),
            'supported_levels' => $driver->getSupportedExperienceLevels(),
        ];
    }

    /**
     * Check if a plan type exists
     */
    public function planTypeExists(string $planType): bool
    {
        return in_array($planType, $this->getAvailablePlanTypes());
    }
}