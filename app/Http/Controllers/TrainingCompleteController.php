<?php

namespace App\Http\Controllers;

use App\Actions\CompleteTraining;
use App\Http\Requests\TrainingCompleteRequest;
use App\Models\Training;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

class TrainingCompleteController extends Controller
{
    public function __construct(
        private CompleteTraining $completeTraining
    ) {}

    /**
     * Display the training completion page
     */
    public function show(Training $training): \Illuminate\View\View|\Illuminate\Http\RedirectResponse
    {
        Gate::authorize('viewComplete', $training);

        // Ensure training is completed
        if (!$training->completed_at) {
            return redirect()->route('trainings.show', $training);
        }

        // Load the training with all necessary relationships including completed exercises
        $training->load([
            'trainingPlan',
            'athlete.user',
            'exercises' // Load the completed exercises
        ]);

        return view('trainings.complete', compact('training'));
    }

    public function store(TrainingCompleteRequest $request, Training $training): RedirectResponse
    {
        Gate::authorize('complete', $training);

        $this->completeTraining->execute(
            training: $training,
            exercises: $request->input('exercises', []),
            mood: $request->input('mood'),
            energyLevel: $request->input('energy_level')
        );

        $request->session()->flash('training.id', $training->id);
        $request->session()->flash('success', 'Training completed successfully! Great work!');

        return redirect()->route('trainings.complete.show', $training);
    }
} 