{{--
    Component: <x-exercise-weight-suggestion :suggested="..." :hasHistory="..." />
    Shows the suggested weight badge and info tooltip.
--}}
@if($suggested !== null)
    <div {{ $attributes }} class="mb-1 flex items-center gap-2">
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Suggested: {{ $suggested }} kg
        </span>
        <span class="ml-1 text-gray-400 cursor-pointer" title="Based on your 1RM, progression settings, and previous history. If no data, a default is used.">ⓘ</span>
    </div>
@endif 