<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AthletOS</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio"></script>
</head>

<body>
<div class="bg-white">
  <!-- Header -->
  <header class="absolute inset-x-0 top-0 z-50">
    <nav class="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
      <div class="flex lg:flex-1">
        <a href="#" class="-m-1.5 p-1.5">
          <span class="sr-only">AthletOS</span>
          <img class="h-8 w-auto" src="/images/logo.png" alt="AthletOS" />
        </a>
      </div>
      <div class="hidden lg:flex lg:gap-x-12">
        <a href="/about" class="text-sm/6 font-semibold text-gray-900">About</a>
        <a href="#features" class="text-sm/6 font-semibold text-gray-900">Features</a>
        <a href="#training" class="text-sm/6 font-semibold text-gray-900">Training</a>
      </div>
      <div class="hidden lg:flex lg:flex-1 lg:justify-end">
        <a href="/login" class="text-sm/6 font-semibold text-gray-900">Log in <span aria-hidden="true">&rarr;</span></a>
      </div>
    </nav>
  </header>

  <main class="isolate">
    <!-- Hero section -->
    <div class="relative pt-14">
      <div class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3b82f6] to-[#1d4ed8] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"></div>
      </div>
      <div class="py-24 sm:py-32 lg:pb-40">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="mx-auto max-w-2xl text-center">
            <h1 class="text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl">Train with Purpose.<br class="hidden sm:block"> Adapt with Intelligence.</h1>
            <p class="mt-8 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">A lifter-first operating system that tracks your training, recovery, and wellness—automatically. Built to integrate with your routine, devices, and goals.</p>
            <div class="mt-10 flex items-center justify-center gap-x-6">
              <a href="/register" class="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Get Early Access</a>
              <a href="/about" class="text-sm/6 font-semibold text-gray-900">Learn more <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div class="mt-16 flow-root sm:mt-24">
            <div class="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-gray-900/10 ring-inset lg:-m-4 lg:rounded-2xl lg:p-4">
              <div class="h-96 bg-gradient-to-br from-blue-50 to-slate-100 rounded-md shadow-2xl ring-1 ring-gray-900/10 flex items-center justify-center relative overflow-hidden">
                <!-- Mockup dashboard content -->
                <div class="absolute inset-4 bg-white rounded border-2 border-gray-200 p-4">
                  <div class="flex items-center gap-3 mb-4">
                    <img src="/images/logo.png" alt="AthletOS" class="h-6 w-auto" />
                    <span class="font-semibold text-gray-900">Training Dashboard</span>
                  </div>
                  <div class="space-y-3">
                    <div class="h-8 bg-blue-100 rounded flex items-center px-3">
                      <div class="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      <span class="text-sm text-gray-700">Barbell Back Squat - 3x5 @ 85%</span>
                    </div>
                    <div class="h-8 bg-gray-100 rounded flex items-center px-3">
                      <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                      <span class="text-sm text-gray-700">Bench Press - 4x3 @ 90%</span>
                    </div>
                    <div class="h-8 bg-gray-100 rounded flex items-center px-3">
                      <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                      <span class="text-sm text-gray-700">Romanian Deadlift - 3x8</span>
                    </div>
                  </div>
                  <div class="mt-4 flex justify-between items-center text-sm">
                    <span class="text-gray-500">Week 3 - Day 2</span>
                    <span class="bg-blue-600 text-white px-3 py-1 rounded text-xs">Start Training</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
        <div class="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#3b82f6] to-[#1d4ed8] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"></div>
      </div>
    </div>

          <!-- Features section -->
    <div class="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8" id="features">
      <div class="mx-auto max-w-2xl lg:text-center">
        <h2 class="text-base/7 font-semibold text-blue-600">Intelligent Training</h2>
        <p class="mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl lg:text-balance">Everything you need for systematic strength training</p>
        <p class="mt-6 text-lg/8 text-pretty text-gray-600">AthletOS combines intelligent programming with precise tracking to help you train smarter, not just harder. Built for powerlifters and strength athletes who demand results.</p>
      </div>
      <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
        <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
          <div class="relative pl-16">
            <dt class="text-base/7 font-semibold text-gray-900">
              <div class="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-blue-600">
                <svg class="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              Intelligent Programming
            </dt>
            <dd class="mt-2 text-base/7 text-gray-600">Automatically adapts training plans based on your progress, recovery, and performance metrics. No more guesswork.</dd>
          </div>
          <div class="relative pl-16">
            <dt class="text-base/7 font-semibold text-gray-900">
              <div class="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-blue-600">
                <svg class="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              1RM Tracking
            </dt>
            <dd class="mt-2 text-base/7 text-gray-600">Automatically calculates and tracks your one-rep maxes based on completed sets. Watch your strength progress over time.</dd>
          </div>
          <div class="relative pl-16">
            <dt class="text-base/7 font-semibold text-gray-900">
              <div class="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-blue-600">
                <svg class="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              Exercise Alternatives
            </dt>
            <dd class="mt-2 text-base/7 text-gray-600">Smart exercise substitutions based on available equipment, energy levels, and training goals. Never miss a workout.</dd>
          </div>
          <div class="relative pl-16">
            <dt class="text-base/7 font-semibold text-gray-900">
              <div class="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-blue-600">
                <svg class="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Recovery Optimization
            </dt>
            <dd class="mt-2 text-base/7 text-gray-600">Integrated recovery suggestions and mobility work based on your training session and targeted muscle groups.</dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- Testimonial section -->
    <div class="mx-auto mt-32 max-w-7xl sm:mt-56 sm:px-6 lg:px-8">
      <div class="relative overflow-hidden bg-gray-900 px-6 py-20 shadow-xl sm:rounded-3xl sm:px-10 sm:py-24 md:px-12 lg:px-20">
        <img class="absolute inset-0 size-full object-cover brightness-150 saturate-0" src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&fp-x=0.5&fp-y=0.6&fp-z=3&width=1440&height=1440&sat=-100" alt="" />
        <div class="absolute inset-0 bg-gray-900/90 mix-blend-multiply"></div>
        <div class="absolute -top-56 -left-80 transform-gpu blur-3xl" aria-hidden="true">
          <div class="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] opacity-[0.45]" style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"></div>
        </div>
        <div class="hidden md:absolute md:bottom-16 md:left-[50rem] md:block md:transform-gpu md:blur-3xl" aria-hidden="true">
          <div class="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] opacity-25" style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"></div>
        </div>
        <div class="relative mx-auto max-w-2xl lg:mx-0">
          <img class="h-12 w-auto" src="/images/logo.png" alt="AthletOS" />
          <figure>
            <blockquote class="mt-6 text-lg font-semibold text-white sm:text-xl/8">
              <p>"As a developer and lifter passionate about data and self-improvement, I built AthletOS to meet my own needs. I wanted a platform that tells me exactly what to do, why, and when."</p>
            </blockquote>
            <figcaption class="mt-6 text-base text-white">
              <div class="font-semibold">Founder & Developer</div>
              <div class="mt-1">AthletOS</div>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>

    <!-- Stats section -->
    <div class="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8" id="training">
      <div class="lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-2 lg:items-start lg:gap-24 lg:px-8">

          <div class="relative mx-auto max-w-md px-6 sm:max-w-3xl lg:px-0">
            <!-- Content area -->
            <div class="pt-12 sm:pt-16 lg:pt-20">
              <h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Built for serious athletes</h2>
              <div class="mt-6 space-y-6 text-gray-500">
                <p class="text-lg">AthletOS is designed specifically for powerlifters and strength athletes who demand precision in their training. We understand that every rep, every set, and every session matters when you're pushing your limits.</p>
                <p class="text-base/7">Our platform intelligently adapts your training plans based on your performance, recovery metrics, and personal preferences. Track your progress across multiple exercises, analyze your 1RMs, and get actionable insights to optimize your next session.</p>
                <p class="text-base/7">From structured periodization to alternative exercise suggestions based on available equipment, AthletOS ensures your training stays consistent and effective whether you're at your home gym or traveling.</p>
              </div>
            </div>

            @php
            // Get real statistics from database
            $athleteCount = \App\Models\Athlete::count();
            $completedTrainings = \App\Models\Training::whereNotNull('completed_at')->count();
            $performanceRecords = \App\Models\PerformanceIndicator::count();

            // Only show stats if we have meaningful data
            $showStats = $athleteCount > 0 || $completedTrainings > 0 || $performanceRecords > 0;
            @endphp

            @if($showStats)
            <!-- Stats section -->
            <div class="mt-10">
              <dl class="grid grid-cols-2 gap-x-4 gap-y-8">
                @if($athleteCount > 0)
                <div class="border-t-2 border-gray-100 pt-6">
                  <dt class="text-base font-medium text-gray-500">Athletes</dt>
                  <dd class="text-3xl font-bold tracking-tight text-gray-900">{{ $athleteCount }}</dd>
                </div>
                @endif

                @if($completedTrainings > 0)
                <div class="border-t-2 border-gray-100 pt-6">
                  <dt class="text-base font-medium text-gray-500">Training Sessions</dt>
                  <dd class="text-3xl font-bold tracking-tight text-gray-900">{{ $completedTrainings }}</dd>
                </div>
                @endif

                @if($performanceRecords > 0)
                <div class="border-t-2 border-gray-100 pt-6">
                  <dt class="text-base font-medium text-gray-500">Performance Records</dt>
                  <dd class="text-3xl font-bold tracking-tight text-gray-900">{{ $performanceRecords }}</dd>
                </div>
                @endif

                @if($athleteCount > 1 && $completedTrainings > 0)
                <div class="border-t-2 border-gray-100 pt-6">
                  <dt class="text-base font-medium text-gray-500">Avg. Sessions per Athlete</dt>
                  <dd class="text-3xl font-bold tracking-tight text-gray-900">{{ round($completedTrainings / $athleteCount, 1) }}</dd>
                </div>
                @endif
              </dl>
              <div class="mt-10">
                <a href="/about" class="text-base font-medium text-blue-600">Learn more about our training methodology &rarr;</a>
              </div>
            </div>
            @else
            <!-- No stats to show yet - focus on methodology -->
            <div class="mt-10">
              <a href="/about" class="text-base font-medium text-blue-600">Learn more about our training methodology &rarr;</a>
            </div>
            @endif
          </div>
        </div>
      </div>



          <!-- CTA section -->
    <div class="relative -z-10 mt-32 px-6 lg:px-8">
      <div class="absolute inset-x-0 top-1/2 -z-10 flex -translate-y-1/2 transform-gpu justify-center overflow-hidden blur-3xl sm:top-auto sm:right-[calc(50%-6rem)] sm:bottom-0 sm:translate-y-0 sm:transform-gpu sm:justify-end" aria-hidden="true">
        <div class="aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] opacity-25" style="clip-path: polygon(73.6% 48.6%, 91.7% 88.5%, 100% 53.9%, 97.4% 18.1%, 92.5% 15.4%, 75.7% 36.3%, 55.3% 52.8%, 46.5% 50.9%, 45% 37.4%, 50.3% 13.1%, 21.3% 36.2%, 0.1% 0.1%, 5.4% 49.1%, 21.4% 36.4%, 58.9% 100%, 73.6% 48.6%)"></div>
      </div>
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-4xl font-semibold tracking-tight text-balance text-gray-900 sm:text-5xl">Ready to transform your training?</h2>
        <p class="mx-auto mt-6 max-w-xl text-lg/8 text-pretty text-gray-600">Join our growing community of dedicated athletes using AthletOS to systematically track progress, optimize workouts, and achieve new personal records.</p>
        <div class="mt-10 flex items-center justify-center gap-x-6">
          <a href="/register" class="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Start Training</a>
          <a href="/about" class="text-sm/6 font-semibold text-gray-900">Learn more <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <div class="absolute top-full right-0 left-1/2 -z-10 hidden -translate-y-1/2 transform-gpu overflow-hidden blur-3xl sm:block" aria-hidden="true">
        <div class="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#3b82f6] to-[#1d4ed8] opacity-30" style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"></div>
      </div>
    </div>
    </main>

      <!-- Footer -->
  <footer class="relative mx-auto mt-32 max-w-7xl px-6 lg:px-8">
    <div class="border-t border-gray-900/10 py-16 sm:py-24 lg:py-32">
      <div class="xl:grid xl:grid-cols-3 xl:gap-8">
        <img class="h-9" src="/images/logo.png" alt="AthletOS" />
        <div class="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
          <div class="md:grid md:grid-cols-2 md:gap-8">
            <div>
              <h3 class="text-sm/6 font-semibold text-gray-900">Training</h3>
              <ul role="list" class="mt-6 space-y-4">
                <li>
                  <a href="/about" class="text-sm/6 text-gray-600 hover:text-gray-900">Methodology</a>
                </li>
                <li>
                  <a href="#features" class="text-sm/6 text-gray-600 hover:text-gray-900">Features</a>
                </li>
                <li>
                  <a href="#training" class="text-sm/6 text-gray-600 hover:text-gray-900">Progress Tracking</a>
                </li>
                <li>
                  <a href="/exercises" class="text-sm/6 text-gray-600 hover:text-gray-900">Exercise Library</a>
                </li>
              </ul>
            </div>
            <div class="mt-10 md:mt-0">
              <h3 class="text-sm/6 font-semibold text-gray-900">Support</h3>
              <ul role="list" class="mt-6 space-y-4">
                <li>
                  <a href="/help" class="text-sm/6 text-gray-600 hover:text-gray-900">Help Center</a>
                </li>
                <li>
                  <a href="/docs" class="text-sm/6 text-gray-600 hover:text-gray-900">Documentation</a>
                </li>
                <li>
                  <a href="/guides" class="text-sm/6 text-gray-600 hover:text-gray-900">Training Guides</a>
                </li>
              </ul>
            </div>
          </div>
          <div class="md:grid md:grid-cols-2 md:gap-8">
            <div>
              <h3 class="text-sm/6 font-semibold text-gray-900">Platform</h3>
              <ul role="list" class="mt-6 space-y-4">
                <li>
                  <a href="/about" class="text-sm/6 text-gray-600 hover:text-gray-900">About</a>
                </li>
                <li>
                  <a href="/blog" class="text-sm/6 text-gray-600 hover:text-gray-900">Blog</a>
                </li>
                <li>
                  <a href="/changelog" class="text-sm/6 text-gray-600 hover:text-gray-900">Changelog</a>
                </li>
              </ul>
            </div>
            <div class="mt-10 md:mt-0">
              <h3 class="text-sm/6 font-semibold text-gray-900">Legal</h3>
              <ul role="list" class="mt-6 space-y-4">
                <li>
                  <a href="/privacy" class="text-sm/6 text-gray-600 hover:text-gray-900">Privacy</a>
                </li>
                <li>
                  <a href="/terms" class="text-sm/6 text-gray-600 hover:text-gray-900">Terms</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-16 border-t border-gray-900/10 pt-8 sm:mt-20 lg:mt-24">
        <div class="text-center">
          <p class="text-sm/6 text-gray-600">&copy; 2025 AthletOS. Logically composed, strongly defined.</p>
        </div>
      </div>
    </div>
  </footer>
  </div>

</body>

</html>
</rewritten_file>