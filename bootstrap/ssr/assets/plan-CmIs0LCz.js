import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useForm, Head, Link } from "@inertiajs/react";
import { useState } from "react";
import { ClipboardDocumentListIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { p as profile } from "./index-B8ZVjn6p.js";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { O as OnboardingLayout } from "./onboarding-layout-BrSXrppm.js";
import { q as queryParams } from "./index-ID1znBf5.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "./dropdown-menu-BtKPamvc.js";
import "@radix-ui/react-dropdown-menu";
import "lucide-react";
const store = (options) => ({
  url: store.url(options),
  method: "post"
});
store.definition = {
  methods: ["post"],
  url: "/onboarding/plan"
};
store.url = (options) => {
  return store.definition.url + queryParams(options);
};
store.post = (options) => ({
  url: store.url(options),
  method: "post"
});
function Plan({ trainingPlans }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { data, setData, post, processing, errors } = useForm({
    selected_plan_id: ""
  });
  const handlePlanSelection = (plan) => {
    setSelectedPlan(plan);
    setData("selected_plan_id", plan.id.toString());
  };
  const submit = (e) => {
    e.preventDefault();
    if (!data.selected_plan_id) {
      return;
    }
    post(store.url());
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Choose Training Plan - Athletos" }),
    /* @__PURE__ */ jsx(OnboardingLayout, { title: "Choose Your Training Plan", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl rounded-lg p-8 border border-gray-200/20 dark:border-gray-700/20", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto h-16 w-16 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded-full flex items-center justify-center mb-4", children: /* @__PURE__ */ jsx(ClipboardDocumentListIcon, { className: "h-8 w-8 text-pink-500" }) }),
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100", children: "Choose Your Training Plan" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-lg text-gray-600 dark:text-gray-400", children: "Select a training program that matches your goals and experience level" })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, children: [
        /* @__PURE__ */ jsx("div", { className: "space-y-4 mb-8", children: trainingPlans.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-center py-8", children: /* @__PURE__ */ jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "No suitable training plans found for your profile. Please contact support." }) }) : trainingPlans.map((plan) => /* @__PURE__ */ jsx(
          "div",
          {
            className: `relative rounded-lg border-2 p-6 cursor-pointer transition-all ${(selectedPlan == null ? void 0 : selectedPlan.id) === plan.id ? "border-pink-500 bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-900/20 dark:to-violet-900/20 shadow-md" : "border-gray-200 dark:border-gray-600 hover:border-pink-300 dark:hover:border-pink-500 hover:shadow-md"}`,
            onClick: () => handlePlanSelection(plan),
            children: /* @__PURE__ */ jsxs("div", { className: "flex items-start", children: [
              /* @__PURE__ */ jsx("div", { className: "flex h-5 items-center", children: /* @__PURE__ */ jsx(
                "input",
                {
                  type: "radio",
                  name: "selected_plan_id",
                  value: plan.id,
                  checked: (selectedPlan == null ? void 0 : selectedPlan.id) === plan.id,
                  onChange: () => handlePlanSelection(plan),
                  className: "h-4 w-4 border-gray-300 text-pink-600 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700"
                }
              ) }),
              /* @__PURE__ */ jsxs("div", { className: "ml-3 flex-1", children: [
                /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: plan.name }) }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-gray-600 dark:text-gray-400", children: plan.description }),
                plan.phases && plan.phases.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-gray-700 dark:text-gray-300", children: [
                  "Phases: ",
                  plan.phases.length
                ] }) })
              ] })
            ] })
          },
          plan.id
        )) }),
        errors.selected_plan_id && /* @__PURE__ */ jsx("p", { className: "mb-4 text-sm text-red-600 dark:text-red-400", children: errors.selected_plan_id }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700", children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "outline",
              asChild: true,
              children: /* @__PURE__ */ jsx(Link, { href: profile.url(), children: "Back" })
            }
          ),
          /* @__PURE__ */ jsxs(
            Button,
            {
              type: "submit",
              disabled: processing || !selectedPlan,
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
  Plan as default
};
