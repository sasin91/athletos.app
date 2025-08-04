<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Prism\Prism\Text\Chunk;
use Prism\Prism\ValueObjects\ToolCall;
use Prism\Prism\ValueObjects\ToolResult;

/**
 * @mixin Chunk
 */
class PrismTextChunk extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'text' => $this->text,
            'toolCalls' => array_map(
                callback: fn (ToolCall $toolCall) => [
                    'id' => $toolCall->id,
                    'name' => $toolCall->name,
                    'arguments' => $toolCall->arguments(),
                    'resultId' => $toolCall->resultId,
                    'reasoningId' => $toolCall->reasoningId,
                    'reasoningSummary' => $toolCall->reasoningSummary,
                ],
                array: $this->toolCalls
            ),
            'textResults' => array_map(
                callback: fn (ToolResult $toolResult) => [
                    'toolCallId' => $toolResult->toolCallId,
                    'toolName' => $toolResult->toolName,
                    'args' => $toolResult->args,
                    'result' => $toolResult->result,
                    'toolCallResultId' => $toolResult->toolCallResultId,
                ],
                array: $this->toolResults
            ),
            'finishReason' => $this->finishReason?->name,
            'meta' => [
                'id' => $this->meta->id,
                'model' => $this->meta->model,
                'rateLimits' => $this->meta->rateLimits,
            ],
            'additionalContent' => $this->additionalContent,
            'chunkType' => $this->chunkType->value,
            'usage' => [
                'promptTokens' => $this->usage->promptTokens,
                'completionTokens' => $this->usage->completionTokens,
                'cacheWriteInputTokens' => $this->usage->cacheWriteInputTokens,
                'cacheReadInputTokens' => $this->usage->cacheReadInputTokens,
                'thoughtTokens' => $this->usage->thoughtTokens,
            ]
        ];
    }
}
