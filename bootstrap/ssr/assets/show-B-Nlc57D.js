import { jsxs, jsx } from "react/jsx-runtime";
import { useForm, Head, Link } from "@inertiajs/react";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { A as AppLayout } from "./app-layout-CUuxNbvK.js";
import { t as trainingPlans } from "./index-VEfDRYSW.js";
import "react";
import "class-variance-authority";
import "./button-hAi0Fg-Q.js";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-tooltip";
import "lucide-react";
import "@radix-ui/react-avatar";
import "./dropdown-menu-BtKPamvc.js";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-navigation-menu";
import "@radix-ui/react-dialog";
import "./index-BAFHCEvX.js";
import "./index-ID1znBf5.js";
import "./index-CrXrSpq1.js";
import "./app-logo-icon-wMAVxvx3.js";
import "sonner";
function Show({ trainingPlan, auth }) {
  var _a, _b;
  const { post, processing } = useForm();
  const isCurrentPlan = ((_a = auth.user.athlete) == null ? void 0 : _a.current_plan_id) === trainingPlan.id;
  const assignPlan = () => {
    post(trainingPlans.assign.url({ trainingPlan: trainingPlan.id }));
  };
  const getExerciseDisplayName = (exerciseValue) => {
    const exerciseNames = {
      "barbell_back_squat": "Barbell Back Squat",
      "bench_press": "Bench Press",
      "deadlift": "Deadlift",
      "overhead_press": "Overhead Press",
      "barbell_row": "Barbell Row"
      // Add more mappings as needed
    };
    return exerciseNames[exerciseValue] || exerciseValue.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };
  return /* @__PURE__ */ jsxs(AppLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: `${trainingPlan.name} - Training Plan` }),
    /* @__PURE__ */ jsx("div", { className: "py-12", children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto sm:px-6 lg:px-8", children: /* @__PURE__ */ jsx("div", { className: "bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg", children: /* @__PURE__ */ jsxs("div", { className: "p-6 text-gray-900 dark:text-gray-100", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-8", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-gray-100", children: trainingPlan.name }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-2", children: trainingPlan.description })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center space-x-3", children: auth.user.athlete && !isCurrentPlan ? /* @__PURE__ */ jsx(
          "button",
          {
            onClick: assignPlan,
            disabled: processing,
            className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50",
            children: processing ? "Assigning..." : "Assign This Plan"
          }
        ) : /* @__PURE__ */ jsx("span", { className: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium", children: "Current Plan" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6 mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400", children: "Goal" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize", children: trainingPlan.goal.value })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400", children: "Experience Level" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize", children: ((_b = trainingPlan.experience_level) == null ? void 0 : _b.value) || "Any" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400", children: "Progression Type" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize", children: trainingPlan.default_progression_type.value })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400", children: "Total Phases" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100", children: trainingPlan.phases.length })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100", children: "Training Phases" }),
        trainingPlan.phases.map((phase) => {
          var _a2;
          const exercisesByDay = ((_a2 = phase.settings) == null ? void 0 : _a2.exercises) ? phase.settings.exercises.reduce((acc, exercise) => {
            if (!acc[exercise.day]) {
              acc[exercise.day] = [];
            }
            acc[exercise.day].push(exercise);
            return acc;
          }, {}) : {};
          return /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-xl font-semibold text-gray-900 dark:text-gray-100", children: phase.name }),
                phase.description && /* @__PURE__ */ jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-1", children: phase.description })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "text-right", children: /* @__PURE__ */ jsxs("span", { className: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium", children: [
                phase.duration_weeks,
                " ",
                phase.duration_weeks === 1 ? "week" : "weeks"
              ] }) })
            ] }),
            Object.keys(exercisesByDay).length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsx("h4", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: "Exercises" }),
              Object.entries(exercisesByDay).map(([day, exercises]) => /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
                /* @__PURE__ */ jsxs("h5", { className: "text-md font-medium text-gray-800 dark:text-gray-200 mb-3", children: [
                  "Day ",
                  day
                ] }),
                /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: exercises.map((exercise, index) => /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-4", children: [
                  /* @__PURE__ */ jsx("h6", { className: "font-semibold text-gray-900 dark:text-gray-100 mb-2", children: getExerciseDisplayName(exercise.exercise) }),
                  /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-sm text-gray-600 dark:text-gray-400", children: [
                    /* @__PURE__ */ jsxs("p", { children: [
                      /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Sets:" }),
                      " ",
                      exercise.sets
                    ] }),
                    /* @__PURE__ */ jsxs("p", { children: [
                      /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Reps:" }),
                      " ",
                      exercise.reps
                    ] }),
                    /* @__PURE__ */ jsxs("p", { children: [
                      /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Weight:" }),
                      " ",
                      exercise.weight
                    ] }),
                    /* @__PURE__ */ jsxs("p", { children: [
                      /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Rest:" }),
                      " ",
                      exercise.rest_seconds,
                      "s"
                    ] }),
                    exercise.notes && /* @__PURE__ */ jsxs("p", { children: [
                      /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Notes:" }),
                      " ",
                      exercise.notes
                    ] })
                  ] })
                ] }, index)) })
              ] }, day))
            ] })
          ] }, phase.id);
        })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-8", children: /* @__PURE__ */ jsxs(
        Link,
        {
          href: dashboard.url(),
          className: "inline-flex items-center px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-medium rounded-lg transition-colors",
          children: [
            /* @__PURE__ */ jsx(ChevronLeftIcon, { className: "w-4 h-4 mr-2" }),
            "Back to Dashboard"
          ]
        }
      ) })
    ] }) }) }) })
  ] });
}
export {
  Show as default
};
