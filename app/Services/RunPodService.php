<?php

namespace App\Services;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RunPodService
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('ai.providers.runpod.base_url');
        $this->apiKey = config('ai.providers.runpod.api_key');

        if (!$this->baseUrl || !$this->apiKey) {
            throw new \InvalidArgumentException('RunPod base URL and API key must be configured');
        }
    }

    /**
     * Stream chat completion from RunPod
     */
    public function streamChatCompletion(array $messages, array $options = []): \Generator
    {
        $payload = [
            'input' => [
                'messages' => $messages,
                'model' => $options['model'] ?? config('ai.providers.runpod.chat_model'),
                'temperature' => $options['temperature'] ?? config('ai.providers.runpod.temperature'),
                'max_tokens' => $options['max_tokens'] ?? config('ai.providers.runpod.max_tokens'),
                'stream' => true,
            ]
        ];

        Log::info('RunPod request payload', $payload);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(120)->post($this->baseUrl, $payload);

        if (!$response->successful()) {
            Log::error('RunPod API error', [
                'status' => $response->status(),
                'body' => $response->body(),
                'payload' => $payload
            ]);
            throw new \Exception('RunPod API error: ' . $response->status() . ' - ' . $response->body());
        }

        $responseData = $response->json();
        
        // RunPod serverless returns a job ID, we need to poll for results
        if (isset($responseData['id'])) {
            yield from $this->pollForStreamingResults($responseData['id']);
        } else {
            throw new \Exception('RunPod did not return a job ID');
        }
    }

    /**
     * Poll RunPod for streaming results
     */
    private function pollForStreamingResults(string $jobId): \Generator
    {
        $statusUrl = str_replace('/run', "/status/{$jobId}", $this->baseUrl);
        $maxAttempts = 60; // 60 seconds max
        $attempt = 0;

        while ($attempt < $maxAttempts) {
            $statusResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
            ])->get($statusUrl);

            if (!$statusResponse->successful()) {
                Log::error('RunPod status check error', [
                    'job_id' => $jobId,
                    'status' => $statusResponse->status(),
                    'body' => $statusResponse->body()
                ]);
                break;
            }

            $status = $statusResponse->json();
            
            if (isset($status['status'])) {
                switch ($status['status']) {
                    case 'COMPLETED':
                        if (isset($status['output']['choices'][0]['message']['content'])) {
                            $content = $status['output']['choices'][0]['message']['content'];
                            // Simulate streaming by yielding chunks
                            $words = explode(' ', $content);
                            foreach ($words as $word) {
                                yield [
                                    'type' => 'text',
                                    'content' => $word . ' '
                                ];
                                usleep(50000); // 50ms delay between words
                            }
                        }
                        yield ['type' => 'finished', 'reason' => 'stop'];
                        return;

                    case 'FAILED':
                        $error = $status['error'] ?? 'Unknown error';
                        Log::error('RunPod job failed', ['job_id' => $jobId, 'error' => $error]);
                        yield ['type' => 'error', 'message' => "RunPod job failed: {$error}"];
                        return;

                    case 'IN_PROGRESS':
                    case 'IN_QUEUE':
                        // Continue polling
                        break;
                }
            }

            $attempt++;
            sleep(1); // Wait 1 second before next poll
        }

        // Timeout
        yield ['type' => 'error', 'message' => 'RunPod request timed out'];
    }

    /**
     * Convert chat messages to RunPod format
     */
    public static function formatMessages(array $prismMessages): array
    {
        $messages = [];
        
        foreach ($prismMessages as $message) {
            $role = match (get_class($message)) {
                \Prism\Prism\ValueObjects\Messages\SystemMessage::class => 'system',
                \Prism\Prism\ValueObjects\Messages\UserMessage::class => 'user',
                \Prism\Prism\ValueObjects\Messages\AssistantMessage::class => 'assistant',
                default => 'user'
            };

            $messages[] = [
                'role' => $role,
                'content' => $message->content
            ];
        }

        return $messages;
    }
}