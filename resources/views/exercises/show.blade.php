<x-layouts.app>
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-3xl mx-auto">
            @include("exercises.{$exercise->value}")
        </div>
    </div>
</x-layouts.app> 