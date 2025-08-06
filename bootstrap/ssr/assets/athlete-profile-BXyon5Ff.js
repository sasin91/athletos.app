import { jsxs, jsx } from "react/jsx-runtime";
import { useForm, Head } from "@inertiajs/react";
import { S as SettingsLayout } from "./settings-layout-DvcHR2Gt.js";
import { s as settings } from "./index-BAFHCEvX.js";
import "./button-hAi0Fg-Q.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-separator";
import "./index-ID1znBf5.js";
function AthleteProfile({
  athlete,
  experienceLevels,
  trainingGoals,
  muscleGroups,
  trainingTimes,
  difficulties
}) {
  const { data, setData, put, processing, errors } = useForm({
    experience_level: (athlete == null ? void 0 : athlete.experience_level) || "",
    primary_goal: (athlete == null ? void 0 : athlete.primary_goal) || "",
    bio: (athlete == null ? void 0 : athlete.bio) || "",
    muscle_groups: (athlete == null ? void 0 : athlete.muscle_groups) || [],
    training_days: (athlete == null ? void 0 : athlete.training_days) || [],
    training_frequency: (athlete == null ? void 0 : athlete.training_frequency) || "",
    preferred_time: (athlete == null ? void 0 : athlete.preferred_time) || "",
    session_duration: (athlete == null ? void 0 : athlete.session_duration) ? athlete.session_duration.toString() : "",
    difficulty_preference: (athlete == null ? void 0 : athlete.difficulty_preference) || "",
    top_squat: (athlete == null ? void 0 : athlete.top_squat) || "",
    top_bench: (athlete == null ? void 0 : athlete.top_bench) || "",
    top_deadlift: (athlete == null ? void 0 : athlete.top_deadlift) || ""
  });
  const handleMuscleGroupChange = (muscleGroupValue, checked) => {
    if (checked) {
      setData("muscle_groups", [...data.muscle_groups, muscleGroupValue]);
    } else {
      setData("muscle_groups", data.muscle_groups.filter((mg) => mg !== muscleGroupValue));
    }
  };
  const handleTrainingDayChange = (day, checked) => {
    if (checked) {
      setData("training_days", [...data.training_days, day]);
    } else {
      setData("training_days", data.training_days.filter((d) => d !== day));
    }
  };
  const submit = (e) => {
    e.preventDefault();
    put(settings.athleteProfile.update.url());
  };
  const weekdays = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" }
  ];
  const sessionDurations = [
    { value: 45, label: "45 minutes" },
    { value: 60, label: "60 minutes" },
    { value: 75, label: "75 minutes" },
    { value: 90, label: "90 minutes" },
    { value: 120, label: "120 minutes" }
  ];
  const trainingFrequencyOptions = [
    { value: "", label: "Every week (standard)" },
    { value: "2w", label: "Every other week (1 week on, 1 week off)" },
    { value: "3w", label: "Every 3 weeks (1 week on, 2 weeks off)" },
    { value: "4w", label: "Every 4 weeks (1 week on, 3 weeks off)" }
  ];
  return /* @__PURE__ */ jsxs(SettingsLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Athlete Profile Settings - Athletos" }),
    /* @__PURE__ */ jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6", children: /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: "Athlete Profile" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: "Update your athlete profile and training preferences" })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "experience_level", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Experience Level" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                id: "experience_level",
                name: "experience_level",
                value: data.experience_level,
                onChange: (e) => setData("experience_level", e.target.value),
                className: "w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Select experience level" }),
                  experienceLevels.map((level) => /* @__PURE__ */ jsxs("option", { value: level.value, children: [
                    level.label,
                    " - ",
                    level.description
                  ] }, level.value))
                ]
              }
            ),
            errors.experience_level && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.experience_level })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "primary_goal", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Primary Training Goal" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                id: "primary_goal",
                name: "primary_goal",
                value: data.primary_goal,
                onChange: (e) => setData("primary_goal", e.target.value),
                className: "w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Select primary goal" }),
                  trainingGoals.map((goal) => /* @__PURE__ */ jsx("option", { value: goal.value, children: goal.label }, goal.value))
                ]
              }
            ),
            errors.primary_goal && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.primary_goal })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "bio", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "About Your Training" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                id: "bio",
                name: "bio",
                rows: 4,
                value: data.bio,
                onChange: (e) => setData("bio", e.target.value),
                className: "w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500",
                placeholder: "Tell us about your training background, any injuries, or specific goals..."
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "This helps us customize your training plan and exercise suggestions." }),
            errors.bio && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.bio })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Muscle Groups to Focus On" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-3", children: "Select the muscle groups you'd like to prioritize in your training (optional)" }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", children: muscleGroups.map((muscleGroup) => /* @__PURE__ */ jsxs("label", { className: "relative flex items-start", children: [
              /* @__PURE__ */ jsx("div", { className: "flex h-5 items-center", children: /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  value: muscleGroup.value,
                  checked: data.muscle_groups.includes(muscleGroup.value),
                  onChange: (e) => handleMuscleGroupChange(muscleGroup.value, e.target.checked),
                  className: "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                }
              ) }),
              /* @__PURE__ */ jsx("div", { className: "ml-3 text-sm", children: /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-900 dark:text-gray-100", children: muscleGroup.label }) })
            ] }, muscleGroup.value)) }),
            errors.muscle_groups && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.muscle_groups })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Training Days" }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: weekdays.map((day) => /* @__PURE__ */ jsxs("label", { className: "flex items-center", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  value: day.value,
                  checked: data.training_days.includes(day.value),
                  onChange: (e) => handleTrainingDayChange(day.value, e.target.checked),
                  className: "rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-600 focus:ring-blue-500"
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "ml-2 text-sm text-gray-700 dark:text-gray-300", children: day.label })
            ] }, day.value)) }),
            errors.training_days && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.training_days })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "training_frequency", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Training Frequency" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                id: "training_frequency",
                name: "training_frequency",
                value: data.training_frequency,
                onChange: (e) => setData("training_frequency", e.target.value),
                className: "w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500",
                children: trainingFrequencyOptions.map((option) => /* @__PURE__ */ jsx("option", { value: option.value, children: option.label }, option.value))
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Choose a pattern that fits your recovery needs and schedule" }),
            errors.training_frequency && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.training_frequency })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "preferred_time", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Preferred Training Time" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                id: "preferred_time",
                name: "preferred_time",
                value: data.preferred_time,
                onChange: (e) => setData("preferred_time", e.target.value),
                className: "w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Select preferred time" }),
                  trainingTimes.map((time) => /* @__PURE__ */ jsx("option", { value: time.value, children: time.label }, time.value))
                ]
              }
            ),
            errors.preferred_time && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.preferred_time })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "session_duration", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Session Duration (minutes)" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                id: "session_duration",
                name: "session_duration",
                value: data.session_duration,
                onChange: (e) => setData("session_duration", e.target.value),
                className: "w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Select duration" }),
                  sessionDurations.map((duration) => /* @__PURE__ */ jsx("option", { value: duration.value.toString(), children: duration.label }, duration.value))
                ]
              }
            ),
            errors.session_duration && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.session_duration })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "difficulty_preference", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Difficulty Preference" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                id: "difficulty_preference",
                name: "difficulty_preference",
                value: data.difficulty_preference,
                onChange: (e) => setData("difficulty_preference", e.target.value),
                className: "w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Select difficulty" }),
                  difficulties.map((difficulty) => /* @__PURE__ */ jsx("option", { value: difficulty.value, children: difficulty.label }, difficulty.value))
                ]
              }
            ),
            errors.difficulty_preference && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.difficulty_preference })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3", children: "Past Top Lifts" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-4", children: "Share your best lifts to help us track your progress and set appropriate starting weights." }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { htmlFor: "top_squat", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Squat (lbs)" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "number",
                    id: "top_squat",
                    name: "top_squat",
                    min: "0",
                    max: "2000",
                    value: data.top_squat,
                    onChange: (e) => setData("top_squat", e.target.value),
                    className: "w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500",
                    placeholder: "e.g., 315"
                  }
                ),
                errors.top_squat && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.top_squat })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { htmlFor: "top_bench", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Bench Press (lbs)" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "number",
                    id: "top_bench",
                    name: "top_bench",
                    min: "0",
                    max: "2000",
                    value: data.top_bench,
                    onChange: (e) => setData("top_bench", e.target.value),
                    className: "w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500",
                    placeholder: "e.g., 225"
                  }
                ),
                errors.top_bench && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.top_bench })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { htmlFor: "top_deadlift", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Deadlift (lbs)" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "number",
                    id: "top_deadlift",
                    name: "top_deadlift",
                    min: "0",
                    max: "2000",
                    value: data.top_deadlift,
                    onChange: (e) => setData("top_deadlift", e.target.value),
                    className: "w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500",
                    placeholder: "e.g., 405"
                  }
                ),
                errors.top_deadlift && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.top_deadlift })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-8 flex justify-end", children: /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: processing,
            className: "inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50",
            children: processing ? "Updating..." : "Update Profile"
          }
        ) })
      ] })
    ] }) })
  ] });
}
export {
  AthleteProfile as default
};
