<?php

namespace App\Services;

use App\Enums\Exercise;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use Illuminate\Support\Facades\Auth;
use Prism\Prism\Prism;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Tool;
use Prism\Prism\Schema\ObjectSchema;
use Prism\Prism\Schema\StringSchema;
use Prism\Prism\Schema\ArraySchema;

class PrismFactory
{
    public static function text(string $modelType = 'chat_model')
    {
        $provider = self::getProvider();
        $model = self::getModel($modelType);

        return Prism::text()->using($provider, $model);
    }

    public static function chat(Athlete $athlete)
    {
        $athleteId = $athlete->id;
        $userName = $athlete->user->name;

        $systemPrompt = <<<TXT
            You are an expert AI training coach with deep knowledge of exercise science, 
            periodization, and individualized program design. 
            Always prioritize safety while maximizing training effectiveness.
            You specialize in analyzing training situations and identifying key issues, opportunities, recommendations,
            and provide supportive, knowledgeable coaching advice in natural conversation format.

            You are currently assisting Athlete: {$userName} (ID: {$athleteId}) with their training plan.
            When using tools that require athlete_id, always use the ID: {$athleteId}
            
            IMPORTANT: When making training plan adjustments:
            1. Gather athlete information first if needed (using athlete tool)
            2. Make ALL exercise adjustments in ONE single adjust_training_plan call
            3. Each exercise MUST include complete configuration: exercise name, sets, reps, AND weight
            4. Base sets/reps/weights on the athlete's performance indicators and strength levels
            5. Do NOT chain multiple tool calls - provide complete adjustments in one call
            
            Example adjustment structure:
            {
              "phases": {
                "1": {
                  "exercises": [
                    {"exercise": "shoulder_press", "sets": "4", "reps": "8", "weight": "80"},
                    {"exercise": "lateral_raise", "sets": "3", "reps": "12", "weight": "60"}
                  ]
                }
              }
            }
            
            Always provide helpful, detailed responses to the user's fitness and training questions.
        TXT;

        return self::text('chat_model')
            ->withMaxTokens(self::getMaxTokens())
            ->withMaxSteps(20)
            ->withProviderOptions(['temperature' => self::getTemperature()])
            ->withSystemPrompt($systemPrompt)
            ->withTools([
                Tool::as('athlete')
                    ->for('Retrieve athlete information')
                    ->withNumberParameter(
                        name: 'athlete_id',
                        description: 'ID of the athlete to retrieve',
                        required: true
                    )
                    ->using(
                        fn(int $athlete_id) => json_encode(
                            Athlete::with([
                                'user',
                                'current_plan',
                                'performance_indicators'
                            ])
                                ->findOrFail($athlete_id)
                                ->toArray()
                        )
                    ),

                Tool::as('exercises')
                    ->for('Retrieving a list of available exercises')
                    ->withStringParameter(
                        name: 'category',
                        description: 'Filter exercises by category',
                        required: false
                    )
                    ->withStringParameter(
                        name: 'difficulty',
                        description: 'Filter exercises by difficulty level',
                        required: false
                    )
                    ->withArrayParameter(
                        name: 'tags',
                        description: 'Filter exercises by tags',
                        items: new StringSchema('tag', 'Tag to filter exercises by'),
                        required: false,
                    )
                    ->using(
                        function (?string $category, ?string $difficulty, array $tags = []) {
                            \Log::debug('Retrieving exercises with filters', [
                                'category' => $category,
                                'difficulty' => $difficulty,
                                'tags' => $tags,
                            ]);
                            try {
                                return collect(Exercise::cases())
                                    ->when(filled($category), fn($exercises) => $exercises->filter(fn(Exercise $exercise) => $exercise->category()->value === $category))
                                    ->when(filled($difficulty), fn($exercises) => $exercises->filter(fn(Exercise $exercise) => $exercise->difficulty()->value === $difficulty))
                                    ->when(count($tags) > 0, fn($exercises) => $exercises->filter(fn(Exercise $exercise) => count(array_intersect($exercise->tags(), $tags)) > 0))
                                    ->values()
                                    ->toJson();
                            } catch (\Exception $e) {
                                \Log::error('Error retrieving exercises', [
                                    'category' => $category,
                                    'difficulty' => $difficulty,
                                    'tags' => $tags,
                                    'error' => $e->getMessage(),
                                ]);
                                return json_encode([]);
                            }
                        }
                    ),

                Tool::as('training_plans')
                    ->for('Retrieving a list of training plans')
                    ->withStringParameter(
                        name: 'name',
                        description: 'Name of the training plan to retrieve',
                        required: false
                    )
                    ->withStringParameter(
                        name: 'goal',
                        description: 'Goal of the training plan to retrieve',
                        required: false
                    )
                    ->withStringParameter(
                        name: 'experience_level',
                        description: 'Experience level of the training plan to retrieve',
                        required: false
                    )
                    ->using(
                        fn(?string $name, ?string $goal, ?string $experience_level) => json_encode(
                            TrainingPlan::query()
                                ->when(filled($name), fn($query) => $query->where('name', 'like', "%{$name}%"))
                                ->when(filled($goal), fn($query) => $query->where('goal', '=', $goal))
                                ->when(filled($experience_level), fn($query) => $query->where('experience_level', '=', $experience_level))
                                ->get()
                                ->toArray()
                        )
                    ),

                Tool::as('adjust_training_plan')
                    ->for('Adjust the athlete\'s current training plan by creating a modified copy')
                    ->withParameter(new ObjectSchema(
                        'adjustments',
                        'The specific adjustments to make to the training plan',
                        [
                            new StringSchema('name', 'New name for the adjusted plan'),
                            new StringSchema('description', 'Updated description'),
                            new StringSchema('goal', 'Updated training goal'),
                            new ObjectSchema('phases', 'Phase-specific adjustments keyed by phase number (e.g. 1, 2, 3)', [
                                new ArraySchema(
                                    'exercises',
                                    'Array of exercise configurations for this phase',
                                    new ObjectSchema('exercise_config', 'Complete exercise configuration with specific training parameters', [
                                        new StringSchema('exercise', 'Exercise name or enum value (e.g. "shoulder_press", "lateral_raise")'),
                                        new StringSchema('sets', 'Number of sets (e.g. "3", "4")'),
                                        new StringSchema('reps', 'Number of reps (e.g. "8", "10", "12")'),
                                        new StringSchema('weight', 'Weight or intensity percentage (e.g. "80", "75")'),
                                    ])
                                )
                            ]),
                        ],
                        requiredFields: ['phases']
                    ))
                    ->withStringParameter('reason', 'Explanation of why this adjustment is being made')
                    ->using(function (array $adjustments, string $reason) use ($athleteId) {
                        $result = app(\App\Actions\AdjustTrainingPlan::class)->execute(
                            $athleteId,
                            $adjustments,
                            $reason
                        );

                        return $result['message'];
                    }),
            ]);
    }

    public static function extraction()
    {
        return self::text('extraction_model')
            ->withMaxTokens(600)
            ->withProviderOptions(['temperature' => 0.3]);
    }

    public static function subject()
    {
        return self::text('subject_model')
            ->withMaxTokens(15)
            ->withProviderOptions(['temperature' => 0.3]);
    }

    private static function getProvider(): Provider
    {
        return match (config('ai.default_provider')) {
            'ollama' => Provider::Ollama,
            'openai' => Provider::OpenAI,
            default => throw new \InvalidArgumentException('Unsupported AI provider: ' . config('ai.default_provider')),
        };
    }

    private static function getModel(string $modelType): string
    {
        $providerName = config('ai.default_provider');
        return config("ai.providers.{$providerName}.{$modelType}");
    }

    private static function getMaxTokens(): int
    {
        $providerName = config('ai.default_provider');
        return config("ai.providers.{$providerName}.max_tokens");
    }

    private static function getTemperature(): float
    {
        $providerName = config('ai.default_provider');
        return config("ai.providers.{$providerName}.temperature");
    }
}
