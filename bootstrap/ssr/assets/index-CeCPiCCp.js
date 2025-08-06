import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { Head, Link } from "@inertiajs/react";
import { A as AppLayout } from "./app-layout-CUuxNbvK.js";
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
function TrainingsIndex({ trainings }) {
  const getStatusBadge = (training) => {
    const scheduledAt = new Date(training.scheduled_at);
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const scheduledDay = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate());
    if (training.completed_at) {
      return /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400", children: [
        /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 mr-1", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }),
        "Completed"
      ] });
    } else if (scheduledDay < today) {
      return /* @__PURE__ */ jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400", children: "Missed" });
    } else if (scheduledDay.getTime() === today.getTime()) {
      return /* @__PURE__ */ jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400", children: "Today" });
    } else {
      return /* @__PURE__ */ jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300", children: "Scheduled" });
    }
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    };
  };
  return /* @__PURE__ */ jsxs(AppLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Training History" }),
    /* @__PURE__ */ jsx("div", { className: "bg-slate-50 dark:bg-gray-900 min-h-screen", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-6 lg:px-8 py-8", children: [
      /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: "Training History" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-gray-600 dark:text-gray-400", children: "View all your training sessions" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center space-x-3", children: /* @__PURE__ */ jsxs(
          Link,
          {
            href: "/training-plans/create",
            className: "inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors",
            children: [
              /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M12 6v6m0 0v6m0-6h6m-6 0H6" }) }),
              "Create Custom Plan"
            ]
          }
        ) })
      ] }) }),
      trainings.data.length > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: "bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full divide-y divide-gray-200 dark:divide-gray-700", children: [
          /* @__PURE__ */ jsx("thead", { className: "bg-gray-50 dark:bg-gray-700", children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: "Date" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: "Training Plan" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: "Status" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: "Progress" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: "Actions" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700", children: trainings.data.map((training) => {
            var _a, _b;
            const { date, time } = formatDate(training.scheduled_at);
            const progress = training.progress || 0;
            return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-gray-50 dark:hover:bg-gray-700", children: [
              /* @__PURE__ */ jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100", children: [
                date,
                /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-500 dark:text-gray-400", children: time })
              ] }),
              /* @__PURE__ */ jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [
                /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-900 dark:text-gray-100", children: ((_a = training.trainingPlan) == null ? void 0 : _a.name) || "Training Session" }),
                ((_b = training.trainingPlan) == null ? void 0 : _b.synonym) && /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-500 dark:text-gray-400", children: training.trainingPlan.synonym })
              ] }),
              /* @__PURE__ */ jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: getStatusBadge(training) }),
              /* @__PURE__ */ jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [
                /* @__PURE__ */ jsx("div", { className: "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2", children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "bg-blue-600 h-2 rounded-full transition-all duration-300",
                    style: { width: `${progress}%` }
                  }
                ) }),
                /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1", children: [
                  Math.round(progress),
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: /* @__PURE__ */ jsx(
                Link,
                {
                  href: `/trainings/${training.id}`,
                  className: "text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300",
                  children: "View"
                }
              ) })
            ] }, training.id);
          }) })
        ] }) }) }),
        trainings.last_page > 1 && /* @__PURE__ */ jsxs("div", { className: "mt-6 text-center text-sm text-gray-500 dark:text-gray-400", children: [
          "Page ",
          trainings.current_page,
          " of ",
          trainings.last_page,
          " (",
          trainings.total,
          " total trainings)"
        ] })
      ] }) : /* @__PURE__ */ jsxs("div", { className: "text-center py-12", children: [
        /* @__PURE__ */ jsx("svg", { className: "mx-auto h-12 w-12 text-gray-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" }) }),
        /* @__PURE__ */ jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900 dark:text-white", children: "No trainings found" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Get started by checking your dashboard for scheduled trainings." }),
        /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsx(
          Link,
          {
            href: "/dashboard",
            className: "inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            children: "Go to Dashboard"
          }
        ) })
      ] })
    ] }) })
  ] });
}
export {
  TrainingsIndex as default
};
