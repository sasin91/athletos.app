<div class="flex flex-col h-full max-w-4xl mx-auto">
    <!-- Header -->
    <div class="border-b border-gray-200 p-4 bg-white sticky top-0 z-4">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-xl font-semibold text-gray-800 flex items-center">
                    <x-heroicon-o-chat-bubble-left-right class="w-5 h-5 mr-2 text-blue-500" />
                    {{ $session?->subject ?? 'AI Training Coach' }}
                    @if ($basePlan)
                        - "{{ $basePlan->name }}"
                    @endif
                </h2>
                <p class="text-sm text-gray-600 mt-1">Get personalized fitness advice and training plans</p>
            </div>

            @if ($session)
                <div class="text-xs text-gray-500">
                    Session #{{ $session->id }}
                    <span class="ml-2">{{ $session->messages->count() }} messages</span>
                </div>
            @endif
        </div>
    </div>

    <!-- Messages Container -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4" id="messages-container" x-ref="messagesContainer">

        @foreach ($messages as $message)
            <div class="flex {{ $message->role->isUser() ? 'justify-end' : 'justify-start' }}">
                <div class="max-w-xs lg:max-w-2xl group">
                    <!-- Message Header -->
                    <div
                        class="flex items-center mb-1 {{ $message->role->isUser() ? 'justify-end' : 'justify-start' }}">
                        @if (!$message->role->isUser())
                            <x-heroicon-o-{{ $message->role->icon() }} class="w-4 h-4 mr-2" />
                        @endif
                        <span class="text-xs font-medium text-gray-600">{{ $message->role->label() }}</span>
                        <span class="text-xs text-gray-400 ml-2">{{ $message->created_at->format('H:i') }}</span>
                        @if ($message->role->isUser())
                            <x-heroicon-o-{{ $message->role->icon() }} class="w-4 h-4 ml-2" />
                        @endif
                    </div>

                    <!-- Message Content -->
                    <div class="px-4 py-3 rounded-lg {{ $message->role->cssClass() }} shadow-sm">
                        <div class="prose prose-sm max-w-none text-sm">
                            {!! Str::markdown($message->content) !!}
                        </div>

                        @if ($message->training_plan_id)
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

        <!-- Current streaming response -->
        @if ($question)
            <div class="flex justify-start">
                <div class="max-w-xs lg:max-w-2xl group">
                    <div class="flex items-center mb-1">
                        <x-heroicon-o-cpu-chip class="w-4 h-4 mr-2" />
                        <span class="text-xs font-medium text-gray-600">AI Coach</span>
                    </div>
                    <div class="px-4 py-3 rounded-lg bg-gray-50 text-gray-800 shadow-sm">
                        <p class="prose prose-sm max-w-none text-sm" wire:stream="answer">
                            {{ $answer }}
                        </p>
                    </div>
                </div>
            </div>
        @endif
    </div>

    <!-- Input Area -->
    <div class="border-t border-gray-200 p-4 bg-white sticky bottom-0">
        <form wire:submit="submitPrompt" class="flex space-x-3">
            <div class="flex-1">
                <div class="relative">
                    <textarea wire:model="prompt"
                        placeholder="Ask me to create a training plan, adjust exercises, explain techniques, or anything fitness-related..."
                        class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                        rows="1" x-ref="promptInput" x-data="{
                            resize() {
                                const textarea = this.$refs.promptInput;
                                textarea.style.height = 'auto';
                                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
                            }
                        }" x-init="resize()"
                        @keydown.ctrl.enter="$wire.submitPrompt()" @keydown.meta.enter="$wire.submitPrompt()" @input="resize()"></textarea>

                    <!-- Character count -->
                    <div class="absolute bottom-2 right-2 text-xs text-gray-400">
                        <span x-text="$wire.prompt.length"></span>/1000
                    </div>
                </div>
                @error('prompt')
                    <span class="text-red-500 text-sm mt-1 block">{{ $prompt }}</span>
                @enderror
            </div>

            <button type="submit"
                class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors duration-200 flex items-center"
                :disabled="!$wire.prompt.trim()">
                <x-heroicon-o-paper-airplane class="w-4 h-4 mr-2" />
                Send
            </button>
        </form>

        <div class="flex items-center justify-between mt-2">
            <p class="text-xs text-gray-500">
                Press <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+Enter</kbd> or
                <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">⌘+Enter</kbd> to send
            </p>

            <div class="flex items-center text-xs text-green-600">
                <x-heroicon-o-check-circle class="w-4 h-4 mr-1" />
                MCP AI Enhanced
            </div>
        </div>
    </div>
</div>

@script
    <script>
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
@endscript
