<?php

namespace App\Http\Controllers;

use App\Models\TrainingPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TrainingPlanChatController extends Controller
{
    /**
     * Show the AI chat interface for creating new training plans
     */
    public function create()
    {
        Gate::authorize('create', TrainingPlan::class);
        
        return view('training-plans.chat.create');
    }

    /**
     * Show the AI chat interface for adjusting existing training plans
     */
    public function adjust(TrainingPlan $trainingPlan)
    {
        Gate::authorize('update', $trainingPlan);
        
        return view('training-plans.chat.adjust', compact('trainingPlan'));
    }

    /**
     * API endpoint to validate plan generation parameters
     */
    public function validatePlan(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'goal' => 'required|string',
            'experience_level' => 'required|string',
            'duration_weeks' => 'required|integer|min:1|max:52',
            'exercises' => 'required|array|min:1',
            'exercises.*' => 'required|string',
        ]);

        return response()->json(['valid' => true]);
    }
}