<div class="max-w-4xl mx-auto p-6">
    <div class="bg-white rounded-lg shadow-lg">
        <!-- Header -->
        <div class="border-b border-gray-200 p-4">
            <h2 class="text-xl font-semibold text-gray-800">
                @if($basePlan)
                    AI Training Plan Assistant - Adjusting "{{ $basePlan->name }}"
                @else
                    AI Training Plan Generator
                @endif
            </h2>
            <p class="text-sm text-gray-600 mt-1">
                Chat with AI to create or adjust training plans based on your specific needs
            </p>
        </div>

        <!-- Chat Messages -->
        <div class="h-96 overflow-y-auto p-4 space-y-4" id="chat-messages">
            @foreach($messages as $message)
                <div class="flex {{ $message['role'] === 'user' ? 'justify-end' : 'justify-start' }}">
                    <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg {{ $message['role'] === 'user' ? 'bg-blue-500 text-white' : ($message['role'] === 'system' ? 'bg-gray-100 text-gray-800' : 'bg-gray-50 text-gray-800') }}">
                        <div class="flex items-center mb-1">
                            @if($message['role'] === 'user')
                                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-xs font-medium">You</span>
                            @elseif($message['role'] === 'system')
                                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-xs font-medium">System</span>
                            @else
                                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span class="text-xs font-medium">AI Coach</span>
                            @endif
                            <span class="text-xs text-gray-500 ml-2">{{ $message['timestamp']->format('H:i') }}</span>
                        </div>
                        <div class="text-sm">{{ $message['content'] }}</div>
                    </div>
                </div>
            @endforeach

            @if($isGenerating)
                <div class="flex justify-start">
                    <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-50 text-gray-800">
                        <div class="flex items-center">
                            <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span class="text-xs font-medium">AI Coach is thinking...</span>
                        </div>
                    </div>
                </div>
            @endif
        </div>

        <!-- Plan Preview Modal -->
        @if($showPlanPreview && $generatedPlan)
            <div class="border-t border-gray-200 bg-gray-50 p-4">
                <div class="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 class="text-lg font-semibold mb-3">Generated Training Plan Preview</h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <h4 class="font-medium text-gray-700">Plan Details</h4>
                            <p><strong>Name:</strong> {{ $generatedPlan->name }}</p>
                            <p><strong>Goal:</strong> {{ $generatedPlan->goal->value }}</p>
                            <p><strong>Experience Level:</strong> {{ $generatedPlan->experience_level->value }}</p>
                            <p><strong>Phases:</strong> {{ $generatedPlan->phases->count() }}</p>
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-700">Description</h4>
                            <p class="text-sm text-gray-600">{{ $generatedPlan->description }}</p>
                        </div>
                    </div>

                    <div class="mb-4">
                        <h4 class="font-medium text-gray-700 mb-2">Phases Overview</h4>
                        <div class="space-y-2">
                            @foreach($generatedPlan->phases as $phase)
                                <div class="bg-gray-50 rounded p-3">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <h5 class="font-medium">{{ $phase->name }}</h5>
                                            <p class="text-sm text-gray-600">{{ $phase->description }}</p>
                                            <p class="text-xs text-gray-500">{{ $phase->duration_weeks }} weeks</p>
                                        </div>
                                        <div class="text-right">
                                            <span class="text-sm text-gray-500">{{ count($phase->settings->exercises) }} exercises</span>
                                        </div>
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    </div>

                    <div class="flex space-x-3">
                        <button wire:click="savePlan" class="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                            <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            Save Training Plan
                        </button>
                        <button wire:click="discardPlan" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
                            <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                            Discard Plan
                        </button>
                    </div>
                </div>
            </div>
        @endif

        <!-- Chat Input -->
        <div class="border-t border-gray-200 p-4">
            <form wire:submit="sendMessage" class="flex space-x-3">
                <div class="flex-1">
                    <textarea 
                        wire:model="prompt"
                        placeholder="Ask me to create a training plan, adjust exercises, modify sets/reps, or anything else..."
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows="2"
                        @keydown.ctrl.enter="$wire.sendMessage()"
                    ></textarea>
                    @error('prompt') 
                        <span class="text-red-500 text-sm">{{ $message }}</span> 
                    @enderror
                </div>
                <button 
                    type="submit" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                    :disabled="$wire.isGenerating"
                >
                    @if($isGenerating)
                        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    @else
                        Send
                    @endif
                </button>
            </form>
            <p class="text-xs text-gray-500 mt-2">
                Press Ctrl+Enter to send quickly. Be specific about your goals, experience level, and preferences.
            </p>
        </div>
    </div>
</div>

<script>
document.addEventListener('livewire:updated', function() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
</script>