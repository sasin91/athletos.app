<?php

namespace App\Mcp;

use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Models\TrainingPhase;
use App\Enums\Exercise;
use Prism\Prism\Prism;
use Prism\Prism\Enums\Provider;
use PhpMcp\Server\Attributes\McpTool;
use PhpMcp\Server\Attributes\McpResource;
use PhpMcp\Server\Attributes\Schema;

class PrismTrainingAnalyzer
{
    /**
     * Comprehensive analysis of current training situation.
     */
    #[McpTool(name: 'analyze_training_situation')]
    public function analyzeTrainingSituation(
        int $athleteId,
        string $feedback,
        ?int $currentPlanId = null,
        ?array $recentPerformance = null,
        array $goals = []
    ): array
    {
        // Get athlete and plan data
        $athlete = Athlete::find($athleteId);
        $plan = $currentPlanId ? TrainingPlan::find($currentPlanId) : null;

        $data = [
            'athlete_id' => $athleteId,
            'feedback' => $feedback,
            'current_plan_id' => $currentPlanId,
            'recent_performance' => $recentPerformance,
            'goals' => $goals
        ];
        
        $context = $this->buildAnalysisContext($athlete, $plan, $data);

        $analysisPrompt = $this->buildAnalysisPrompt($context, $feedback);

        $response = Prism::text()
            ->using(Provider::OpenAI, 'gpt-4')
            ->withSystemPrompt($this->getSystemPrompt('training_analyst'))
            ->withPrompt($analysisPrompt)
            ->asText();

        return [
            'athlete_id' => $athleteId,
            'analysis_type' => 'comprehensive_situation',
            'athlete_feedback' => $feedback,
            'analysis_results' => $this->parseAnalysisResponse($response->text),
            'context_used' => $context,
            'confidence_score' => $this->calculateConfidenceScore($context),
            'timestamp' => now()->toISOString()
        ];
    }

    /**
     * Generate specific training plan modifications.
     */
    #[McpTool(name: 'generate_training_recommendations')]
    public function generateRecommendations(
        array $analysisContext,
        array $priorityChanges = [],
        array $constraints = [],
        ?string $timeframe = null
    ): array
    {
        $recommendationPrompt = $this->buildRecommendationPrompt($analysisContext, $priorityChanges, $constraints);

        $response = Prism::text()
            ->using(Provider::OpenAI, 'gpt-4')
            ->withSystemPrompt($this->getSystemPrompt('training_recommender'))
            ->withPrompt($recommendationPrompt)
            ->asText();

        return [
            'recommendation_type' => 'actionable_modifications',
            'recommendations' => $this->parseRecommendations($response->text),
            'priority_changes_addressed' => $priorityChanges,
            'constraints_considered' => $constraints,
            'implementation_priority' => 'high',
            'review_timeline' => '1-2 weeks'
        ];
    }

    /**
     * Create a new training phase that adapts to current needs.
     */
    #[McpTool(name: 'create_adaptive_phase')]
    public function createAdaptivePhase(
        #[Schema(enum: ['deload', 'specialization', 'recovery', 'intensity', 'volume'])]
        string $phaseType,
        array $targetAdaptations,
        int $durationWeeks = 4,
        ?string $transitionStrategy = null
    ): array
    {
        $phasePrompt = $this->buildPhaseCreationPrompt($phaseType, $targetAdaptations, $durationWeeks);

        $response = Prism::text()
            ->using(Provider::OpenAI, 'gpt-4')
            ->withSystemPrompt($this->getSystemPrompt('phase_creator'))
            ->withPrompt($phasePrompt)
            ->asText();

        return [
            'phase_type' => $phaseType,
            'phase_details' => $this->parsePhaseDetails($response->text),
            'duration_weeks' => $durationWeeks,
            'target_adaptations' => $targetAdaptations,
            'implementation_ready' => true
        ];
    }

    /**
     * AI-powered exercise optimization using decision trees.
     */
    #[McpTool(name: 'optimize_exercise_selection')]
    public function optimizeExercises(
        array $currentExercises,
        array $optimizationGoals,
        array $availableEquipment = [],
        array $movementRestrictions = [],
        #[Schema(enum: ['machine', 'free_weight', 'bodyweight', 'mixed'])]
        string $preferenceStyle = 'mixed'
    ): array
    {
        $optimizationPrompt = $this->buildOptimizationPrompt($currentExercises, $optimizationGoals, $availableEquipment);

        $response = Prism::text()
            ->using(Provider::OpenAI, 'gpt-4')
            ->withSystemPrompt($this->getSystemPrompt('exercise_optimizer'))
            ->withPrompt($optimizationPrompt)
            ->asText();

        return [
            'optimization_type' => 'exercise_selection',
            'original_exercises' => $currentExercises,
            'optimization_goals' => $optimizationGoals,
            'optimized_program' => $this->parseOptimization($response->text),
            'equipment_considered' => $availableEquipment
        ];
    }

    /**
     * Create intelligent progression schemes using reasoning capabilities.
     */
    #[McpTool(name: 'intelligent_progression_planning')]
    public function planProgression(
        array $exercises,
        int $progressionTimeline,
        ?string $athleteResponsePattern = null,
        #[Schema(enum: ['linear', 'undulating', 'block', 'conjugate', 'auto_regulation'])]
        string $periodizationModel = 'linear'
    ): array
    {
        $progressionPrompt = $this->buildProgressionPrompt($exercises, $progressionTimeline, $periodizationModel);

        $response = Prism::text()
            ->using(Provider::OpenAI, 'gpt-4')
            ->withSystemPrompt($this->getSystemPrompt('progression_planner'))
            ->withPrompt($progressionPrompt)
            ->asText();

        return [
            'planning_type' => 'intelligent_progression',
            'exercises_planned' => count($exercises),
            'timeline_weeks' => $progressionTimeline,
            'periodization_model' => $periodizationModel,
            'progression_details' => $this->parseProgression($response->text)
        ];
    }

    /**
     * Natural language training conversation using conversational agents.
     */
    #[McpTool(name: 'conversational_training_coach')]
    public function provideConversationalCoaching(
        string $message,
        ?array $conversationContext = null,
        array $conversationHistory = [],
        #[Schema(enum: ['detailed', 'concise', 'motivational', 'technical', 'beginner_friendly'])]
        string $responseStyle = 'detailed'
    ): array
    {
        $coachingPrompt = $this->buildCoachingPrompt($message, $conversationContext ?? [], $conversationHistory);

        $response = Prism::text()
            ->using(Provider::OpenAI, 'gpt-4')
            ->withSystemPrompt($this->getSystemPrompt('conversational_coach'))
            ->withPrompt($coachingPrompt)
            ->asText();

        return [
            'interaction_type' => 'conversational_coaching',
            'user_message' => $message,
            'coaching_response' => $this->parseCoachingResponse($response->text),
            'response_style' => $responseStyle,
            'conversation_id' => uniqid('conv_'),
            'response_generated_at' => now()->toISOString()
        ];
    }

    /**
     * Validate proposed training plan changes using validation agents.
     */
    #[McpTool(name: 'validate_plan_changes')]
    public function validatePlanChanges(
        array $proposedChanges,
        array $athleteProfile,
        array $validationCriteria = []
    ): array
    {
        $validationPrompt = $this->buildValidationPrompt($proposedChanges, $athleteProfile, $validationCriteria);

        $response = Prism::text()
            ->using(Provider::OpenAI, 'gpt-4')
            ->withSystemPrompt($this->getSystemPrompt('plan_validator'))
            ->withPrompt($validationPrompt)
            ->asText();

        return [
            'validation_type' => 'plan_change_validation',
            'proposed_changes' => $proposedChanges,
            'validation_results' => $this->parseValidation($response->text),
            'athlete_profile_considered' => !empty($athleteProfile),
            'validation_completed_at' => now()->toISOString()
        ];
    }

    /**
     * Access to all training plans in the system.
     */
    #[McpResource(uri: 'training://plans', mimeType: 'application/json')]
    public function getTrainingPlans(): array
    {
        return TrainingPlan::with(['phases', 'athlete'])->get()->toArray();
    }

    /**
     * Access to athlete profiles and data.
     */
    #[McpResource(uri: 'training://athletes', mimeType: 'application/json')]
    public function getAthletes(): array
    {
        return Athlete::all()->toArray();
    }

    /**
     * Complete exercise database with variations.
     */
    #[McpResource(uri: 'training://exercises', mimeType: 'application/json')]
    public function getExerciseDatabase(): array
    {
        return array_map(fn($exercise) => [
            'name' => $exercise->name,
            'value' => $exercise->value,
            'muscle_groups' => $exercise->getMuscleGroups() ?? [],
            'equipment' => $exercise->getEquipment() ?? 'unknown',
            'difficulty' => $exercise->getDifficulty() ?? 'medium'
        ], Exercise::cases());
    }

    /**
     * Performance and progress tracking data.
     */
    #[McpResource(uri: 'training://metrics', mimeType: 'application/json')]
    public function getTrainingMetrics(): array
    {
        // This would typically pull from a metrics/tracking table
        return [
            'placeholder' => 'metrics data',
            'note' => 'This would connect to actual metrics tracking'
        ];
    }

    private function buildAnalysisContext(Athlete $athlete = null, TrainingPlan $plan = null, array $data = []): array
    {
        $context = [
            'feedback' => $data['feedback'],
            'recent_performance' => $data['recent_performance'] ?? [],
            'goals' => $data['goals'] ?? []
        ];

        if ($athlete) {
            $context['athlete'] = [
                'id' => $athlete->id,
                'experience_level' => $athlete->experience_level?->value,
                'primary_goal' => $athlete->primary_goal,
                'training_frequency' => $athlete->training_frequency,
                'muscle_groups' => $athlete->muscle_groups ?? [],
                'difficulty_preference' => $athlete->difficulty_preference,
            ];
        }

        if ($plan) {
            $context['current_plan'] = [
                'id' => $plan->id,
                'name' => $plan->name,
                'goal' => $plan->goal?->value,
                'experience_level' => $plan->experience_level?->value,
                'phases' => $plan->phases->map(function ($phase) {
                    return [
                        'name' => $phase->name,
                        'duration_weeks' => $phase->duration_weeks,
                        'settings' => $phase->settings?->toArray()
                    ];
                })->toArray()
            ];
        }

        return $context;
    }

    private function buildAnalysisPrompt(array $context, string $feedback): string
    {
        $exerciseList = $this->getAvailableExercisesList();
        
        return "
**Training Situation Analysis Request**

**Athlete Feedback:** {$feedback}

**Context:**
" . json_encode($context, JSON_PRETTY_PRINT) . "

**Available Exercises:** {$exerciseList}

Please provide a comprehensive analysis of this training situation. Focus on:

1. **Situation Assessment**: Overall evaluation of the current training state
2. **Identified Issues**: Specific problems or concerns based on the feedback
3. **Athlete Needs**: What the athlete currently needs for optimal progress
4. **Risk Factors**: Potential issues or warning signs to monitor
5. **Opportunities**: Areas where improvements can be made
6. **Priority Areas**: Most important areas requiring immediate attention
7. **Next Steps**: Specific, actionable recommendations

Format your response as a structured analysis that can be easily parsed and acted upon.
        ";
    }

    private function buildRecommendationPrompt(array $analysisContext, array $priorityChanges, array $constraints): string
    {
        $exerciseList = $this->getAvailableExercisesList();
        
        return "
**Training Plan Modification Request**

**Analysis Context:**
" . json_encode($analysisContext, JSON_PRETTY_PRINT) . "

**Priority Changes Requested:**
" . implode("\n", array_map(fn($change) => "- {$change}", $priorityChanges)) . "

**Constraints to Consider:**
" . implode("\n", array_map(fn($constraint) => "- {$constraint}", $constraints)) . "

**Available Exercises:** {$exerciseList}

Please generate specific, actionable training plan modifications including:

1. **Immediate Changes**: Changes to implement right away
2. **Exercise Substitutions**: Specific exercise swaps with rationale
3. **Volume Adjustments**: Changes to sets, reps, or training frequency
4. **Phase Modifications**: Adjustments to current training phase
5. **Recovery Recommendations**: Rest, deload, or recovery strategies
6. **Monitoring Points**: Key metrics to track after implementing changes

Provide detailed, practical recommendations that can be immediately implemented.
        ";
    }

    private function buildPhaseCreationPrompt(string $phaseType, array $targetAdaptations, int $durationWeeks): string
    {
        $exerciseList = $this->getAvailableExercisesList();
        
        return "
**Adaptive Training Phase Creation Request**

**Phase Type:** {$phaseType}
**Duration:** {$durationWeeks} weeks
**Target Adaptations:**
" . json_encode($targetAdaptations, JSON_PRETTY_PRINT) . "

**Available Exercises:** {$exerciseList}

Please create a detailed {$durationWeeks}-week {$phaseType} phase including:

1. **Phase Overview**: Description and primary goals
2. **Weekly Structure**: Week-by-week progression plan
3. **Exercise Selection**: Specific exercises with sets, reps, intensity
4. **Progression Strategy**: How to progress through the phase
5. **Transition Plan**: How to return to normal training
6. **Success Metrics**: Key indicators of phase effectiveness

Design a complete, implementable phase that addresses the specified adaptations.
        ";
    }

    private function buildOptimizationPrompt(array $currentExercises, array $optimizationGoals, array $availableEquipment): string
    {
        $exerciseList = $this->getAvailableExercisesList();
        
        return "
**Exercise Selection Optimization Request**

**Current Exercises:**
" . implode("\n", array_map(fn($ex) => "- {$ex}", $currentExercises)) . "

**Optimization Goals:**
" . implode("\n", array_map(fn($goal) => "- {$goal}", $optimizationGoals)) . "

**Available Equipment:**
" . implode("\n", array_map(fn($eq) => "- {$eq}", $availableEquipment)) . "

**Available Exercises:** {$exerciseList}

Please provide optimized exercise recommendations including:

1. **Exercise Changes**: Specific substitutions with rationale
2. **Program Balance**: Analysis of muscle group coverage
3. **Equipment Utilization**: How to best use available equipment
4. **Implementation Notes**: Important considerations for changes
5. **Progression Opportunities**: Future advancement possibilities

Focus on practical improvements that align with the specified goals.
        ";
    }

    private function buildProgressionPrompt(array $exercises, int $timeline, string $periodizationModel): string
    {
        return "
**Intelligent Progression Planning Request**

**Exercises to Progress:**
" . json_encode($exercises, JSON_PRETTY_PRINT) . "

**Timeline:** {$timeline} weeks
**Periodization Model:** {$periodizationModel}

Please create detailed progression schemes including:

1. **Progression Overview**: Strategy and approach
2. **Exercise-Specific Plans**: Week-by-week progression for each exercise
3. **Periodization Structure**: How the model is applied
4. **Deload Weeks**: When and how to implement deloads
5. **Adjustment Guidelines**: How to modify based on performance
6. **Testing Protocols**: Methods to assess progress

Design realistic, evidence-based progressions that optimize long-term development.
        ";
    }

    private function buildCoachingPrompt(string $message, array $context, array $history): string
    {
        $recentHistory = array_slice($history, -5); // Last 5 messages
        
        return "
**Conversational Training Coaching Request**

**User Message:** {$message}

**Context:**
" . json_encode($context, JSON_PRETTY_PRINT) . "

**Recent Conversation:**
" . json_encode($recentHistory, JSON_PRETTY_PRINT) . "

Please provide expert training coaching advice including:

1. **Direct Response**: Address the user's message directly
2. **Key Insights**: Important observations about their training
3. **Actionable Advice**: Specific steps they can take
4. **Follow-up Questions**: Questions to better understand their situation
5. **Encouragement**: Motivational support
6. **Warning Flags**: Any concerning patterns to watch

Respond as a knowledgeable, supportive coach who prioritizes the athlete's wellbeing and progress.
        ";
    }

    private function buildValidationPrompt(array $proposedChanges, array $athleteProfile, array $validationCriteria): string
    {
        return "
**Training Plan Change Validation Request**

**Proposed Changes:**
" . json_encode($proposedChanges, JSON_PRETTY_PRINT) . "

**Athlete Profile:**
" . json_encode($athleteProfile, JSON_PRETTY_PRINT) . "

**Validation Criteria:**
" . implode("\n", array_map(fn($criteria) => "- {$criteria}", $validationCriteria)) . "

Please validate these changes against safety and effectiveness standards:

1. **Safety Assessment**: Risk analysis and mitigation
2. **Effectiveness Assessment**: Likelihood of achieving goals
3. **Change-by-Change Review**: Detailed evaluation of each modification
4. **Implementation Recommendations**: How to safely implement changes
5. **Monitoring Requirements**: What to track after implementation
6. **Overall Approval**: Final recommendation (approve/modify/reject)

Prioritize athlete safety while maximizing training effectiveness.
        ";
    }

    private function getSystemPrompt(string $agentType): string
    {
        $basePrompt = "You are an expert AI training coach with deep knowledge of exercise science, periodization, and individualized program design. Always prioritize safety while maximizing training effectiveness.";

        return match ($agentType) {
            'training_analyst' => $basePrompt . " You specialize in analyzing training situations and identifying key issues, opportunities, and recommendations.",
            'training_recommender' => $basePrompt . " You specialize in generating specific, actionable training plan modifications based on analysis results.",
            'phase_creator' => $basePrompt . " You specialize in creating adaptive training phases for specific goals like deload, recovery, or specialization.",
            'exercise_optimizer' => $basePrompt . " You specialize in optimizing exercise selection based on goals, constraints, and available equipment.",
            'progression_planner' => $basePrompt . " You specialize in creating intelligent progression schemes using various periodization models.",
            'conversational_coach' => $basePrompt . " You provide supportive, knowledgeable coaching advice in natural conversation format.",
            'plan_validator' => $basePrompt . " You specialize in validating proposed training changes for safety and effectiveness.",
            default => $basePrompt
        };
    }

    private function getAvailableExercisesList(): string
    {
        return collect(Exercise::cases())
            ->map(fn($exercise) => $exercise->value)
            ->join(', ');
    }

    private function calculateConfidenceScore(array $context): float
    {
        $score = 0.5; // Base score
        
        // Increase confidence based on available data
        if (!empty($context['athlete'])) $score += 0.2;
        if (!empty($context['current_plan'])) $score += 0.2;
        if (!empty($context['recent_performance'])) $score += 0.1;
        
        return min(1.0, $score);
    }

    // Response parsing methods - these would parse the AI text responses into structured data
    private function parseAnalysisResponse(string $response): array
    {
        // In a real implementation, you'd parse the AI response more sophisticatedly
        // For now, return the raw response with some basic structure
        return [
            'raw_response' => $response,
            'parsed_at' => now()->toISOString()
        ];
    }

    private function parseRecommendations(string $response): array
    {
        return [
            'raw_response' => $response,
            'parsed_at' => now()->toISOString()
        ];
    }

    private function parsePhaseDetails(string $response): array
    {
        return [
            'raw_response' => $response,
            'parsed_at' => now()->toISOString()
        ];
    }

    private function parseOptimization(string $response): array
    {
        return [
            'raw_response' => $response,
            'parsed_at' => now()->toISOString()
        ];
    }

    private function parseProgression(string $response): array
    {
        return [
            'raw_response' => $response,
            'parsed_at' => now()->toISOString()
        ];
    }

    private function parseCoachingResponse(string $response): array
    {
        return [
            'raw_response' => $response,
            'parsed_at' => now()->toISOString()
        ];
    }

    private function parseValidation(string $response): array
    {
        return [
            'raw_response' => $response,
            'parsed_at' => now()->toISOString()
        ];
    }
}