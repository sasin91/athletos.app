<?php

namespace App\Contracts;

use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;

interface TrainingPlan
{
    /**
     * Build a complete training plan for the given experience level
     */
    public function buildPlan(ExperienceLevel $level): array;

    /**
     * Get the phases for this training plan
     *
     * @return array<int, \App\Models\TrainingPhase>
     */
    public function getPhases(): array;

    /**
     * Check if this driver supports the given training goal
     */
    public function supports(TrainingGoal $goal): bool;

    /**
     * Get the name of this training plan
     */
    public function getName(): string;

    /**
     * Get the description of this training plan
     */
    public function getDescription(): string;

    /**
     * Get the supported experience levels for this plan
     *
     * @return array<int, ExperienceLevel>
     */
    public function getSupportedExperienceLevels(): array;
}