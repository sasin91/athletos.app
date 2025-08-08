import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useForm, Head, Link } from "@inertiajs/react";
import { CogIcon, ChevronLeftIcon, CheckIcon } from "@heroicons/react/24/outline";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { O as OnboardingLayout } from "./onboarding-layout-BrSXrppm.js";
import { q as queryParams } from "./index-ID1znBf5.js";
import { s as stats } from "./index-B8ZVjn6p.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "./dropdown-menu-BtKPamvc.js";
import "@radix-ui/react-dropdown-menu";
import "react";
import "lucide-react";
const store = (options) => ({
  url: store.url(options),
  method: "post"
});
store.definition = {
  methods: ["post"],
  url: "/onboarding/preferences"
};
store.url = (options) => {
  return store.definition.url + queryParams(options);
};
store.post = (options) => ({
  url: store.url(options),
  method: "post"
});
function Preferences({ athlete, difficulties }) {
  const { data, setData, post, processing, errors } = useForm({
    difficulty_preference: (athlete == null ? void 0 : athlete.difficulty_preference) || "",
    notifications: (athlete == null ? void 0 : athlete.notification_preferences) || []
  });
  const handleNotificationChange = (notification, checked) => {
    if (checked) {
      setData("notifications", [...data.notifications, notification]);
    } else {
      setData("notifications", data.notifications.filter((n) => n !== notification));
    }
  };
  const submit = (e) => {
    e.preventDefault();
    post(store.url());
  };
  const notificationOptions = [
    { value: "workout_reminders", label: "Workout Reminders" },
    { value: "progress_updates", label: "Progress Updates" },
    { value: "recovery_tips", label: "Recovery Tips" },
    { value: "motivational_messages", label: "Motivational Messages" }
  ];
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Preferences - Athletos" }),
    /* @__PURE__ */ jsx(OnboardingLayout, { title: "Training Preferences", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl rounded-lg p-8 border border-gray-200/20 dark:border-gray-700/20", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto h-16 w-16 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded-full flex items-center justify-center mb-4", children: /* @__PURE__ */ jsx(CogIcon, { className: "h-8 w-8 text-pink-500" }) }),
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100", children: "Set Your Preferences" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-lg text-gray-600 dark:text-gray-400", children: "Customize your training experience" })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4", children: "Training Difficulty" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-4", children: "How challenging do you want your workouts to be?" }),
            /* @__PURE__ */ jsx("div", { className: "space-y-3", children: difficulties.map((difficulty) => /* @__PURE__ */ jsxs(
              "label",
              {
                className: `relative flex items-center p-4 rounded-lg border-2 hover:border-pink-300 dark:hover:border-pink-600 cursor-pointer transition-colors ${data.difficulty_preference === difficulty.value ? "border-pink-600 bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-900/20 dark:to-violet-900/20" : "border-gray-300 dark:border-gray-600"}`,
                children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "radio",
                      name: "difficulty_preference",
                      value: difficulty.value,
                      checked: data.difficulty_preference === difficulty.value,
                      onChange: (e) => setData("difficulty_preference", e.target.value),
                      className: "h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 dark:border-gray-600"
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: "ml-4", children: [
                    /* @__PURE__ */ jsx("div", { className: "text-base font-medium text-gray-900 dark:text-gray-100", children: difficulty.label }),
                    /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: difficulty.description })
                  ] })
                ]
              },
              difficulty.value
            )) }),
            errors.difficulty_preference && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: errors.difficulty_preference })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4", children: "Notifications" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-4", children: "Choose what notifications you'd like to receive" }),
            /* @__PURE__ */ jsx("div", { className: "space-y-3", children: notificationOptions.map((option) => /* @__PURE__ */ jsxs(
              "label",
              {
                className: `relative flex items-center p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${data.notifications.includes(option.value) ? "bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-900/20 dark:to-violet-900/20 border-pink-300 dark:border-pink-600" : "border-gray-300 dark:border-gray-600"}`,
                children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "checkbox",
                      value: option.value,
                      checked: data.notifications.includes(option.value),
                      onChange: (e) => handleNotificationChange(option.value, e.target.checked),
                      className: "h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 dark:border-gray-600 rounded"
                    }
                  ),
                  /* @__PURE__ */ jsx("div", { className: "ml-3", children: /* @__PURE__ */ jsx("div", { className: "text-base font-medium text-gray-900 dark:text-gray-100", children: option.label }) })
                ]
              },
              option.value
            )) }),
            errors.notifications && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: errors.notifications })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700", children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", asChild: true, children: /* @__PURE__ */ jsxs(Link, { href: stats.url(), prefetch: true, children: [
            /* @__PURE__ */ jsx(ChevronLeftIcon, { className: "mr-2 h-4 w-4" }),
            "Back"
          ] }) }),
          /* @__PURE__ */ jsxs(
            Button,
            {
              type: "submit",
              disabled: processing,
              className: "px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600",
              children: [
                processing ? "Completing..." : "Complete Setup",
                /* @__PURE__ */ jsx(CheckIcon, { className: "ml-2 h-4 w-4" })
              ]
            }
          )
        ] })
      ] })
    ] }) }) })
  ] });
}
export {
  Preferences as default
};
