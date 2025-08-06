import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';

export default function Welcome() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check if user has a saved preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  return (
    <>
      <Head title="AthletOS" />

      <div className="bg-white dark:bg-gray-900">
        {/* Header */}
        <header className="absolute inset-x-0 top-0 z-50">
          <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
            <div className="flex lg:flex-1">
              <Link href="/" prefetch className="-m-1.5 p-1.5">
                <span className="sr-only">AthletOS</span>
                <img className="h-8 w-auto" src="/images/logo.png" alt="AthletOS" />
              </Link>
            </div>
            <div className="hidden lg:flex lg:gap-x-12">
              <Link href="/about" prefetch className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">About</Link>
              <a href="#features" className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">Features</a>
              <a href="#training" className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">Training</a>
            </div>
            <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-x-4">
              <button
                onClick={toggleDarkMode}
                className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <Link href="/login" prefetch className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">
                Log in <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </nav>
        </header>

        <main className="isolate">
          {/* Hero section */}
          <div className="relative pt-14">
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
              <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
            </div>
            <div className="py-24 sm:py-32 lg:pb-40">
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                  <h1 className="text-5xl font-semibold tracking-tight text-balance text-gray-900 dark:text-gray-100 sm:text-7xl">
                    Train with Purpose.<br className="hidden sm:block" /> Adapt with Intelligence.
                  </h1>
                  <p className="mt-8 text-lg font-medium text-pretty text-gray-500 dark:text-gray-400 sm:text-xl/8">
                    A lifter-first operating system that tracks your training, recovery, and wellness—automatically. Built to integrate with your routine, devices, and goals.
                  </p>
                  <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link href="/register" prefetch className="rounded-md bg-gradient-to-r from-pink-500 to-violet-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-pink-600 hover:to-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500">
                      Get Early Access
                    </Link>
                    <Link href="/about" prefetch className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">
                      Learn more <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
                <div className="mt-16 flow-root sm:mt-24">
                  <div className="-m-2 rounded-xl bg-gray-900/5 dark:bg-white/5 p-2 ring-1 ring-gray-900/10 dark:ring-white/10 ring-inset lg:-m-4 lg:rounded-2xl lg:p-4">
                    <div className="h-96 bg-gradient-to-br from-pink-50 to-violet-100 dark:from-gray-800 dark:to-gray-700 rounded-md shadow-2xl ring-1 ring-gray-900/10 dark:ring-white/10 flex items-center justify-center relative overflow-hidden">
                      {/* Mockup dashboard content */}
                      <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded border-2 border-gray-200 dark:border-gray-600 p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <img src="/images/logo.png" alt="AthletOS" className="h-6 w-auto" />
                          <span className="font-semibold text-gray-900 dark:text-gray-100">Training Dashboard</span>
                        </div>
                        <div className="space-y-3">
                          <div className="h-8 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded flex items-center px-3">
                            <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full mr-3"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Barbell Back Squat - 3x5 @ 85%</span>
                          </div>
                          <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center px-3">
                            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mr-3"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Bench Press - 4x3 @ 90%</span>
                          </div>
                          <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center px-3">
                            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mr-3"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Romanian Deadlift - 3x8</span>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-between items-center text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Week 3 - Day 2</span>
                          <span className="bg-gradient-to-r from-pink-500 to-violet-500 text-white px-3 py-1 rounded text-xs">Start Training</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
              <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
            </div>
          </div>

          {/* Features section */}
          <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8" id="features">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base/7 font-semibold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">Intelligent Training</h2>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 dark:text-gray-100 sm:text-5xl lg:text-balance">
                Everything you need for systematic strength training
              </p>
              <p className="mt-6 text-lg/8 text-pretty text-gray-600 dark:text-gray-400">
                AthletOS combines intelligent programming with precise tracking to help you train smarter, not just harder. Built for powerlifters and strength athletes who demand results.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                <div className="relative pl-16">
                  <dt className="text-base/7 font-semibold text-gray-900 dark:text-gray-100">
                    <div className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-violet-500">
                      <svg className="size-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    Intelligent Programming
                  </dt>
                  <dd className="mt-2 text-base/7 text-gray-600 dark:text-gray-400">
                    Automatically adapts training plans based on your progress, recovery, and performance metrics. No more guesswork.
                  </dd>
                </div>
                <div className="relative pl-16">
                  <dt className="text-base/7 font-semibold text-gray-900 dark:text-gray-100">
                    <div className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-violet-500">
                      <svg className="size-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                    </div>
                    1RM Tracking
                  </dt>
                  <dd className="mt-2 text-base/7 text-gray-600 dark:text-gray-400">
                    Automatically calculates and tracks your one-rep maxes based on completed sets. Watch your strength progress over time.
                  </dd>
                </div>
                <div className="relative pl-16">
                  <dt className="text-base/7 font-semibold text-gray-900 dark:text-gray-100">
                    <div className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-violet-500">
                      <svg className="size-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </div>
                    Exercise Alternatives
                  </dt>
                  <dd className="mt-2 text-base/7 text-gray-600 dark:text-gray-400">
                    Smart exercise substitutions based on available equipment, energy levels, and training goals. Never miss a workout.
                  </dd>
                </div>
                <div className="relative pl-16">
                  <dt className="text-base/7 font-semibold text-gray-900 dark:text-gray-100">
                    <div className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-violet-500">
                      <svg className="size-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Recovery Optimization
                  </dt>
                  <dd className="mt-2 text-base/7 text-gray-600 dark:text-gray-400">
                    Integrated recovery suggestions and mobility work based on your training session and targeted muscle groups.
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Testimonial section */}
          <div className="mx-auto mt-32 max-w-7xl sm:mt-56 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden bg-gray-900 px-6 py-20 shadow-xl sm:rounded-3xl sm:px-10 sm:py-24 md:px-12 lg:px-20">
              <img className="absolute inset-0 size-full object-cover brightness-150 saturate-0" src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&fp-x=0.5&fp-y=0.6&fp-z=3&width=1440&height=1440&sat=-100" alt="" />
              <div className="absolute inset-0 bg-gray-900/90 mix-blend-multiply"></div>
              <div className="absolute -top-56 -left-80 transform-gpu blur-3xl" aria-hidden="true">
                <div className="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-[0.45]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
              </div>
              <div className="hidden md:absolute md:bottom-16 md:left-[50rem] md:block md:transform-gpu md:blur-3xl" aria-hidden="true">
                <div className="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-25" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
              </div>
              <div className="relative mx-auto max-w-2xl lg:mx-0">
                <img className="h-12 w-auto" src="/images/logo.png" alt="AthletOS" />
                <figure>
                  <blockquote className="mt-6 text-lg font-semibold text-white sm:text-xl/8">
                    <p>"As a developer and lifter passionate about data and self-improvement, I built AthletOS to meet my own needs. I wanted a platform that tells me exactly what to do, why, and when."</p>
                  </blockquote>
                  <figcaption className="mt-6 text-base text-white">
                    <div className="font-semibold">Founder & Developer</div>
                    <div className="mt-1">AthletOS</div>
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>

          {/* Stats section */}
          <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8" id="training">
            <div className="lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-2 lg:items-start lg:gap-24 lg:px-8">
              <div className="relative mx-auto max-w-md px-6 sm:max-w-3xl lg:px-0">
                {/* Content area */}
                <div className="pt-12 sm:pt-16 lg:pt-20">
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">Built for serious athletes</h2>
                  <div className="mt-6 space-y-6 text-gray-500 dark:text-gray-400">
                    <p className="text-lg">AthletOS is designed specifically for powerlifters and strength athletes who demand precision in their training. We understand that every rep, every set, and every session matters when you're pushing your limits.</p>
                    <p className="text-base/7">Our platform intelligently adapts your training plans based on your performance, recovery metrics, and personal preferences. Track your progress across multiple exercises, analyze your 1RMs, and get actionable insights to optimize your next session.</p>
                    <p className="text-base/7">From structured periodization to alternative exercise suggestions based on available equipment, AthletOS ensures your training stays consistent and effective whether you're at your home gym or traveling.</p>
                  </div>
                </div>
                <div className="mt-10">
                  <Link href="/about" prefetch className="text-base font-medium bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                    Learn more about our training methodology &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* CTA section */}
          <div className="relative -z-10 mt-32 px-6 lg:px-8">
            <div className="absolute inset-x-0 top-1/2 -z-10 flex -translate-y-1/2 transform-gpu justify-center overflow-hidden blur-3xl sm:top-auto sm:right-[calc(50%-6rem)] sm:bottom-0 sm:translate-y-0 sm:transform-gpu sm:justify-end" aria-hidden="true">
              <div className="aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-25" style={{ clipPath: 'polygon(73.6% 48.6%, 91.7% 88.5%, 100% 53.9%, 97.4% 18.1%, 92.5% 15.4%, 75.7% 36.3%, 55.3% 52.8%, 46.5% 50.9%, 45% 37.4%, 50.3% 13.1%, 21.3% 36.2%, 0.1% 0.1%, 5.4% 49.1%, 21.4% 36.4%, 58.9% 100%, 73.6% 48.6%)' }}></div>
            </div>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-4xl font-semibold tracking-tight text-balance text-gray-900 dark:text-gray-100 sm:text-5xl">Ready to transform your training?</h2>
              <p className="mx-auto mt-6 max-w-xl text-lg/8 text-pretty text-gray-600 dark:text-gray-400">Join our growing community of dedicated athletes using AthletOS to systematically track progress, optimize workouts, and achieve new personal records.</p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/register" prefetch className="rounded-md bg-gradient-to-r from-pink-500 to-violet-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-pink-600 hover:to-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500">Start Training</Link>
                <Link href="/about" prefetch className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">Learn more <span aria-hidden="true">→</span></Link>
              </div>
            </div>
            <div className="absolute top-full right-0 left-1/2 -z-10 hidden -translate-y-1/2 transform-gpu overflow-hidden blur-3xl sm:block" aria-hidden="true">
              <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative mx-auto mt-32 max-w-7xl px-6 lg:px-8">
          <div className="border-t border-gray-900/10 dark:border-white/10 py-16 sm:py-24 lg:py-32">
            <div className="xl:grid xl:grid-cols-3 xl:gap-8">
              <img className="h-9" src="/images/logo.png" alt="AthletOS" />
              <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
                <div className="md:grid md:grid-cols-2 md:gap-8">
                  <div>
                    <h3 className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">Training</h3>
                    <ul role="list" className="mt-6 space-y-4">
                      <li>
                        <Link href="/about" prefetch className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Methodology</Link>
                      </li>
                      <li>
                        <a href="#features" className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Features</a>
                      </li>
                      <li>
                        <a href="#training" className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Progress Tracking</a>
                      </li>
                      <li>
                        <Link href="/exercises" prefetch className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Exercise Library</Link>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-10 md:mt-0">
                    <h3 className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">Support</h3>
                    <ul role="list" className="mt-6 space-y-4">
                      <li>
                        <Link href="/help" prefetch className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Help Center</Link>
                      </li>
                      <li>
                        <Link href="/guides" prefetch className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Training Guides</Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="md:grid md:grid-cols-2 md:gap-8">
                  <div>
                    <h3 className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">Platform</h3>
                    <ul role="list" className="mt-6 space-y-4">
                      <li>
                        <Link href="/about" prefetch className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">About</Link>
                      </li>
                      <li>
                        <Link href="/blog" prefetch className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Blog</Link>
                      </li>
                      <li>
                        <Link href="/changelog" prefetch className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Changelog</Link>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-10 md:mt-0">
                    <h3 className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">Legal</h3>
                    <ul role="list" className="mt-6 space-y-4">
                      <li>
                        <Link href="/privacy" prefetch className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Privacy</Link>
                      </li>
                      <li>
                        <Link href="/terms" prefetch className="text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Terms</Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-16 border-t border-gray-900/10 dark:border-white/10 pt-8 sm:mt-20 lg:mt-24">
              <div className="text-center">
                <p className="text-sm/6 text-gray-600 dark:text-gray-400">&copy; 2025 AthletOS. Logically composed, strongly defined.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}