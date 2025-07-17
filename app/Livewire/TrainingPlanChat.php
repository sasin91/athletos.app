<?php

namespace App\Livewire;

use App\Actions\SuggestRepCounts;
use App\Data\PlannedExercise;
use App\Enums\Exercise;
use App\Enums\ExerciseCategory;
use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;
use App\Models\TrainingPlan;
use App\Settings\ExerciseConfig;
use App\Settings\TrainingPhaseSettings;
use Illuminate\Support\Collection;
use Livewire\Attributes\Validate;
use Livewire\Component;
use OpenAI\Laravel\Facades\OpenAI;

class TrainingPlanChat extends Component
{
    public ?TrainingPlan $basePlan = null;
    public ?TrainingPlan $generatedPlan = null;
    
    #[Validate('required|min:10')]
    public string $prompt = '';
    
    public array $messages = [];
    public string $currentResponse = '';
    public bool $isGenerating = false;
    public bool $showPlanPreview = false;
    
    public function mount(?TrainingPlan $basePlan = null)
    {
        $this->basePlan = $basePlan;
        
        if ($basePlan) {
            $this->messages[] = [
                'role' => 'system',
                'content' => "I'm ready to help you adjust the training plan '{$basePlan->name}'. What changes would you like to make?",
                'timestamp' => now(),
            ];
        } else {
            $this->messages[] = [
                'role' => 'system',
                'content' => "I'm ready to help you create a custom training plan. Tell me about your goals, experience level, and any specific requirements.",
                'timestamp' => now(),
            ];
        }
    }

    public function sendMessage()
    {
        $this->validate();
        
        // Add user message
        $this->messages[] = [
            'role' => 'user',
            'content' => $this->prompt,
            'timestamp' => now(),
        ];
        
        $userPrompt = $this->prompt;
        $this->prompt = '';
        $this->isGenerating = true;
        $this->currentResponse = '';
        
        // Generate AI response
        $this->generateResponse($userPrompt);
    }

    private function generateResponse(string $userPrompt)
    {
        try {
            $systemMessage = $this->buildSystemMessage();
            
            $response = OpenAI::chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    ['role' => 'system', 'content' => $systemMessage],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'temperature' => 0.7,
                'max_tokens' => 1000,
            ]);
            
            $aiResponse = $response->choices[0]->message->content;
            
            // Add AI response to messages
            $this->messages[] = [
                'role' => 'assistant',
                'content' => $aiResponse,
                'timestamp' => now(),
            ];
            
            // Check if the response includes a plan generation request
            if (str_contains(strtolower($aiResponse), 'generate') || str_contains(strtolower($aiResponse), 'create')) {
                $this->generateTrainingPlan($userPrompt);
            }
            
        } catch (\Exception $e) {
            $this->messages[] = [
                'role' => 'system',
                'content' => 'Sorry, I encountered an error. Please try again.',
                'timestamp' => now(),
            ];
        }
        
        $this->isGenerating = false;
    }

    private function buildSystemMessage(): string
    {
        $availableExercises = collect(Exercise::cases())->map(fn($exercise) => $exercise->value)->join(', ');
        $availableGoals = collect(TrainingGoal::cases())->map(fn($goal) => $goal->value)->join(', ');
        $availableExperienceLevels = collect(ExperienceLevel::cases())->map(fn($level) => $level->value)->join(', ');
        
        $systemMessage = "You are an expert fitness coach and training plan designer. ";
        
        if ($this->basePlan) {
            $systemMessage .= "You are helping to adjust an existing training plan called '{$this->basePlan->name}'. ";
            $systemMessage .= "The current plan has {$this->basePlan->phases->count()} phases and is designed for {$this->basePlan->goal->value} with {$this->basePlan->experience_level->value} experience level. ";
        } else {
            $systemMessage .= "You are helping to create a new training plan from scratch. ";
        }
        
        $systemMessage .= "

Available exercises: {$availableExercises}
Available training goals: {$availableGoals}
Available experience levels: {$availableExperienceLevels}

When creating or adjusting plans:
1. Consider the user's goals, experience level, and available time
2. Suggest appropriate exercises from the available list
3. Recommend realistic sets, reps, and rest periods
4. Structure plans with logical progression phases
5. Always prioritize safety and proper form
6. Be conversational and explain your recommendations

If the user wants to generate a plan, ask for confirmation and then create it.";

        return $systemMessage;
    }

    private function generateTrainingPlan(string $userPrompt)
    {
        // Extract plan parameters from user prompt using AI
        $planParams = $this->extractPlanParameters($userPrompt);
        
        // Create the training plan
        $plan = $this->createTrainingPlan($planParams);
        
        if ($plan) {
            $this->generatedPlan = $plan;
            $this->showPlanPreview = true;
            
            $this->messages[] = [
                'role' => 'system',
                'content' => "I've generated a training plan for you! You can preview it below and save it if you're satisfied.",
                'timestamp' => now(),
            ];
        }
    }

    private function extractPlanParameters(string $userPrompt): array
    {
        // Use AI to extract structured parameters from user prompt
        try {
            $response = OpenAI::chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Extract training plan parameters from user request. Return JSON with: name, goal, experience_level, duration_weeks, exercises (array of exercise names), and description.'
                    ],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'temperature' => 0.3,
                'max_tokens' => 500,
            ]);
            
            $jsonResponse = $response->choices[0]->message->content;
            $params = json_decode($jsonResponse, true);
            
            return $params ?: $this->getDefaultPlanParameters();
            
        } catch (\Exception $e) {
            return $this->getDefaultPlanParameters();
        }
    }

    private function getDefaultPlanParameters(): array
    {
        return [
            'name' => 'AI Generated Training Plan',
            'goal' => 'GeneralFitness',
            'experience_level' => 'Intermediate',
            'duration_weeks' => 8,
            'exercises' => ['BarbellBackSquat', 'FlatBarbellBenchPress', 'Deadlift'],
            'description' => 'A well-rounded training plan generated by AI',
        ];
    }

    private function createTrainingPlan(array $params): ?TrainingPlan
    {
        try {
            $plan = TrainingPlan::create([
                'name' => $params['name'] ?? 'AI Generated Plan',
                'description' => $params['description'] ?? 'Generated by AI assistant',
                'goal' => TrainingGoal::from($params['goal'] ?? 'GeneralFitness'),
                'experience_level' => ExperienceLevel::from($params['experience_level'] ?? 'Intermediate'),
                'default_progression_type' => \App\Enums\ProgressionType::Static,
                'default_progression_rate' => 2.5,
                'user_id' => auth()->id(),
            ]);
            
            // Create phases based on plan duration
            $this->createPhasesForPlan($plan, $params);
            
            return $plan;
            
        } catch (\Exception $e) {
            \Log::error('Failed to create training plan: ' . $e->getMessage());
            return null;
        }
    }

    private function createPhasesForPlan(TrainingPlan $plan, array $params): void
    {
        $totalWeeks = $params['duration_weeks'] ?? 8;
        $exercises = $params['exercises'] ?? ['BarbellBackSquat', 'FlatBarbellBenchPress', 'Deadlift'];
        
        // Create phases (typically 4-week phases)
        $phaseCount = ceil($totalWeeks / 4);
        
        for ($i = 1; $i <= $phaseCount; $i++) {
            $phaseWeeks = min(4, $totalWeeks - (($i - 1) * 4));
            
            $phase = $plan->phases()->create([
                'name' => "Phase {$i}",
                'description' => $this->getPhaseDescription($i, $phaseCount),
                'duration_weeks' => $phaseWeeks,
                'order' => $i,
            ]);
            
            // Create exercise configurations for this phase
            $exerciseConfigs = $this->createExerciseConfigs($exercises, $i, $plan->experience_level);
            
            $phase->update([
                'settings' => new TrainingPhaseSettings(
                    exercises: $exerciseConfigs,
                    notes: "Phase {$i} - AI Generated",
                    metadata: ['ai_generated' => true]
                )
            ]);
        }
    }

    private function getPhaseDescription(int $phaseNumber, int $totalPhases): string
    {
        if ($totalPhases == 1) {
            return "Complete training phase";
        }
        
        return match($phaseNumber) {
            1 => "Foundation building phase",
            2 => "Strength development phase",
            3 => "Intensification phase",
            default => "Peak performance phase"
        };
    }

    private function createExerciseConfigs(array $exercises, int $phaseNumber, ExperienceLevel $experienceLevel): array
    {
        $configs = [];
        $repSuggester = app(SuggestRepCounts::class);
        
        foreach ($exercises as $index => $exerciseName) {
            try {
                $exercise = Exercise::from($exerciseName);
                
                // Get suggested reps for this exercise
                $suggestedReps = $repSuggester->execute(
                    new \App\Models\Athlete(['experience_level' => $experienceLevel]),
                    $exercise,
                    1
                );
                
                // Progressive sets and intensity based on phase
                $sets = min(5, 2 + $phaseNumber);
                $baseWeight = $this->getBaseWeight($exercise);
                
                $configs[] = new ExerciseConfig(
                    exercise: $exerciseName,
                    sets: $sets,
                    reps: $suggestedReps[0] ?? 8,
                    weight: $baseWeight,
                    rest_seconds: $this->getRestSeconds($exercise),
                    notes: "AI suggested exercise",
                    metadata: ['ai_generated' => true],
                    day: ($index % 3) + 1, // Distribute across 3 days
                    cues: $exercise->cues()
                );
                
            } catch (\Exception $e) {
                \Log::warning("Failed to create config for exercise: {$exerciseName}");
            }
        }
        
        return $configs;
    }

    private function getBaseWeight(Exercise $exercise): float
    {
        return match($exercise->category()) {
            ExerciseCategory::Strength => 20.0,
            ExerciseCategory::Hypertrophy => 15.0,
            default => 10.0
        };
    }

    private function getRestSeconds(Exercise $exercise): int
    {
        return match($exercise->category()) {
            ExerciseCategory::Strength => 180,
            ExerciseCategory::Hypertrophy => 120,
            default => 90
        };
    }

    public function savePlan()
    {
        if (!$this->generatedPlan) {
            return;
        }
        
        $this->messages[] = [
            'role' => 'system',
            'content' => "Training plan '{$this->generatedPlan->name}' has been saved successfully! You can now assign it to athletes.",
            'timestamp' => now(),
        ];
        
        $this->showPlanPreview = false;
        $this->dispatch('plan-saved', planId: $this->generatedPlan->id);
    }

    public function discardPlan()
    {
        if ($this->generatedPlan) {
            $this->generatedPlan->delete();
            $this->generatedPlan = null;
        }
        
        $this->showPlanPreview = false;
        
        $this->messages[] = [
            'role' => 'system',
            'content' => "Plan discarded. Feel free to ask for adjustments or create a new plan.",
            'timestamp' => now(),
        ];
    }

    public function render()
    {
        return view('livewire.training-plan-chat');
    }
}