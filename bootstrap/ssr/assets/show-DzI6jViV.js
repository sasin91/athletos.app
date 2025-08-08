import { jsxs, jsx } from "react/jsx-runtime";
import { Head, Link } from "@inertiajs/react";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { A as AppLayout } from "./app-layout-J2OJ2uom.js";
import { d as dashboard } from "./index-CrXrSpq1.js";
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
import "./app-logo-icon-wMAVxvx3.js";
import "sonner";
function Show({ exercise, exerciseData }) {
  return /* @__PURE__ */ jsxs(AppLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: `${exerciseData.name} - Exercise` }),
    /* @__PURE__ */ jsx("div", { className: "container mx-auto px-4 py-8", children: /* @__PURE__ */ jsx("div", { className: "max-w-3xl mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8", children: [
      /* @__PURE__ */ jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsxs(
        Link,
        {
          href: dashboard.url(),
          className: "inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline",
          children: [
            /* @__PURE__ */ jsx(ChevronLeftIcon, { className: "w-4 h-4 mr-1" }),
            "Back to Dashboard"
          ]
        }
      ) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-gray-100", children: exercise.displayName }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-4 mt-2", children: [
            /* @__PURE__ */ jsx("span", { className: "px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-md capitalize", children: exercise.category }),
            /* @__PURE__ */ jsx("span", { className: "px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm rounded-md capitalize", children: exercise.difficulty })
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-lg text-gray-600 dark:text-gray-400 leading-relaxed", children: exercise.description }),
        exercise.tags.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2", children: "Targeted Areas" }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: exercise.tags.map((tag) => /* @__PURE__ */ jsx(
            "span",
            {
              className: "px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md capitalize",
              children: tag.replace("-", " ")
            },
            tag
          )) })
        ] }),
        exercise.cues.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3", children: "Form & Technique Tips" }),
          /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: exercise.cues.map((cue, index) => /* @__PURE__ */ jsxs("li", { className: "flex items-start", children: [
            /* @__PURE__ */ jsx("span", { className: "flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3" }),
            /* @__PURE__ */ jsx("span", { className: "text-gray-600 dark:text-gray-400", children: cue })
          ] }, index)) })
        ] }),
        exerciseData.description && exerciseData.description !== exercise.description && /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2", children: "Additional Notes" }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-600 dark:text-gray-400", children: exerciseData.description })
        ] })
      ] })
    ] }) }) })
  ] });
}
export {
  Show as default
};
