<?php

namespace App\Livewire;

use App\Models\ChatSession;
use App\Models\ChatMessage;
use App\Models\TrainingPlan;
use App\Enums\ChatSessionType;
use App\Enums\ChatMessageRole;
use App\Services\TrainingChatService;
use App\Mcp\PrismTrainingAnalyzer;
use Livewire\Component;
use Livewire\Attributes\Validate;
use Livewire\Attributes\On;

class Chat extends Component
{
    public ?ChatSession $session = null;
    public ?TrainingPlan $basePlan = null;
    public ChatSessionType $sessionType = ChatSessionType::TrainingPlan;
    
    #[Validate('required|min:3|max:1000')]
    public string $message = '';
    
    public bool $isGenerating = false;
    public ?ChatMessage $streamingMessage = null;
    public string $currentStreamContent = '';
    
    public function mount(
        ?ChatSession $session = null,
        ?TrainingPlan $basePlan = null,
        ChatSessionType $sessionType = ChatSessionType::TrainingPlan
    ) {
        $this->basePlan = $basePlan;
        $this->sessionType = $sessionType;
        
        if ($session) {
            $this->session = $session;
        } else {
            $this->createNewSession();
        }
    }

    public function sendMessage()
    {
        $this->validate();
        
        // Add user message to session
        app(TrainingChatService::class)->addUserMessage($this->session, $this->message);
        
        $userMessage = $this->message;
        $this->message = '';
        $this->isGenerating = true;
        
        // Start streaming response
        $this->streamResponse($userMessage);
    }

    public function streamResponse(string $userMessage)
    {
        try {
            // Create a streaming message placeholder
            $this->streamingMessage = app(TrainingChatService::class)->addMessage(
                $this->session,
                ChatMessageRole::Assistant,
                '',
                ['is_streaming' => true],
            );
            
            $this->currentStreamContent = '';
            
            // Check if this is a plan generation request
            if ($this->shouldGeneratePlan($userMessage)) {
                $this->handlePlanGeneration($userMessage);
            } else {
                $this->handleGeneralResponse($userMessage);
            }
            
        } catch (\Exception $e) {
            $this->handleStreamError($e);
        } finally {
            $this->finalizeStream();
        }
    }

    private function shouldGeneratePlan(string $message): bool
    {
        $planKeywords = ['create', 'generate', 'build', 'design', 'make', 'plan'];
        $message = strtolower($message);
        
        return collect($planKeywords)->some(fn($keyword) => str_contains($message, $keyword));
    }

    private function handlePlanGeneration(string $userMessage)
    {
        $chatService = app(TrainingChatService::class);
        $analyzer = app(PrismTrainingAnalyzer::class);
        
        // Stream initial response
        $this->streamText("I'll help you create a training plan! Let me analyze your requirements...\n\n");
        
        // Use MCP to analyze the training situation
        try {
            $analysisResult = $analyzer->analyzeTrainingSituation(
                athleteId: auth()->id(),
                feedback: $userMessage,
                currentPlanId: $this->basePlan?->id,
                goals: [$this->sessionType->value]
            );
            
            $this->streamText("Based on your request, here's what I understand:\n\n");
            $this->streamText("• **Goals**: " . collect($analysisResult['analysis_results']['goals'] ?? [])->join(', ') . "\n");
            $this->streamText("• **Focus Areas**: " . ($analysisResult['analysis_results']['focus'] ?? 'General fitness') . "\n\n");
            
            // Extract plan parameters
            $planParams = $chatService->extractPlanParameters($userMessage);
            
            $this->streamText("I'm now generating your personalized training plan...\n\n");
            
            // Generate the actual plan
            $plan = $chatService->createTrainingPlan($planParams, auth()->id());
            
            if ($plan) {
                $this->streamText("✅ **Training Plan Created Successfully!**\n\n");
                $this->streamText("**Plan Name**: {$plan->name}\n");
                $this->streamText("**Goal**: {$plan->goal->value}\n");
                $this->streamText("**Experience Level**: {$plan->experience_level->value}\n");
                $this->streamText("**Phases**: {$plan->phases->count()}\n\n");
                
                foreach ($plan->phases as $phase) {
                    $exerciseCount = count($phase->settings->exercises);
                    $this->streamText("• **{$phase->name}** ({$phase->duration_weeks} weeks) - {$exerciseCount} exercises\n");
                }
                
                $this->streamText("\n🎯 Your plan is ready! Would you like me to explain any specific exercises or make adjustments?");
                
                // Update streaming message with plan reference
                $this->streamingMessage->update(['training_plan_id' => $plan->id]);
                
            } else {
                $this->streamText("❌ I encountered an issue creating your plan. Let me provide some general recommendations instead...\n\n");
                $this->handleGeneralResponse($userMessage);
            }
            
        } catch (\Exception $e) {
            \Log::error('MCP Plan generation failed: ' . $e->getMessage());
            $this->streamText("I'll create a plan using my built-in knowledge...\n\n");
            $this->handleGeneralResponse($userMessage);
        }
    }

    private function handleGeneralResponse(string $userMessage)
    {
        $chatService = app(TrainingChatService::class);
        
        // Check if we can use MCP for conversational coaching
        try {
            $analyzer = app(PrismTrainingAnalyzer::class);
            
            $coachingResponse = $analyzer->provideConversationalCoaching(
                message: $userMessage,
                conversationContext: $this->session->context,
                conversationHistory: $this->getRecentMessages(),
                responseStyle: 'detailed'
            );
            
            $response = $coachingResponse['coaching_response']['raw_response'] ?? $coachingResponse['coaching_response'];
            $this->streamText($response);
            
        } catch (\Exception $e) {
            \Log::warning('MCP coaching failed, falling back to OpenAI: ' . $e->getMessage());
            
            // Fallback to direct OpenAI call
            $response = $chatService->generateResponse($this->session, $userMessage);
            $this->streamText($response);
        }
    }

    private function streamText(string $text, int $delayMs = 50)
    {
        // Simulate streaming by chunking the text
        $chunks = str_split($text, 3);
        
        foreach ($chunks as $chunk) {
            $this->currentStreamContent .= $chunk;
            
            // Update the streaming message in real-time
            $this->streamingMessage->update(['content' => $this->currentStreamContent]);
            
            // Dispatch event to update UI
            $this->dispatch('message-chunk', content: $this->currentStreamContent);
            
            // Small delay to simulate streaming
            usleep($delayMs * 1000);
        }
    }

    private function finalizeStream()
    {
        $this->isGenerating = false;
        
        if ($this->streamingMessage) {
            $this->streamingMessage->markCompleted();
            $this->streamingMessage = null;
        }
        
        $this->currentStreamContent = '';
        
        // Refresh the session to show updated messages
        $this->session->refresh();
        
        $this->dispatch('streaming-complete');
    }

    private function handleStreamError(\Exception $e)
    {
        \Log::error('Chat streaming error: ' . $e->getMessage());
        
        if ($this->streamingMessage) {
            $this->streamingMessage->update([
                'content' => 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
                'is_streaming' => false,
                'completed_at' => now(),
            ]);
        }
        
        $this->dispatch('streaming-error', message: 'Something went wrong. Please try again.');
    }

    private function getRecentMessages(int $limit = 5): array
    {
        return $this->session->messages()
            ->latest()
            ->limit($limit)
            ->get()
            ->reverse()
            ->map(fn($msg) => [
                'role' => $msg->role->value,
                'content' => $msg->content,
                'timestamp' => $msg->created_at->toISOString(),
            ])
            ->toArray();
    }

    private function createNewSession()
    {
        $this->session = app(TrainingChatService::class)->createSession(
            userId: auth()->id(),
            type: $this->sessionType,
            basePlan: $this->basePlan
        );
    }

    #[On('refresh-session')]
    public function refreshSession()
    {
        $this->session->refresh();
    }

    public function getSessionProperty()
    {
        return $this->session;
    }

    public function render()
    {
        return view('livewire.chat', [
            'messages' => $this->session->messages()->orderBy('created_at')->get(),
        ]);
    }
}