<?php

namespace App\Http\Controllers;

use App\Enums\Exercise;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExerciseController extends Controller
{
    /**
     * Display the specified exercise
     */
    public function show(Exercise $exercise): \Inertia\Response
    {
        return Inertia::render('exercises/show', [
            'exercise' => $exercise,
            'exerciseData' => [
                'name' => __("exercises.{$exercise->value}.name"),
                'description' => __("exercises.{$exercise->value}.description"),
            ],
        ]);
    }
}
