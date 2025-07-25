<?php

namespace App\Livewire;

use App\Models\ChatSession;
use App\Models\TrainingPlan;
use App\Actions\GenerateChatResponse;
use App\Actions\CreateChatSession;
use App\Actions\AddChatMessage;
use App\Services\PrismFactory;
use Illuminate\Support\Facades\Auth;
use Livewire\Component;
use Livewire\Attributes\Validate;
use Livewire\Attributes\On;
use Prism\Prism\Enums\ChunkType;
use Prism\Prism\Exceptions\PrismException;
use Prism\Prism\ValueObjects\ToolCall;

class Chat extends Component
{
    public ?ChatSession $session = null;
    public ?TrainingPlan $basePlan = null;

    #[Validate('required|min:3|max:1000')]
    public string $message = '';

    public string $currentResponse = '';

    public function mount(
        ?ChatSession $session = null,
        ?TrainingPlan $basePlan = null
    ) {
        $this->basePlan = $basePlan;

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
        app(AddChatMessage::class)->addUserMessage($this->session, $this->message);

        // Infer subject from first user message if not set
        if (!$this->session->subject && $this->session->messages()->where('role', 'user')->count() === 1) {
            $this->inferAndSetSubject($this->message);
        }

        $this->message = '';

        $this->js('$wire.generateResponse()');
    }

    public function generateResponse()
    {
        $lastUserMessage = $this->session->messages()
            ->where('role', 'user')
            ->latest()
            ->first();

        if (!$lastUserMessage) return;

        $userMessage = $lastUserMessage->content;

        try {
            $request = app(GenerateChatResponse::class)->execute($this->session, $userMessage);

            /** @var \Prism\Prism\Text\Chunk $textChunk */
            foreach ($request->asStream() as $textChunk) {
                if ($textChunk->finishReason !== null) {
                    $this->stream(
                        to: 'currentResponse',
                        content: sprintf(
                            '<i>Response finished with reason: %s</i>',
                            $textChunk->finishReason->name
                        )
                    );

                    break;
                }

                switch ($textChunk->chunkType) {
                    case ChunkType::Text:
                        $this->stream(to: 'currentResponse', content: $textChunk->text);
                        break;
                    case ChunkType::Thinking:
                        $this->stream(to: 'currentResponse', content: '<i>Thinking...</i>');
                        break;

                    case ChunkType::ToolCall:
                        foreach ($textChunk->toolCalls as $toolCall) {
                            $this->stream(to: 'currentResponse', content: sprintf(
                                '<i>Calling: %s</i>',
                                $toolCall->name
                            ));
                        }
                        break;

                    case ChunkType::ToolResult:
                        foreach ($textChunk->toolResults as $toolResult) {
                            $this->stream(to: 'currentResponse', content: sprintf(
                                '<i>%s Result: <pre>%s</pre></i>',
                                $toolResult->toolName,
                                is_array($toolResult->result)
                                    ? json_encode($toolResult->result, JSON_PRETTY_PRINT)
                                    : (string) $toolResult->result
                            ));
                        }
                        break;

                    case ChunkType::Meta:
                        $this->stream(to: 'currentResponse', content: sprintf(
                            '<i>This is %s (ID: %s)</i>',
                            $textChunk->meta->model,
                            $textChunk->meta->id
                        ));
                        break;
                }
            }
        } catch (PrismException $prismException) {
            // Handle specific Prism exceptions
            $this->stream(
                to: 'currentResponse',
                content: sprintf('<i>Error: %s</i>', $prismException->getMessage())
            );
            \Log::error('Prism exception during chat response generation: ' . $prismException->getMessage());
        } catch (\Exception $e) {
            // Handle general exceptions
            $this->stream(
                to: 'currentResponse',
                content: sprintf('<i>Error: %s</i>', $e->getMessage())
            );
            \Log::error('General exception during chat response generation: ' . $e->getMessage());
        }

        // Save the complete response to database
        app(AddChatMessage::class)->addAssistantMessage($this->session, $this->currentResponse);
    }



    private function inferAndSetSubject(string $message): void
    {
        try {
            $subject = $this->generateSubject($message);
            $this->session->update(['subject' => $subject]);
        } catch (\Exception $e) {
            \Log::warning('Failed to infer chat subject: ' . $e->getMessage());
            // Set a default subject based on message length
            $defaultSubject = str($message)->limit(30)->toString();
            $this->session->update(['subject' => $defaultSubject]);
        }
    }

    private function generateSubject(string $message): string
    {
        $response = PrismFactory::subject()
            ->withSystemPrompt('Generate a concise 3-5 word subject line for this fitness/training related conversation. Focus on the main topic or goal. Examples: "Upper Body Strength Plan", "Cardio Weight Loss Help", "Form Check Deadlift", "Nutrition Advice Request". Return only the subject line with no quotes or additional text.')
            ->withPrompt($message)
            ->asText();

        $subject = trim($response->text);

        // Fallback if AI response is too long or empty
        if (empty($subject) || strlen($subject) > 50) {
            return str($message)->limit(30)->toString();
        }

        return $subject;
    }

    private function createNewSession()
    {
        $this->session = app(CreateChatSession::class)->execute(
            Auth::user()->athlete->id,
            $this->basePlan
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
