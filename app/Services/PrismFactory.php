<?php

namespace App\Services;

use App\Enums\Exercise;
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
        return self::text('chat_model')
            ->withMaxTokens(self::getMaxTokens())
            ->withProviderOptions(['temperature' => self::getTemperature()])
            ->withSystemPrompt(<<<TXT
                You are an expert AI training coach with deep knowledge of exercise science, 
                periodization, and individualized program design. 
                Always prioritize safety while maximizing training effectiveness.
                You specialize in analyzing training situations and identifying key issues, opportunities, recommendations,
                and provide supportive, knowledgeable coaching advice in natural conversation format.
            TXT)
            ->withTools([
                Tool::as('athlete')
                    ->for('Retrieve athlete information')
                    ->using(fn() => Auth::user()->athlete()->with(['current_plan', 'performance_indicators'])->toArray()),

                Tool::as('exercises')
                    ->for('Retrieving a list of available exercises')
                    ->using(fn() => Exercise::cases()),

                Tool::as('training_plans')
                    ->for('Retrieving a list of training plans')
                    ->using(fn() => TrainingPlan::all()),

                Tool::as('adjust_training_plan')
                    ->for('Adjust the athlete\'s current training plan by creating a modified copy')
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
                    ->using(function (array $adjustments, string $reason) {
                        $athlete = Auth::user()->athlete;
                        if (!$athlete) {
                            throw new \Exception('User is not an athlete');
                        }
                        
                        return app(\App\Actions\AdjustTrainingPlan::class)->execute(
                            $athlete->id,
                            $adjustments,
                            $reason
                        );
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
