<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name') }}</title>
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#18181b">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
    <link rel="icon" href="/favicon.ico">
    <script>
        window.setAppearance = function(appearance) {
            let setDark = () => document.documentElement.classList.add('dark')
            let setLight = () => document.documentElement.classList.remove('dark')
            let setButtons = (appearance) => {
                document.querySelectorAll('button[onclick^="setAppearance"]').forEach((button) => {
                    button.setAttribute('aria-pressed', String(appearance === button.value))
                })
            }
            if (appearance === 'system') {
                let media = window.matchMedia('(prefers-color-scheme: dark)')
                window.localStorage.removeItem('appearance')
                media.matches ? setDark() : setLight()
            } else if (appearance === 'dark') {
                window.localStorage.setItem('appearance', 'dark')
                setDark()
            } else if (appearance === 'light') {
                window.localStorage.setItem('appearance', 'light')
                setLight()
            }
            if (document.readyState === 'complete') {
                setButtons(appearance)
            } else {
                document.addEventListener("DOMContentLoaded", () => setButtons(appearance))
            }
        }
        window.setAppearance(window.localStorage.getItem('appearance') || 'system')
    </script>

    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @livewireStyles
</head>

<body class="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 antialiased" x-data="{
    formSubmitted: false,
}">

    <!-- Main Container -->
    <div class="min-h-screen flex flex-col">

        <x-layouts.app.header />

        <!-- Main Content Area -->
        <div class="flex flex-1 overflow-hidden">
            <!-- Main Content -->
            <main class="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
                <!-- Success Message -->
                @session('status')
                <div x-data="{ showStatusMessage: true }" x-show="showStatusMessage"
                    x-transition:enter="transition ease-out duration-300"
                    x-transition:enter-start="opacity-0 transform -translate-y-2"
                    x-transition:enter-end="opacity-100 transform translate-y-0"
                    x-transition:leave="transition ease-in duration-300"
                    x-transition:leave-start="opacity-100 transform translate-y-0"
                    x-transition:leave-end="opacity-0 transform -translate-y-2"
                    class="mb-6 bg-green-50 dark:bg-green-900 border-l-4 border-green-500 p-4 rounded-md">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-green-500 dark:text-green-400"
                                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-green-700 dark:text-green-200">{{ session('status') }}</p>
                        </div>
                        <div class="ml-auto pl-3">
                            <div class="-mx-1.5 -my-1.5">
                                <button @click="showStatusMessage = false"
                                    class="inline-flex rounded-md p-1.5 text-green-500 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                                    <span class="sr-only">{{ __('Dismiss') }}</span>
                                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                        fill="currentColor">
                                        <path fill-rule="evenodd"
                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                            clip-rule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                @endsession
                {{ $slot }}
            </main>
        </div>
    </div>

    <footer class="w-full border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-4 mt-auto">
        <div class="max-w-2xl mx-auto flex flex-col sm:flex-row justify-center sm:justify-between items-center px-4 text-sm text-gray-500 dark:text-gray-400">
            <div class="mb-2 sm:mb-0">&copy; {{ date('Y') }} Athletos. All rights reserved.</div>
            <div class="space-x-4">
                <a href="{{ route('terms') }}" class="hover:underline">Terms of Service</a>
                <a href="{{ route('privacy') }}" class="hover:underline">Privacy Policy</a>
                <a href="{{ route('about') }}" class="hover:underline">About</a>
            </div>
        </div>
    </footer>

    @livewireScripts
    <livewire:notification />
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(function(registration) {
                        // Registration successful
                    }, function(err) {
                        // Registration failed
                        console.warn('ServiceWorker registration failed:', err);
                    });
            });
        }
    </script>
</body>

</html>