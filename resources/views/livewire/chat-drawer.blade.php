<!-- Chat Drawer Overlay -->
<div 
    x-data="{ open: @entangle('isOpen') }"
    x-show="open"
    x-transition:enter="transition-opacity ease-linear duration-300"
    x-transition:enter-start="opacity-0"
    x-transition:enter-end="opacity-100"
    x-transition:leave="transition-opacity ease-linear duration-300"
    x-transition:leave-start="opacity-100"
    x-transition:leave-end="opacity-0"
    class="fixed inset-0 z-50"
    style="display: none;"
>
    <!-- Background overlay -->
    <div 
        class="fixed inset-0 bg-gray-600 bg-opacity-75"
        @click="$wire.closeChat()"
    ></div>

    <!-- Drawer -->
    <div class="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div 
            class="w-screen max-w-lg"
            x-show="open"
            x-transition:enter="transform transition ease-in-out duration-500"
            x-transition:enter-start="translate-x-full"
            x-transition:enter-end="translate-x-0"
            x-transition:leave="transform transition ease-in-out duration-500"
            x-transition:leave-start="translate-x-0"
            x-transition:leave-end="translate-x-full"
        >
            <div class="h-full flex flex-col bg-white shadow-xl">
                <!-- Header -->
                <div class="px-4 py-6 bg-gray-50 border-b">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-lg font-medium text-gray-900 flex items-center">
                                <x-heroicon-o-chat-bubble-left-right class="w-5 h-5 mr-2 text-blue-500" />
                                AI Training Coach
                            </h2>
                            <p class="text-sm text-gray-500 mt-1">Get instant fitness advice and training plans</p>
                        </div>
                        <button 
                            wire:click="closeChat"
                            class="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <span class="sr-only">Close chat</span>
                            <x-heroicon-o-x-mark class="h-6 w-6" />
                        </button>
                    </div>


                    <!-- Session Actions -->
                    <div class="mt-3 flex items-center space-x-2">
                        <button
                            wire:click="newSession"
                            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <x-heroicon-o-plus class="w-3 h-3 mr-1" />
                            New Chat
                        </button>

                        @if($this->recentSessions->count() > 1)
                            <div x-data="{ showSessions: false }" class="relative">
                                <button
                                    @click="showSessions = !showSessions"
                                    class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <x-heroicon-o-clock class="w-3 h-3 mr-1" />
                                    Recent
                                    <x-heroicon-o-chevron-down class="w-3 h-3 ml-1" />
                                </button>

                                <div 
                                    x-show="showSessions"
                                    x-transition
                                    @click.away="showSessions = false"
                                    class="absolute top-8 left-0 z-10 w-64 bg-white border border-gray-200 rounded-md shadow-lg"
                                >
                                    <div class="py-1 max-h-48 overflow-y-auto">
                                        @foreach($this->recentSessions as $session)
                                            @if($session->id !== $activeSession?->id)
                                                <button
                                                    wire:click="loadSession({{ $session->id }})"
                                                    @click="showSessions = false"
                                                    class="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                                                >
                                                    <div class="flex items-center">
                                                        <x-heroicon-o-chat-bubble-left-right class="w-3 h-3 mr-2 text-blue-500" />
                                                        <div>
                                                            <div class="font-medium">{{ $session->subject ?? 'Chat Session' }}</div>
                                                            <div class="text-gray-500">
                                                                {{ $session->last_activity_at->diffForHumans() }}
                                                                • {{ $session->messages->count() }} messages
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            @endif
                                        @endforeach
                                    </div>
                                </div>
                            </div>
                        @endif
                    </div>
                </div>

                <!-- Chat Content -->
                <div class="flex-1 flex flex-col min-h-0">
                    @if($isOpen)
                        <livewire:chat 
                            :session="$activeSession"
                            :key="$activeSession?->id ?? 'new'"
                        />
                    @endif
                </div>
            </div>
        </div>
    </div>
</div>