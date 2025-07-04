<?php

namespace App\Http\Controllers;

use App\Models\TrainingPlan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TrainingPlanController extends Controller
{
    public function assign(Request $request, TrainingPlan $trainingPlan): RedirectResponse
    {
        Gate::authorize('assign', $trainingPlan);

        $request->user()->athlete->update([
            'current_plan_id' => $trainingPlan->id,
            'training_plan_id' => $trainingPlan->id,
        ]);

        $request->session()->flash('training_plan.name', $trainingPlan->name);

        return redirect()->route('dashboard');
    }
}
