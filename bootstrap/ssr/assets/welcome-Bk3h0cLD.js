import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { Head, Link } from "@inertiajs/react";
import { useState, useEffect } from "react";
function Welcome() {
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || !savedTheme && prefersDark) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Head, { title: "AthletOS" }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-900", children: [
      /* @__PURE__ */ jsx("header", { className: "absolute inset-x-0 top-0 z-50", children: /* @__PURE__ */ jsxs("nav", { className: "flex items-center justify-between p-6 lg:px-8", "aria-label": "Global", children: [
        /* @__PURE__ */ jsx("div", { className: "flex lg:flex-1", children: /* @__PURE__ */ jsxs(Link, { href: "/", className: "-m-1.5 p-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "AthletOS" }),
          /* @__PURE__ */ jsx("img", { className: "h-8 w-auto", src: "/images/logo.png", alt: "AthletOS" })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "hidden lg:flex lg:gap-x-12", children: [
          /* @__PURE__ */ jsx(Link, { href: "/about", className: "text-sm/6 font-semibold text-gray-900 dark:text-gray-100", children: "About" }),
          /* @__PURE__ */ jsx("a", { href: "#features", className: "text-sm/6 font-semibold text-gray-900 dark:text-gray-100", children: "Features" }),
          /* @__PURE__ */ jsx("a", { href: "#training", className: "text-sm/6 font-semibold text-gray-900 dark:text-gray-100", children: "Training" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-x-4", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: toggleDarkMode,
              className: "rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              "aria-label": "Toggle dark mode",
              children: darkMode ? /* @__PURE__ */ jsx("svg", { className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" }) }) : /* @__PURE__ */ jsx("svg", { className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" }) })
            }
          ),
          /* @__PURE__ */ jsxs(Link, { href: "/login", className: "text-sm/6 font-semibold text-gray-900 dark:text-gray-100", children: [
            "Log in ",
            /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "→" })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("main", { className: "isolate", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative pt-14", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) }),
          /* @__PURE__ */ jsx("div", { className: "py-24 sm:py-32 lg:pb-40", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-6 lg:px-8", children: [
            /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [
              /* @__PURE__ */ jsxs("h1", { className: "text-5xl font-semibold tracking-tight text-balance text-gray-900 dark:text-gray-100 sm:text-7xl", children: [
                "Train with Purpose.",
                /* @__PURE__ */ jsx("br", { className: "hidden sm:block" }),
                " Adapt with Intelligence."
              ] }),
              /* @__PURE__ */ jsx("p", { className: "mt-8 text-lg font-medium text-pretty text-gray-500 dark:text-gray-400 sm:text-xl/8", children: "A lifter-first operating system that tracks your training, recovery, and wellness—automatically. Built to integrate with your routine, devices, and goals." }),
              /* @__PURE__ */ jsxs("div", { className: "mt-10 flex items-center justify-center gap-x-6", children: [
                /* @__PURE__ */ jsx(Link, { href: "/register", className: "rounded-md bg-gradient-to-r from-pink-500 to-violet-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-pink-600 hover:to-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500", children: "Get Early Access" }),
                /* @__PURE__ */ jsxs(Link, { href: "/about", className: "text-sm/6 font-semibold text-gray-900 dark:text-gray-100", children: [
                  "Learn more ",
                  /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "→" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-16 flow-root sm:mt-24", children: /* @__PURE__ */ jsx("div", { className: "-m-2 rounded-xl bg-gray-900/5 dark:bg-white/5 p-2 ring-1 ring-gray-900/10 dark:ring-white/10 ring-inset lg:-m-4 lg:rounded-2xl lg:p-4", children: /* @__PURE__ */ jsx("div", { className: "h-96 bg-gradient-to-br from-pink-50 to-violet-100 dark:from-gray-800 dark:to-gray-700 rounded-md shadow-2xl ring-1 ring-gray-900/10 dark:ring-white/10 flex items-center justify-center relative overflow-hidden", children: /* @__PURE__ */ jsxs("div", { className: "absolute inset-4 bg-white dark:bg-gray-800 rounded border-2 border-gray-200 dark:border-gray-600 p-4", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
                /* @__PURE__ */ jsx("img", { src: "/images/logo.png", alt: "AthletOS", className: "h-6 w-auto" }),
                /* @__PURE__ */ jsx("span", { className: "font-semibold text-gray-900 dark:text-gray-100", children: "Training Dashboard" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "h-8 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded flex items-center px-3", children: [
                  /* @__PURE__ */ jsx("div", { className: "w-2 h-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full mr-3" }),
                  /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: "Barbell Back Squat - 3x5 @ 85%" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center px-3", children: [
                  /* @__PURE__ */ jsx("div", { className: "w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mr-3" }),
                  /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: "Bench Press - 4x3 @ 90%" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center px-3", children: [
                  /* @__PURE__ */ jsx("div", { className: "w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mr-3" }),
                  /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: "Romanian Deadlift - 3x8" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "mt-4 flex justify-between items-center text-sm", children: [
                /* @__PURE__ */ jsx("span", { className: "text-gray-500 dark:text-gray-400", children: "Week 3 - Day 2" }),
                /* @__PURE__ */ jsx("span", { className: "bg-gradient-to-r from-pink-500 to-violet-500 text-white px-3 py-1 rounded text-xs", children: "Start Training" })
              ] })
            ] }) }) }) })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8", id: "features", children: [
          /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl lg:text-center", children: [
            /* @__PURE__ */ jsx("h2", { className: "text-base/7 font-semibold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent", children: "Intelligent Training" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 dark:text-gray-100 sm:text-5xl lg:text-balance", children: "Everything you need for systematic strength training" }),
            /* @__PURE__ */ jsx("p", { className: "mt-6 text-lg/8 text-pretty text-gray-600 dark:text-gray-400", children: "AthletOS combines intelligent programming with precise tracking to help you train smarter, not just harder. Built for powerlifters and strength athletes who demand results." })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl", children: /* @__PURE__ */ jsxs("dl", { className: "grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative pl-16", children: [
              /* @__PURE__ */ jsxs("dt", { className: "text-base/7 font-semibold text-gray-900 dark:text-gray-100", children: [
                /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-violet-500", children: /* @__PURE__ */ jsx("svg", { className: "size-6 text-white", fill: "none", viewBox: "0 0 24 24", strokeWidth: "1.5", stroke: "currentColor", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" }) }) }),
                "Intelligent Programming"
              ] }),
              /* @__PURE__ */ jsx("dd", { className: "mt-2 text-base/7 text-gray-600 dark:text-gray-400", children: "Automatically adapts training plans based on your progress, recovery, and performance metrics. No more guesswork." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "relative pl-16", children: [
              /* @__PURE__ */ jsxs("dt", { className: "text-base/7 font-semibold text-gray-900 dark:text-gray-100", children: [
                /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-violet-500", children: /* @__PURE__ */ jsx("svg", { className: "size-6 text-white", fill: "none", viewBox: "0 0 24 24", strokeWidth: "1.5", stroke: "currentColor", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" }) }) }),
                "1RM Tracking"
              ] }),
              /* @__PURE__ */ jsx("dd", { className: "mt-2 text-base/7 text-gray-600 dark:text-gray-400", children: "Automatically calculates and tracks your one-rep maxes based on completed sets. Watch your strength progress over time." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "relative pl-16", children: [
              /* @__PURE__ */ jsxs("dt", { className: "text-base/7 font-semibold text-gray-900 dark:text-gray-100", children: [
                /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-violet-500", children: /* @__PURE__ */ jsx("svg", { className: "size-6 text-white", fill: "none", viewBox: "0 0 24 24", strokeWidth: "1.5", stroke: "currentColor", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" }) }) }),
                "Exercise Alternatives"
              ] }),
              /* @__PURE__ */ jsx("dd", { className: "mt-2 text-base/7 text-gray-600 dark:text-gray-400", children: "Smart exercise substitutions based on available equipment, energy levels, and training goals. Never miss a workout." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "relative pl-16", children: [
              /* @__PURE__ */ jsxs("dt", { className: "text-base/7 font-semibold text-gray-900 dark:text-gray-100", children: [
                /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-violet-500", children: /* @__PURE__ */ jsx("svg", { className: "size-6 text-white", fill: "none", viewBox: "0 0 24 24", strokeWidth: "1.5", stroke: "currentColor", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" }) }) }),
                "Recovery Optimization"
              ] }),
              /* @__PURE__ */ jsx("dd", { className: "mt-2 text-base/7 text-gray-600 dark:text-gray-400", children: "Integrated recovery suggestions and mobility work based on your training session and targeted muscle groups." })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mx-auto mt-32 max-w-7xl sm:mt-56 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden bg-gray-900 px-6 py-20 shadow-xl sm:rounded-3xl sm:px-10 sm:py-24 md:px-12 lg:px-20", children: [
          /* @__PURE__ */ jsx("img", { className: "absolute inset-0 size-full object-cover brightness-150 saturate-0", src: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&fp-x=0.5&fp-y=0.6&fp-z=3&width=1440&height=1440&sat=-100", alt: "" }),
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gray-900/90 mix-blend-multiply" }),
          /* @__PURE__ */ jsx("div", { className: "absolute -top-56 -left-80 transform-gpu blur-3xl", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "aspect-[1097/845] w-[68.5625rem] bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-[0.45]", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) }),
          /* @__PURE__ */ jsx("div", { className: "hidden md:absolute md:bottom-16 md:left-[50rem] md:block md:transform-gpu md:blur-3xl", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "aspect-[1097/845] w-[68.5625rem] bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-25", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) }),
          /* @__PURE__ */ jsxs("div", { className: "relative mx-auto max-w-2xl lg:mx-0", children: [
            /* @__PURE__ */ jsx("img", { className: "h-12 w-auto", src: "/images/logo.png", alt: "AthletOS" }),
            /* @__PURE__ */ jsxs("figure", { children: [
              /* @__PURE__ */ jsx("blockquote", { className: "mt-6 text-lg font-semibold text-white sm:text-xl/8", children: /* @__PURE__ */ jsx("p", { children: '"As a developer and lifter passionate about data and self-improvement, I built AthletOS to meet my own needs. I wanted a platform that tells me exactly what to do, why, and when."' }) }),
              /* @__PURE__ */ jsxs("figcaption", { className: "mt-6 text-base text-white", children: [
                /* @__PURE__ */ jsx("div", { className: "font-semibold", children: "Founder & Developer" }),
                /* @__PURE__ */ jsx("div", { className: "mt-1", children: "AthletOS" })
              ] })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8", id: "training", children: /* @__PURE__ */ jsx("div", { className: "lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-2 lg:items-start lg:gap-24 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "relative mx-auto max-w-md px-6 sm:max-w-3xl lg:px-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "pt-12 sm:pt-16 lg:pt-20", children: [
            /* @__PURE__ */ jsx("h2", { className: "text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl", children: "Built for serious athletes" }),
            /* @__PURE__ */ jsxs("div", { className: "mt-6 space-y-6 text-gray-500 dark:text-gray-400", children: [
              /* @__PURE__ */ jsx("p", { className: "text-lg", children: "AthletOS is designed specifically for powerlifters and strength athletes who demand precision in their training. We understand that every rep, every set, and every session matters when you're pushing your limits." }),
              /* @__PURE__ */ jsx("p", { className: "text-base/7", children: "Our platform intelligently adapts your training plans based on your performance, recovery metrics, and personal preferences. Track your progress across multiple exercises, analyze your 1RMs, and get actionable insights to optimize your next session." }),
              /* @__PURE__ */ jsx("p", { className: "text-base/7", children: "From structured periodization to alternative exercise suggestions based on available equipment, AthletOS ensures your training stays consistent and effective whether you're at your home gym or traveling." })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-10", children: /* @__PURE__ */ jsx(Link, { href: "/about", className: "text-base font-medium bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent", children: "Learn more about our training methodology →" }) })
        ] }) }) }),
        /* @__PURE__ */ jsxs("div", { className: "relative -z-10 mt-32 px-6 lg:px-8", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 top-1/2 -z-10 flex -translate-y-1/2 transform-gpu justify-center overflow-hidden blur-3xl sm:top-auto sm:right-[calc(50%-6rem)] sm:bottom-0 sm:translate-y-0 sm:transform-gpu sm:justify-end", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-25", style: { clipPath: "polygon(73.6% 48.6%, 91.7% 88.5%, 100% 53.9%, 97.4% 18.1%, 92.5% 15.4%, 75.7% 36.3%, 55.3% 52.8%, 46.5% 50.9%, 45% 37.4%, 50.3% 13.1%, 21.3% 36.2%, 0.1% 0.1%, 5.4% 49.1%, 21.4% 36.4%, 58.9% 100%, 73.6% 48.6%)" } }) }),
          /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [
            /* @__PURE__ */ jsx("h2", { className: "text-4xl font-semibold tracking-tight text-balance text-gray-900 dark:text-gray-100 sm:text-5xl", children: "Ready to transform your training?" }),
            /* @__PURE__ */ jsx("p", { className: "mx-auto mt-6 max-w-xl text-lg/8 text-pretty text-gray-600 dark:text-gray-400", children: "Join our growing community of dedicated athletes using AthletOS to systematically track progress, optimize workouts, and achieve new personal records." }),
            /* @__PURE__ */ jsxs("div", { className: "mt-10 flex items-center justify-center gap-x-6", children: [
              /* @__PURE__ */ jsx(Link, { href: "/register", className: "rounded-md bg-gradient-to-r from-pink-500 to-violet-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-pink-600 hover:to-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500", children: "Start Training" }),
              /* @__PURE__ */ jsxs(Link, { href: "/about", className: "text-sm/6 font-semibold text-gray-900 dark:text-gray-100", children: [
                "Learn more ",
                /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "→" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "absolute top-full right-0 left-1/2 -z-10 hidden -translate-y-1/2 transform-gpu overflow-hidden blur-3xl sm:block", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("footer", { className: "relative mx-auto mt-32 max-w-7xl px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "border-t border-gray-900/10 dark:border-white/10 py-16 sm:py-24 lg:py-32", children: [
        /* @__PURE__ */ jsxs("div", { className: "xl:grid xl:grid-cols-3 xl:gap-8", children: [
          /* @__PURE__ */ jsx("img", { className: "h-9", src: "/images/logo.png", alt: "AthletOS" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "md:grid md:grid-cols-2 md:gap-8", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-sm/6 font-semibold text-gray-900 dark:text-gray-100", children: "Training" }),
                /* @__PURE__ */ jsxs("ul", { role: "list", className: "mt-6 space-y-4", children: [
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { href: "/about", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "Methodology" }) }),
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#features", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "Features" }) }),
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#training", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "Progress Tracking" }) }),
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { href: "/exercises", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "Exercise Library" }) })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "mt-10 md:mt-0", children: [
                /* @__PURE__ */ jsx("h3", { className: "text-sm/6 font-semibold text-gray-900 dark:text-gray-100", children: "Support" }),
                /* @__PURE__ */ jsxs("ul", { role: "list", className: "mt-6 space-y-4", children: [
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { href: "/help", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "Help Center" }) }),
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { href: "/guides", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "Training Guides" }) })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "md:grid md:grid-cols-2 md:gap-8", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-sm/6 font-semibold text-gray-900 dark:text-gray-100", children: "Platform" }),
                /* @__PURE__ */ jsxs("ul", { role: "list", className: "mt-6 space-y-4", children: [
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { href: "/about", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "About" }) }),
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { href: "/blog", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "Blog" }) }),
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { href: "/changelog", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "Changelog" }) })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "mt-10 md:mt-0", children: [
                /* @__PURE__ */ jsx("h3", { className: "text-sm/6 font-semibold text-gray-900 dark:text-gray-100", children: "Legal" }),
                /* @__PURE__ */ jsxs("ul", { role: "list", className: "mt-6 space-y-4", children: [
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { href: "/privacy", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "Privacy" }) }),
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { href: "/terms", className: "text-sm/6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100", children: "Terms" }) })
                ] })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-16 border-t border-gray-900/10 dark:border-white/10 pt-8 sm:mt-20 lg:mt-24", children: /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsx("p", { className: "text-sm/6 text-gray-600 dark:text-gray-400", children: "© 2025 AthletOS. Logically composed, strongly defined." }) }) })
      ] }) })
    ] })
  ] });
}
export {
  Welcome as default
};
