@props(['day'])

<button type="button"
        wire:click.stop="selectDate('{{ $day->date->toDateString() }}')"
        class="flex h-14 flex-col px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:z-10 {{ $day->dayType->getClasses() }}">
    
    <time datetime="{{ $day->date->toDateString() }}" class="ml-auto {{ $day->getTimeClasses() }}">
        {{ $day->date->day }}
    </time>
    
    @if($day->hasTrainings())
        <span class="sr-only">{{ $day->trainings->count() }} {{ $day->trainings->count() === 1 ? 'training' : 'trainings' }}</span>
        <span class="-mx-0.5 mt-auto flex flex-wrap-reverse">
            @for($i = 0; $i < min($day->trainings->count(), 3); $i++)
                @php $training = $day->trainings->get($i); @endphp
                <span class="mx-0.5 mb-1 h-1.5 w-1.5 rounded-full {{ ($training && $training->completed_at) ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500' }}"></span>
            @endfor
        </span>
    @else
        <span class="sr-only">0 trainings</span>
    @endif
</button> 