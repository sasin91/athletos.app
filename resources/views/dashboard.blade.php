<x-layouts.app>
    <main class="mx-auto">
        @if(!isset($athlete) || !$athlete)
        <!-- No athlete profile message -->
        <section class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 class="mt-2 text-sm font-medium text-gray-900">No athlete profile</h2>
            <p class="mt-1 text-sm text-gray-500">Get started by creating your athlete profile.</p>
        </section>
        @else
        <livewire:dashboard :athlete="$athlete" />
        @endif
    </main>
</x-layouts.app>