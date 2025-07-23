<?php

namespace App\Services;

use App\Models\ChatSession;
use App\Models\ChatMessage;
use App\Models\TrainingPlan;
use App\Enums\ChatSessionType;
use App\Enums\ChatMessageRole;
use App\Enums\Exercise;
use App\Enums\TrainingGoal;
use App\Enums\ExperienceLevel;
use App\Enums\ExerciseCategory;
use App\Actions\SuggestRepCounts;
use App\Settings\ExerciseConfig;
use App\Settings\TrainingPhaseSettings;
use OpenAI\Laravel\Facades\OpenAI;

class TrainingChatService
{
    public function __construct(
        private SuggestRepCounts $repSuggester
    ) {}

    /**
     * Create a new chat session for training plan conversation
     */
    public function createSession(
        int $userId,
        ChatSessionType $type = ChatSessionType::TrainingPlan,
        ?TrainingPlan $basePlan = null
    ): ChatSession {
        $session = ChatSession::create([
            'user_id' => $userId,
            'type' => $type,
            'training_plan_id' => $basePlan?->id,
            'context' => [
                'base_plan' => $basePlan ? [
                    'id' => $basePlan->id,
                    'name' => $basePlan->name,
                    'goal' => $basePlan->goal->value,
                    'experience_level' => $basePlan->experience_level->value,
                    'phases_count' => $basePlan->phases->count(),
                ] : null,
            ],
            'last_activity_at' => now(),
        ]);

        // Add initial system message
        $this->addSystemMessage($session, $this->getInitialSystemMessage($basePlan));

        return $session;
    }

    /**
     * Build comprehensive system message with context
     */
    public function buildSystemMessage(?TrainingPlan $basePlan = null): string
    {
        $availableExercises = collect(Exercise::cases())->map(fn($exercise) => $exercise->value)->join(', ');
        $availableGoals = collect(TrainingGoal::cases())->map(fn($goal) => $goal->value)->join(', ');
        $availableExperienceLevels = collect(ExperienceLevel::cases())->map(fn($level) => $level->value)->join(', ');
        
        $systemMessage = "You are an expert fitness coach and training plan designer with deep knowledge of exercise science, periodization, and personalized program design. ";
        
        if ($basePlan) {
            $systemMessage .= "You are helping to adjust an existing training plan called '{$basePlan->name}'. ";
            $systemMessage .= "The current plan has {$basePlan->phases->count()} phases and is designed for {$basePlan->goal->value} with {$basePlan->experience_level->value} experience level. ";
            $systemMessage .= "Focus on making intelligent modifications while preserving the plan's core structure and progression. ";
        } else {
            $systemMessage .= "You are helping to create a new training plan from scratch. ";
            $systemMessage .= "Focus on understanding the user's goals, constraints, and preferences to design an optimal program. ";
        }
        
        $systemMessage .= "

AVAILABLE RESOURCES:
• Exercises: {$availableExercises}
• Training Goals: {$availableGoals}
• Experience Levels: {$availableExperienceLevels}

CORE PRINCIPLES:
1. **Safety First**: Always prioritize proper form and injury prevention
2. **Progressive Overload**: Ensure logical progression in volume, intensity, or complexity
3. **Specificity**: Match exercises and parameters to the stated goals
4. **Individual Adaptation**: Consider experience level, time constraints, and preferences
5. **Recovery**: Balance training stress with adequate recovery periods
6. **Adherence**: Design programs that are realistic and sustainable

INTERACTION GUIDELINES:
• Be conversational and explain your reasoning
• Ask clarifying questions when needed
• Provide specific, actionable recommendations
• Include sets, reps, rest periods, and progression strategies
• Structure plans with logical phases (typically 4-week blocks)
• Consider exercise selection, frequency, and periodization

RESPONSE FORMAT:
• For general discussion: Provide clear, educational responses
• For plan requests: Confirm parameters before generating
• For modifications: Explain the rationale behind changes
• Always be specific about exercise parameters and progression

Remember: You're not just creating workouts, you're designing comprehensive training systems that will help users achieve their goals safely and effectively.";

        return $systemMessage;
    }

    /**
     * Extract structured parameters from natural language using AI
     */
    public function extractPlanParameters(string $userPrompt): array
    {
        try {
            $response = OpenAI::chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a parameter extraction specialist for fitness programs. Extract training plan parameters from the user\'s request and return a JSON object with the following structure:

{
    "name": "descriptive plan name",
    "goal": "one of: GeneralFitness, StrengthTraining, Hypertrophy, Powerlifting, WeightLoss, Endurance, Athletics",
    "experience_level": "one of: Beginner, Intermediate, Advanced",
    "duration_weeks": number (typically 4, 6, 8, 12, or 16),
    "exercises": ["array", "of", "exercise", "names", "from", "available", "list"],
    "description": "brief description of the plan\'s focus and approach",
    "special_considerations": ["any", "noted", "limitations", "or", "preferences"]
}

Available exercises: ' . collect(Exercise::cases())->map(fn($e) => $e->value)->join(', ') . '

If information is missing or unclear, use intelligent defaults based on context clues. Always return valid JSON.'
                    ],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'temperature' => 0.3,
                'max_tokens' => 600,
            ]);
            
            $jsonResponse = $response->choices[0]->message->content;
            $params = json_decode($jsonResponse, true);
            
            return $this->validateAndNormalizePlanParameters($params ?: []);
            
        } catch (\Exception $e) {
            \Log::warning('AI parameter extraction failed: ' . $e->getMessage());
            return $this->getDefaultPlanParameters();
        }
    }

    /**
     * Generate conversational AI response
     */
    public function generateResponse(ChatSession $session, string $userPrompt): string
    {
        try {
            $systemMessage = $this->buildSystemMessage($session->trainingPlan);
            $conversationHistory = $this->buildConversationHistory($session);
            
            $messages = array_merge(
                [['role' => 'system', 'content' => $systemMessage]],
                $conversationHistory,
                [['role' => 'user', 'content' => $userPrompt]]
            );

            $response = OpenAI::chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => $messages,
                'temperature' => 0.7,
                'max_tokens' => 1200,
            ]);
            
            return $response->choices[0]->message->content;
            
        } catch (\Exception $e) {
            \Log::error('Chat response generation failed: ' . $e->getMessage());
            return 'I apologize, but I encountered an error processing your request. Please try rephrasing your question or try again in a moment.';
        }
    }

    /**
     * Create training plan from extracted parameters
     */
    public function createTrainingPlan(array $params, int $userId): ?TrainingPlan
    {
        try {
            $plan = TrainingPlan::create([
                'name' => $params['name'],
                'description' => $params['description'],
                'goal' => TrainingGoal::from($params['goal']),
                'experience_level' => ExperienceLevel::from($params['experience_level']),
                'default_progression_type' => \App\Enums\ProgressionType::Static,
                'default_progression_rate' => 2.5,
                'user_id' => $userId,
            ]);
            
            $this->createPhasesForPlan($plan, $params);
            
            return $plan->fresh(['phases']);
            
        } catch (\Exception $e) {
            \Log::error('Failed to create training plan: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Add message to chat session
     */
    public function addMessage(
        ChatSession $session,
        ChatMessageRole $role,
        string $content,
        ?array $metadata = null,
        ?TrainingPlan $trainingPlan = null
    ): ChatMessage {
        $message = $session->messages()->create([
            'role' => $role,
            'content' => $content,
            'metadata' => $metadata,
            'training_plan_id' => $trainingPlan?->id,
            'completed_at' => now(),
        ]);

        $session->updateActivity();

        return $message;
    }

    public function addSystemMessage(ChatSession $session, string $content): ChatMessage
    {
        return $this->addMessage($session, ChatMessageRole::System, $content);
    }

    public function addUserMessage(ChatSession $session, string $content): ChatMessage
    {
        return $this->addMessage($session, ChatMessageRole::User, $content);
    }

    public function addAssistantMessage(
        ChatSession $session,
        string $content,
        ?array $metadata = null,
        ?TrainingPlan $trainingPlan = null
    ): ChatMessage {
        return $this->addMessage($session, ChatMessageRole::Assistant, $content, $metadata, $trainingPlan);
    }

    /**
     * Private helper methods
     */
    private function getInitialSystemMessage(?TrainingPlan $basePlan = null): string
    {
        if ($basePlan) {
            return "I'm ready to help you adjust the training plan '{$basePlan->name}'. I can modify exercises, adjust sets and reps, change the progression, or help with any other aspects of your program. What changes would you like to make?";
        }
        
        return "I'm ready to help you create a personalized training plan! I'll need to understand your goals, experience level, available time, and any preferences or limitations you have. What kind of training are you looking to do?";
    }

    private function buildConversationHistory(ChatSession $session, int $limit = 10): array
    {
        return $session->messages()
            ->where('role', '!=', ChatMessageRole::System)
            ->latest()
            ->limit($limit)
            ->get()
            ->reverse()
            ->map(fn($message) => [
                'role' => $message->role->value,
                'content' => $message->content,
            ])
            ->toArray();
    }

    private function validateAndNormalizePlanParameters(array $params): array
    {
        $defaults = $this->getDefaultPlanParameters();
        
        return [
            'name' => $params['name'] ?? $defaults['name'],
            'goal' => $this->validateEnum($params['goal'] ?? null, TrainingGoal::class, $defaults['goal']),
            'experience_level' => $this->validateEnum($params['experience_level'] ?? null, ExperienceLevel::class, $defaults['experience_level']),
            'duration_weeks' => max(4, min(20, intval($params['duration_weeks'] ?? $defaults['duration_weeks']))),
            'exercises' => $this->validateExercises($params['exercises'] ?? $defaults['exercises']),
            'description' => $params['description'] ?? $defaults['description'],
            'special_considerations' => $params['special_considerations'] ?? [],
        ];
    }

    private function validateEnum(mixed $value, string $enumClass, string $default): string
    {
        if (!$value) return $default;
        
        try {
            $enumClass::from($value);
            return $value;
        } catch (\Exception) {
            return $default;
        }
    }

    private function validateExercises(array $exercises): array
    {
        $validExercises = collect(Exercise::cases())->map(fn($e) => $e->value)->toArray();
        $filtered = array_intersect($exercises, $validExercises);
        
        return empty($filtered) ? $this->getDefaultPlanParameters()['exercises'] : array_values($filtered);
    }

    private function getDefaultPlanParameters(): array
    {
        return [
            'name' => 'AI Generated Training Plan',
            'goal' => 'GeneralFitness',
            'experience_level' => 'Intermediate',
            'duration_weeks' => 8,
            'exercises' => ['BarbellBackSquat', 'FlatBarbellBenchPress', 'Deadlift', 'OverheadPress', 'BarbellRow'],
            'description' => 'A well-rounded training plan designed to build strength and muscle across all major movement patterns.',
        ];
    }

    private function createPhasesForPlan(TrainingPlan $plan, array $params): void
    {
        $totalWeeks = $params['duration_weeks'];
        $exercises = $params['exercises'];
        
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
                    notes: "Phase {$i} - AI Generated with progressive loading",
                    metadata: [
                        'ai_generated' => true,
                        'generation_date' => now()->toDateString(),
                        'phase_focus' => $this->getPhaseFocus($i, $phaseCount),
                    ]
                )
            ]);
        }
    }

    private function getPhaseDescription(int $phaseNumber, int $totalPhases): string
    {
        if ($totalPhases == 1) {
            return "Complete training phase focusing on balanced development";
        }
        
        return match($phaseNumber) {
            1 => "Foundation building phase - establishing movement patterns and base fitness",
            2 => "Strength development phase - progressive overload and skill refinement", 
            3 => "Intensification phase - higher intensity work and advanced techniques",
            default => "Peak performance phase - competition preparation and testing"
        };
    }

    private function getPhaseFocus(int $phaseNumber, int $totalPhases): string
    {
        return match($phaseNumber) {
            1 => 'foundation',
            2 => 'strength',
            3 => 'intensification',
            default => 'peak'
        };
    }

    private function createExerciseConfigs(array $exercises, int $phaseNumber, ExperienceLevel $experienceLevel): array
    {
        $configs = [];
        
        foreach ($exercises as $index => $exerciseName) {
            try {
                $exercise = Exercise::from($exerciseName);
                
                // Get suggested reps for this exercise
                $suggestedReps = $this->repSuggester->execute(
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
                    notes: "AI suggested exercise with phase-appropriate parameters",
                    metadata: [
                        'ai_generated' => true,
                        'phase_number' => $phaseNumber,
                        'suggested_reps_range' => $suggestedReps,
                    ],
                    day: ($index % 3) + 1, // Distribute across 3 days
                    cues: $exercise->cues()
                );
                
            } catch (\Exception $e) {
                \Log::warning("Failed to create config for exercise: {$exerciseName}", [
                    'error' => $e->getMessage(),
                    'phase' => $phaseNumber,
                ]);
            }
        }
        
        return $configs;
    }

    private function getBaseWeight(Exercise $exercise): float
    {
        return match($exercise->category()) {
            ExerciseCategory::Strength => 25.0,
            ExerciseCategory::Hypertrophy => 17.5,
            default => 12.5
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
}