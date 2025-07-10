<div 
    x-data="{
        show: @entangle('visible'),
        timeout: null,
        autoHide() {
            clearTimeout(this.timeout);
            if (this.show) {
                this.timeout = setTimeout(() => { this.show = false; $wire.close(); }, @js($timeout));
            }
        }
    }"
    x-init="$watch('show', value => { if (value) autoHide(); })"
    x-show="show"
    x-transition:enter="transform ease-out duration-300 transition"
    x-transition:enter-start="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    x-transition:enter-end="translate-y-0 opacity-100 sm:translate-x-0"
    x-transition:leave="transition ease-in duration-100"
    x-transition:leave-start="opacity-100"
    x-transition:leave-end="opacity-0"
    aria-live="assertive"
    class="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
    style="display: none;"
>
    <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
        <div class="pointer-events-auto w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 border border-gray-200 dark:border-gray-700">
            <div class="p-4">
                <div class="flex items-start">
                    <div class="shrink-0 mt-0.5">
                        <template x-if="$wire.type === 'success'">
                            <svg class="size-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                        </template>
                        <template x-if="$wire.type === 'error'">
                            <svg class="size-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2.25m0 4.5h.008v-.008H12v.008zm9 2.25A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z" /></svg>
                        </template>
                        <template x-if="$wire.type === 'info'">
                            <svg class="size-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2.25m0 4.5h.008v-.008H12v.008zm9 2.25A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z" /></svg>
                        </template>
                        <template x-if="$wire.type === 'warning'">
                            <svg class="size-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2.25m0 4.5h.008v-.008H12v.008zm9 2.25A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z" /></svg>
                        </template>
                    </div>
                    <div class="ml-3 w-0 flex-1 pt-0.5">
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100" x-text="$wire.title"></p>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-300" x-text="$wire.message"></p>
                    </div>
                    <div class="ml-4 flex shrink-0">
                        <button type="button" @click="show = false; $wire.close();" class="inline-flex rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden">
                            <span class="sr-only">Close</span>
                            <svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
