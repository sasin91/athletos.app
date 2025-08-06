import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useForm, Head, Link } from "@inertiajs/react";
import { ChartBarIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { L as Label, I as Input } from "./label-qls5No9M.js";
import { O as OnboardingLayout } from "./onboarding-layout-BrSXrppm.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
import "./dropdown-menu-BtKPamvc.js";
import "@radix-ui/react-dropdown-menu";
import "react";
import "lucide-react";
function Stats({ user, athlete, onboarding: onboarding2 }) {
  const { data, setData, post, processing, errors } = useForm({
    current_bench: "",
    current_squat: "",
    current_deadlift: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(onboarding2.stats.store.url());
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Current Stats - Athletos" }),
    /* @__PURE__ */ jsx(OnboardingLayout, { title: "Current Stats", children: /* @__PURE__ */ jsx("div", { className: "relative mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl rounded-lg p-8 border border-gray-200/20 dark:border-gray-700/20", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto h-16 w-16 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded-full flex items-center justify-center mb-4", children: /* @__PURE__ */ jsx(ChartBarIcon, { className: "h-8 w-8 text-pink-500" }) }),
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100", children: "Current Stats" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-lg text-gray-600 dark:text-gray-400", children: "Help us track your progress by entering your current lifting stats (optional)" })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4", children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Optional:" }),
            " These stats help us customize your starting weights and track your progress. You can always add or update them later."
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-6 sm:grid-cols-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "current_bench", className: "mb-2", children: "Bench Press (lbs)" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  type: "number",
                  name: "current_bench",
                  id: "current_bench",
                  min: "0",
                  max: "1000",
                  step: "5",
                  value: data.current_bench,
                  onChange: (e) => setData("current_bench", e.target.value),
                  placeholder: "e.g. 135"
                }
              ),
              errors.current_bench && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: errors.current_bench })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "current_squat", className: "mb-2", children: "Squat (lbs)" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  type: "number",
                  name: "current_squat",
                  id: "current_squat",
                  min: "0",
                  max: "1000",
                  step: "5",
                  value: data.current_squat,
                  onChange: (e) => setData("current_squat", e.target.value),
                  placeholder: "e.g. 185"
                }
              ),
              errors.current_squat && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: errors.current_squat })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "current_deadlift", className: "mb-2", children: "Deadlift (lbs)" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  type: "number",
                  name: "current_deadlift",
                  id: "current_deadlift",
                  min: "0",
                  max: "1000",
                  step: "5",
                  value: data.current_deadlift,
                  onChange: (e) => setData("current_deadlift", e.target.value),
                  placeholder: "e.g. 225"
                }
              ),
              errors.current_deadlift && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: errors.current_deadlift })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4", children: [
            /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-900 dark:text-gray-100 mb-2", children: "Don't know your max?" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "No problem! You can leave these empty and we'll help you find your starting weights during your first few workouts. We'll track your progress from there." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700", children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", asChild: true, children: /* @__PURE__ */ jsxs(Link, { href: onboarding2.schedule.url(), children: [
            /* @__PURE__ */ jsx(ChevronLeftIcon, { className: "mr-2 h-4 w-4" }),
            "Back"
          ] }) }),
          /* @__PURE__ */ jsxs(
            Button,
            {
              type: "submit",
              disabled: processing,
              className: "px-6 py-3",
              children: [
                processing ? "Saving..." : "Continue",
                /* @__PURE__ */ jsx(ChevronRightIcon, { className: "ml-2 h-4 w-4" })
              ]
            }
          )
        ] })
      ] })
    ] }) }) })
  ] });
}
export {
  Stats as default
};
