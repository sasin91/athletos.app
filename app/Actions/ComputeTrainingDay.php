<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Athlete;

final readonly class ComputeTrainingDay
{
    public function execute(Athlete $athlete): int
    {
        return $athlete
            ->trainings()
            ->whereNotNull('completed_at')
            ->count() + 1;
    }
}