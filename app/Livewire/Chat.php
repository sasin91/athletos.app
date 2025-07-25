<?php

namespace App\Livewire;

use App\Models\ChatSession;
use App\Models\TrainingPlan;
use App\Actions\GenerateChatResponse;
use App\Actions\CreateChatSession;
use App\Actions\AddChatMessage;
use App\Services\PrismFactory;
use Barryvdh\Debugbar\Facades\Debugbar;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Context;
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
    public string $prompt = '';

    public string $question = '';

    public string $answer = '';

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

    public function submitPrompt()
    {
        $this->validate();

        $this->question = $this->prompt;

        $this->prompt = '';

        $this->js('$wire.ask()');

        // Add user prompt to session
        app(AddChatMessage::class)->addUserMessage($this->session, $this->question);

        // Infer subject from first user prompt if not set
        if (!$this->session->subject && $this->session->messages()->where('role', 'user')->count() === 1) {
            $this->inferAndSetSubject($this->question);
        }
    }

    public function ask()
    {
        try {
            $request = app(GenerateChatResponse::class)->execute($this->session, $this->question);
        } catch (PrismException $e) {
            $this->reply('<i>Connection Error: ' . $e->getMessage() . '</i>');
            report($e);
            return;
        }

        try {
            /** @var \Prism\Prism\Text\Chunk $textChunk */
            foreach ($request->asStream() as $textChunk) {
                if ($textChunk->finishReason !== null) {
                    // $this->reply(
                    //     sprintf(
                    //         '<i>Response finished with reason: %s</i>',
                    //         $textChunk->finishReason->name
                    //     )
                    // );

                    // Save the complete response to database
                    app(AddChatMessage::class)->addAssistantMessage($this->session, $this->answer);

                    break;
                }

                switch ($textChunk->chunkType) {
                    case ChunkType::Text:
                        $this->reply($textChunk->text);
                        break;
                    case ChunkType::Thinking:
                        $this->reply('<i>Thinking...</i> <br>');
                        break;

                    case ChunkType::ToolCall:
                        foreach ($textChunk->toolCalls as $toolCall) {
                            $this->reply(
                                sprintf(
                                    '<i>Calling: %s ...</i> <br>',
                                    $toolCall->name
                                )
                            );
                        }
                        break;

                    case ChunkType::ToolResult:
                        foreach ($textChunk->toolResults as $toolResult) {
                            $this->reply(
                                sprintf(
                                    '<i>✅ %s called </i> <br>',
                                    $toolResult->toolName
                                )
                            );
                            // $this->reply(
                            //     sprintf(
                            //         '<i>%s Result: <pre>%s</pre></i>',
                            //         $toolResult->toolName,
                            //         is_array($toolResult->result)
                            //             ? json_encode($toolResult->result, JSON_PRETTY_PRINT)
                            //             : (string) $toolResult->result
                            //     )
                            // );
                        }
                        break;

                    case ChunkType::Meta:
                        $this->reply(
                            sprintf(
                                '<i>This is %s (ID: %s)</i>',
                                $textChunk->meta->model,
                                $textChunk->meta->id
                            )
                        );
                        break;
                }
            }
        } catch (\Exception $e) {
            // Handle general exceptions
            $this->reply(
                sprintf('<i>Reply Error: %s</i>', $e->getMessage())
            );

            Context::add('textChunk', $textChunk);
            Debugbar::debug($e->getMessage());

            report($e);
        } finally {
            // Clear the question after processing
            $this->question = '';
        }
    }

    private function reply(string $partial): void
    {
        $this->answer .= $partial;
        $this->stream(to: 'answer', content: $partial);
    }

    private function inferAndSetSubject(string $prompt): void
    {
        try {
            $subject = $this->generateSubject($prompt);
            $this->session->update(['subject' => $subject]);
        } catch (\Exception $e) {
            \Log::warning('Failed to infer chat subject: ' . $e->getMessage());
            // Set a default subject based on prompt length
            $defaultSubject = str($prompt)->limit(30)->toString();
            $this->session->update(['subject' => $defaultSubject]);
        }
    }

    private function generateSubject(string $prompt): string
    {
        $response = PrismFactory::subject()
            ->withSystemPrompt('Generate a concise 3-5 word subject line for this fitness/training related conversation. Focus on the main topic or goal. Examples: "Upper Body Strength Plan", "Cardio Weight Loss Help", "Form Check Deadlift", "Nutrition Advice Request". Return only the subject line with no quotes or additional text.')
            ->withPrompt($prompt)
            ->asText();

        $subject = trim($response->text);

        // Fallback if AI response is too long or empty
        if (empty($subject) || strlen($subject) > 50) {
            return str($prompt)->limit(30)->toString();
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
