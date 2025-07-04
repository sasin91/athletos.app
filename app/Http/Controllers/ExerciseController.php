<?php

namespace App\Http\Controllers;

use App\Enums\Exercise;
use Illuminate\Http\Request;

class ExerciseController extends Controller
{
    /**
     * Display the specified exercise
     */
    public function show(Exercise $exercise): \Illuminate\View\View
    {
        return view('exercises.show', [
            'exercise' => $exercise,
        ]);
    }
} 