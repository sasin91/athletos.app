<?php

namespace App\Http\Controllers;

use App\Enums\Exercise;
use Illuminate\Http\Request;
use Inertia\Response;
use Inertia\Inertia;

class ExerciseController extends Controller
{
    /**
     * Display the specified exercise
     */
    public function show(Exercise $exercise): Response
    {
        return inertia('exercises/show', [
            'exercise' => [
                'value' => $exercise->value,
                'displayName' => $exercise->displayName(),
                'description' => $exercise->description(),
                'category' => $exercise->category()->value,
                'difficulty' => $exercise->difficulty()->value,
                'tags' => $exercise->tags(),
                'cues' => $exercise->cues(),
            ],
            'exerciseData' => [
                'name' => __("exercises.{$exercise->value}.name"),
                'description' => __("exercises.{$exercise->value}.description"),
            ],
        ]);
    }
}
