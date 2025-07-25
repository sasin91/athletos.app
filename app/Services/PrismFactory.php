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

class PrismFactory
{
    public static function text(string $modelType = 'chat_model')
    {
        $provider = self::getProvider();
        $model = self::getModel($modelType);

        return Prism::text()->using($provider, $model);
    }

    public static function chat()
    {
        $user = Auth::user();
        $athlete = $user->athlete;
        $systemPrompt = <<<TXT
            You are an expert AI training coach with deep knowledge of exercise science, 
            periodization, and individualized program design. 
            Always prioritize safety while maximizing training effectiveness.
            You specialize in analyzing training situations and identifying key issues, opportunities, recommendations,
            and provide supportive, knowledgeable coaching advice in natural conversation format.

            Your are currently assisting Athlete: {$user->name} (ID: {$athlete->id}) with their training plan.
        TXT;

        return self::text('chat_model')
            ->withMaxTokens(self::getMaxTokens())
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
                        fn(int $id) => json_encode(
                            Athlete::with([
                                'user',
                                'current_plan',
                                'performance_indicators'
                            ])
                                ->findOrFail($id)
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
                        fn(?string $category, ?string $difficulty, array $tags = []) => collect(Exercise::cases())
                            ->when(filled($category), fn($exercises) => $exercises->filter(fn($exercise) => $exercise->category === $category))
                            ->when(filled($difficulty), fn($exercises) => $exercises->filter(fn($exercise) => $exercise->difficulty === $difficulty))
                            ->when(count($tags) > 0, fn($exercises) => $exercises->filter(fn($exercise) => count(array_intersect($exercise->tags(), $tags)) > 0))
                            ->values()
                            ->toJson()
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
                    ->withNumberParameter(
                        name: 'athlete_id',
                        description: 'ID of the athlete whose training plan is being adjusted',
                        required: true
                    )
                    ->withParameter(new ObjectSchema(
                        'adjustments',
                        'The specific adjustments to make to the training plan',
                        [
                            new StringSchema('name', 'New name for the adjusted plan'),
                            new StringSchema('description', 'Updated description'),
                            new StringSchema('goal', 'Updated training goal'),
                            new ObjectSchema('phases', 'Phase-specific adjustments', []),
                        ],
                        requiredFields: []
                    ))
                    ->withStringParameter('reason', 'Explanation of why this adjustment is being made')
                    ->using(function (int $athlete_id, array $adjustments, string $reason) {
                        $result = app(\App\Actions\AdjustTrainingPlan::class)->execute(
                            $athlete_id,
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
