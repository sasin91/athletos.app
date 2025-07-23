<div class="flex flex-col h-full max-w-4xl mx-auto" x-data="chatInterface()">
    <!-- Header -->
    <div class="border-b border-gray-200 p-4 bg-white sticky top-0 z-10">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-xl font-semibold text-gray-800 flex items-center">
                    <x-heroicon-o-{{ $sessionType->icon() }} class="w-5 h-5 mr-2 text-{{ $sessionType->color() }}-500" />
                    {{ $sessionType->label() }}
                    @if($basePlan)
                        - "{{ $basePlan->name }}"
                    @endif
                </h2>
                <p class="text-sm text-gray-600 mt-1">{{ $sessionType->description() }}</p>
            </div>
            
            @if($session)
                <div class="text-xs text-gray-500">
                    Session #{{ $session->id }}
                    <span class="ml-2">{{ $session->messages->count() }} messages</span>
                </div>
            @endif
        </div>
    </div>

    <!-- Messages Container -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4" 
         id="messages-container"
         x-ref="messagesContainer">
        
        @foreach($messages as $message)
            <div class="flex {{ $message->role->isUser() ? 'justify-end' : 'justify-start' }}">
                <div class="max-w-xs lg:max-w-2xl group">
                    <!-- Message Header -->
                    <div class="flex items-center mb-1 {{ $message->role->isUser() ? 'justify-end' : 'justify-start' }}">
                        @if(!$message->role->isUser())
                            <x-heroicon-o-{{ $message->role->icon() }} class="w-4 h-4 mr-2" />
                        @endif
                        <span class="text-xs font-medium text-gray-600">{{ $message->role->label() }}</span>
                        <span class="text-xs text-gray-400 ml-2">{{ $message->created_at->format('H:i') }}</span>
                        @if($message->role->isUser())
                            <x-heroicon-o-{{ $message->role->icon() }} class="w-4 h-4 ml-2" />
                        @endif
                    </div>
                    
                    <!-- Message Content -->
                    <div class="px-4 py-3 rounded-lg {{ $message->role->cssClass() }} shadow-sm">
                        @if($message->is_streaming && !$message->completed_at)
                            <!-- Streaming message with typing indicator -->
                            <div x-data="streamingMessage('{{ $message->id }}')" 
                                 x-init="startListening()"
                                 class="relative">
                                <div x-html="content" class="prose prose-sm max-w-none"></div>
                                <div x-show="isStreaming" class="inline-flex items-center mt-2">
                                    <div class="flex space-x-1">
                                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s;"></div>
                                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
                                    </div>
                                    <span class="ml-2 text-xs text-gray-500">AI is typing...</span>
                                </div>
                            </div>
                        @else
                            <!-- Completed message -->
                            <div class="prose prose-sm max-w-none text-sm">
                                {!! Str::markdown($message->content) !!}
                            </div>
                        @endif
                        
                        @if($message->training_plan_id)
                            <div class="mt-3 pt-3 border-t border-gray-200">
                                <div class="flex items-center text-xs text-gray-600">
                                    <x-heroicon-o-document-plus class="w-4 h-4 mr-1" />
                                    Training plan created
                                    <a href="{{ route('training-plans.show', $message->training_plan_id) }}" 
                                       class="ml-2 text-blue-600 hover:text-blue-800 underline">
                                        View Plan
                                    </a>
                                </div>
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        @endforeach

        <!-- Loading State -->
        @if($isGenerating && !$streamingMessage)
            <div class="flex justify-start">
                <div class="max-w-xs lg:max-w-md">
                    <div class="flex items-center mb-1">
                        <x-heroicon-o-cpu-chip class="w-4 h-4 mr-2" />
                        <span class="text-xs font-medium text-gray-600">AI Coach</span>
                    </div>
                    <div class="px-4 py-3 rounded-lg bg-gray-50 text-gray-800 shadow-sm">
                        <div class="flex items-center">
                            <div class="flex space-x-1">
                                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s;"></div>
                                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
                            </div>
                            <span class="ml-3 text-sm">Thinking...</span>
                        </div>
                    </div>
                </div>
            </div>
        @endif
    </div>

    <!-- Input Area -->
    <div class="border-t border-gray-200 p-4 bg-white sticky bottom-0">
        <form wire:submit="sendMessage" class="flex space-x-3">
            <div class="flex-1">
                <div class="relative">
                    <textarea 
                        wire:model="message"
                        placeholder="Ask me to create a training plan, adjust exercises, explain techniques, or anything fitness-related..."
                        class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                        rows="1"
                        x-ref="messageInput"
                        x-data="autoResize()"
                        x-init="init()"
                        @keydown.ctrl.enter="$wire.sendMessage()"
                        @keydown.meta.enter="$wire.sendMessage()"
                        @input="resize()"
                        :disabled="@js($isGenerating)"
                    ></textarea>
                    
                    <!-- Character count -->
                    <div class="absolute bottom-2 right-2 text-xs text-gray-400">
                        <span x-text="$wire.message.length"></span>/1000
                    </div>
                </div>
                @error('message') 
                    <span class="text-red-500 text-sm mt-1 block">{{ $message }}</span> 
                @enderror
            </div>
            
            <button 
                type="submit" 
                class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors duration-200 flex items-center"
                :disabled="@js($isGenerating) || !$wire.message.trim()"
            >
                <template x-if="!@js($isGenerating)">
                    <div class="flex items-center">
                        <x-heroicon-o-paper-airplane class="w-4 h-4 mr-2" />
                        Send
                    </div>
                </template>
                <template x-if="@js($isGenerating)">
                    <div class="flex items-center">
                        <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </div>
                </template>
            </button>
        </form>
        
        <div class="flex items-center justify-between mt-2">
            <p class="text-xs text-gray-500">
                Press <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+Enter</kbd> or 
                <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">⌘+Enter</kbd> to send
            </p>
            
            @if($sessionType->isTrainingRelated())
                <div class="flex items-center text-xs text-green-600">
                    <x-heroicon-o-check-circle class="w-4 h-4 mr-1" />
                    MCP AI Enhanced
                </div>
            @endif
        </div>
    </div>
</div>

<script>
function chatInterface() {
    return {
        init() {
            this.scrollToBottom();
            
            // Listen for Livewire events
            this.$wire.on('streaming-complete', () => {
                this.scrollToBottom();
            });
            
            this.$wire.on('streaming-error', (event) => {
                alert('Error: ' + event.message);
            });
        },
        
        scrollToBottom() {
            this.$nextTick(() => {
                const container = this.$refs.messagesContainer;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            });
        }
    }
}

function streamingMessage(messageId) {
    return {
        messageId: messageId,
        content: '',
        isStreaming: true,
        
        startListening() {
            // Listen for streaming updates
            this.$wire.on('message-chunk', (event) => {
                this.content = this.parseMarkdown(event.content);
                this.scrollToBottom();
            });
            
            this.$wire.on('streaming-complete', () => {
                this.isStreaming = false;
            });
        },
        
        parseMarkdown(text) {
            // Basic markdown parsing for real-time display
            return text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>')
                .replace(/• /g, '• ');
        },
        
        scrollToBottom() {
            this.$nextTick(() => {
                const container = document.getElementById('messages-container');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            });
        }
    }
}

function autoResize() {
    return {
        init() {
            this.resize();
        },
        
        resize() {
            const textarea = this.$refs.messageInput;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    }
}

// Global scroll management
document.addEventListener('livewire:navigated', function() {
    setTimeout(() => {
        const container = document.getElementById('messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, 100);
});
</script>