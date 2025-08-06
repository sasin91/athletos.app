import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useForm, Head } from "@inertiajs/react";
import { UserIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { d as dashboard } from "./index-CrXrSpq1.js";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { L as Label, I as Input } from "./label-qls5No9M.js";
import { C as Checkbox } from "./checkbox-D07xazED.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-D4PbFH-j.js";
import { T as Textarea } from "./textarea-CMuAavpa.js";
import { O as OnboardingLayout } from "./onboarding-layout-BrSXrppm.js";
import "./index-ID1znBf5.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
import "@radix-ui/react-checkbox";
import "lucide-react";
import "@radix-ui/react-select";
import "./dropdown-menu-BtKPamvc.js";
import "@radix-ui/react-dropdown-menu";
import "react";
function Profile({ user, athlete, onboarding: onboarding2, experienceLevels, trainingGoals, muscleGroups }) {
  const { data, setData, post, processing, errors } = useForm({
    experience_level: (athlete == null ? void 0 : athlete.experience_level) || "",
    primary_goal: (athlete == null ? void 0 : athlete.primary_goal) || "",
    muscle_groups: (athlete == null ? void 0 : athlete.muscle_groups) || [],
    bio: (athlete == null ? void 0 : athlete.bio) || "",
    top_squat: "",
    top_bench: "",
    top_deadlift: ""
  });
  const handleMuscleGroupChange = (muscleGroupValue, checked) => {
    if (checked) {
      setData("muscle_groups", [...data.muscle_groups, muscleGroupValue]);
    } else {
      setData("muscle_groups", data.muscle_groups.filter((mg) => mg !== muscleGroupValue));
    }
  };
  const submit = (e) => {
    e.preventDefault();
    post(onboarding2.profile.store.url());
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Profile Setup - Athletos" }),
    /* @__PURE__ */ jsx(OnboardingLayout, { title: "Profile Setup", children: /* @__PURE__ */ jsx("div", { className: "relative mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl rounded-lg p-8 border border-gray-200/20 dark:border-gray-700/20", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto h-16 w-16 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded-full flex items-center justify-center mb-4", children: /* @__PURE__ */ jsx(UserIcon, { className: "h-8 w-8 text-pink-500" }) }),
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100", children: "Tell Us About Yourself" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-lg text-gray-600 dark:text-gray-400", children: "Help us understand your training background and goals" })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-6 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "experience_level", className: "block mb-2", children: "Experience Level" }),
              /* @__PURE__ */ jsxs(Select, { value: data.experience_level, onValueChange: (value) => setData("experience_level", value), children: [
                /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select your experience level" }) }),
                /* @__PURE__ */ jsx(SelectContent, { children: experienceLevels.map((level) => /* @__PURE__ */ jsxs(SelectItem, { value: level.value, children: [
                  level.label,
                  " - ",
                  level.description
                ] }, level.value)) })
              ] }),
              errors.experience_level && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: errors.experience_level })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "primary_goal", className: "block mb-2", children: "Primary Goal" }),
              /* @__PURE__ */ jsxs(Select, { value: data.primary_goal, onValueChange: (value) => setData("primary_goal", value), children: [
                /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select your primary goal" }) }),
                /* @__PURE__ */ jsx(SelectContent, { children: trainingGoals.map((goal) => /* @__PURE__ */ jsxs(SelectItem, { value: goal.value, children: [
                  goal.label,
                  " - ",
                  goal.description
                ] }, goal.value)) })
              ] }),
              errors.primary_goal && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: errors.primary_goal })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { className: "block mb-2", children: "Muscle Groups to Focus On" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-600 dark:text-gray-400 mb-3", children: "Select the muscle groups you'd like to prioritize in your training (optional)" }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", children: muscleGroups.map((muscleGroup) => /* @__PURE__ */ jsxs(Label, { className: "flex items-center space-x-2", children: [
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  name: "muscle_groups[]",
                  value: muscleGroup.value,
                  checked: data.muscle_groups.includes(muscleGroup.value),
                  onCheckedChange: (checked) => handleMuscleGroupChange(muscleGroup.value, checked)
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: muscleGroup.label })
            ] }, muscleGroup.value)) }),
            errors.muscle_groups && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: errors.muscle_groups })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm/6 font-medium text-gray-900 dark:text-gray-100 mb-3", children: "Past Top Lifts (Optional)" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-4", children: "Share your best lifts to help us track your progress and set appropriate starting weights." }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "top_squat", className: "mb-2", children: "Squat (kg)" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    type: "number",
                    id: "top_squat",
                    name: "top_squat",
                    min: "0",
                    max: "1000",
                    value: data.top_squat,
                    onChange: (e) => setData("top_squat", e.target.value),
                    placeholder: "e.g., 143"
                  }
                ),
                errors.top_squat && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.top_squat })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "top_bench", className: "mb-2", children: "Bench Press (kg)" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    type: "number",
                    id: "top_bench",
                    name: "top_bench",
                    min: "0",
                    max: "1000",
                    value: data.top_bench,
                    onChange: (e) => setData("top_bench", e.target.value),
                    placeholder: "e.g., 102"
                  }
                ),
                errors.top_bench && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.top_bench })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "top_deadlift", className: "mb-2", children: "Deadlift (kg)" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    type: "number",
                    id: "top_deadlift",
                    name: "top_deadlift",
                    min: "0",
                    max: "1000",
                    value: data.top_deadlift,
                    onChange: (e) => setData("top_deadlift", e.target.value),
                    placeholder: "e.g., 184"
                  }
                ),
                errors.top_deadlift && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.top_deadlift })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "bio", className: "mb-2", children: "About Your Training" }),
            /* @__PURE__ */ jsx(
              Textarea,
              {
                name: "bio",
                id: "bio",
                rows: 4,
                value: data.bio,
                onChange: (e) => setData("bio", e.target.value),
                placeholder: "Tell us about your training background, any injuries, or specific goals..."
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-gray-600 dark:text-gray-400", children: "This helps us customize your training plan and exercise suggestions." }),
            errors.bio && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: errors.bio })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700", children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "outline",
              asChild: true,
              children: /* @__PURE__ */ jsx("a", { href: dashboard.url(), children: "Skip Setup" })
            }
          ),
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
  Profile as default
};
