import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import * as React from "react";
import { useRef, useState, useEffect, useMemo } from "react";
import { usePage, Head, router } from "@inertiajs/react";
import { A as AppLayout } from "./app-layout-CUuxNbvK.js";
import { d as dashboard$1 } from "./index-CrXrSpq1.js";
import { q as queryParams } from "./index-ID1znBf5.js";
import { C as Card, a as CardContent, b as CardDescription, c as CardHeader, d as CardTitle } from "./card-D-y9wdAs.js";
import { c as cn, B as Button } from "./button-hAi0Fg-Q.js";
import { B as Badge } from "./badge-qfXdiv_u.js";
import { FileText, Users, TrendingUp, Dumbbell, Target, Calendar } from "lucide-react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import "class-variance-authority";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-slot";
import "@radix-ui/react-avatar";
import "./dropdown-menu-BtKPamvc.js";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-navigation-menu";
import "@radix-ui/react-dialog";
import "./index-BAFHCEvX.js";
import "./app-logo-icon-wMAVxvx3.js";
import "sonner";
import "clsx";
import "tailwind-merge";
const startTraining = (options) => ({
  url: startTraining.url(options),
  method: "post"
});
startTraining.definition = {
  methods: ["post"],
  url: "/dashboard/start-training"
};
startTraining.url = (options) => {
  return startTraining.definition.url + queryParams(options);
};
startTraining.post = (options) => ({
  url: startTraining.url(options),
  method: "post"
});
const dashboard = {
  startTraining
};
function WeightProgressionChart({
  athlete,
  weightProgressions,
  selectedExercise,
  timeframe,
  onSelectExercise,
  onSetTimeframe
}) {
  var _a;
  const chartRef = useRef(null);
  const [chart, setChart] = useState(null);
  const selectedProgression = (_a = weightProgressions == null ? void 0 : weightProgressions.progressions) == null ? void 0 : _a.find(
    (p) => p.exercise.value === selectedExercise
  );
  const getStatusClass = (progression) => {
    if (progression.isAhead) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    } else if (progression.isBehind) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    } else if (progression.isOnTrack) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  };
  const getStatusIcon = (progression) => {
    if (progression.isAhead) return "↑";
    if (progression.isBehind) return "↓";
    return "→";
  };
  useEffect(() => {
    if (selectedProgression && selectedProgression.dataPoints.length > 0 && chartRef.current) {
      if (window.ApexCharts) {
        if (chart) {
          chart.destroy();
        }
        const chartData = selectedProgression.chartData;
        const options = {
          series: chartData.series,
          chart: {
            type: "line",
            height: 320,
            toolbar: { show: false },
            background: "transparent"
          },
          colors: ["#3B82F6", "#10B981"],
          stroke: {
            curve: "smooth",
            width: 3
          },
          grid: {
            borderColor: "#374151",
            strokeDashArray: 4
          },
          xaxis: {
            categories: chartData.categories,
            labels: { style: { colors: "#9CA3AF" } },
            axisBorder: { color: "#374151" }
          },
          yaxis: {
            title: {
              text: "Weight (kg)",
              style: { color: "#9CA3AF" }
            },
            labels: { style: { colors: "#9CA3AF" } }
          },
          legend: {
            position: "top",
            horizontalAlign: "right",
            labels: { colors: "#9CA3AF" }
          },
          tooltip: {
            theme: "dark",
            y: {
              formatter: function(val) {
                return val + " kg";
              }
            }
          },
          markers: {
            size: 6,
            hover: { size: 8 }
          }
        };
        const newChart = new window.ApexCharts(chartRef.current, options);
        newChart.render();
        setChart(newChart);
      }
    }
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  }, [selectedProgression]);
  if (!(weightProgressions == null ? void 0 : weightProgressions.hasData)) {
    return /* @__PURE__ */ jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: /* @__PURE__ */ jsxs("div", { className: "text-center py-8", children: [
      /* @__PURE__ */ jsx("svg", { className: "mx-auto h-12 w-12 text-gray-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900 dark:text-gray-100", children: "No weight progression data" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Complete training sessions with weight logging to see your progression charts." })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("svg", { className: "h-5 w-5 text-blue-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" }) }),
          "Weight Progression"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: "Track your progress against expected weight increases" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Timeframe:" }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: timeframe,
            onChange: (e) => onSetTimeframe(e.target.value),
            className: "text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100",
            children: [
              /* @__PURE__ */ jsx("option", { value: "4", children: "4 weeks" }),
              /* @__PURE__ */ jsx("option", { value: "8", children: "8 weeks" }),
              /* @__PURE__ */ jsx("option", { value: "12", children: "12 weeks" }),
              /* @__PURE__ */ jsx("option", { value: "16", children: "16 weeks" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: weightProgressions.progressions.map((progression) => {
      const isSelected = selectedExercise === progression.exercise.value;
      const statusClass = getStatusClass(progression);
      return /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => onSelectExercise(progression.exercise.value),
          className: `px-3 py-1 rounded-full text-sm font-medium transition-colors ${isSelected ? "ring-2 ring-blue-500" : ""} ${statusClass}`,
          children: [
            progression.exercise.displayName,
            /* @__PURE__ */ jsx("span", { className: "ml-1", children: getStatusIcon(progression) })
          ]
        },
        progression.exercise.value
      );
    }) }) }),
    selectedProgression ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsx("div", { ref: chartRef, className: "w-full h-80" }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-500 dark:text-gray-400", children: "Current Weight" }),
          /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100", children: selectedProgression.currentWeight ? `${selectedProgression.currentWeight.toFixed(1)} kg` : "N/A" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-500 dark:text-gray-400", children: "Expected Weight" }),
          /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100", children: selectedProgression.expectedWeight ? `${selectedProgression.expectedWeight.toFixed(1)} kg` : "N/A" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-500 dark:text-gray-400", children: "Progress" }),
          /* @__PURE__ */ jsxs("div", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100", children: [
            Math.round(selectedProgression.progressPercentage),
            "%"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400 mt-1", children: selectedProgression.isAhead ? /* @__PURE__ */ jsx("span", { className: "text-green-600 dark:text-green-400", children: "Ahead of schedule" }) : selectedProgression.isBehind ? /* @__PURE__ */ jsx("span", { className: "text-red-600 dark:text-red-400", children: "Behind schedule" }) : /* @__PURE__ */ jsx("span", { className: "text-blue-600 dark:text-blue-400", children: "On track" }) })
        ] })
      ] })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "text-center py-8", children: [
      /* @__PURE__ */ jsx("svg", { className: "mx-auto h-12 w-12 text-gray-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900 dark:text-gray-100", children: "No data available" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Complete some training sessions to see your weight progression." })
    ] })
  ] });
}
function ExerciseSummary({
  athlete,
  trainings: trainings2,
  show,
  date,
  summary,
  onHide
}) {
  const [isVisible, setIsVisible] = useState(show);
  useEffect(() => {
    setIsVisible(show);
  }, [show]);
  const handleClose = () => {
    setIsVisible(false);
    onHide();
  };
  const handleStartTraining = () => {
    window.location.href = trainings2.index.url();
  };
  const handleViewTraining = (trainingId) => {
    window.location.href = trainings2.show.url({ training: trainingId });
  };
  if (!isVisible) return null;
  const parsedDate = date ? new Date(date) : null;
  const isToday = (parsedDate == null ? void 0 : parsedDate.toDateString()) === (/* @__PURE__ */ new Date()).toDateString();
  const firstTraining = trainings2 == null ? void 0 : trainings2[0];
  return /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "fixed inset-0 bg-gray-500/75 transition-opacity",
        onClick: handleClose,
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-10 w-screen overflow-y-auto", children: /* @__PURE__ */ jsx("div", { className: "flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0", children: /* @__PURE__ */ jsxs("div", { className: "relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6", children: [
      /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("div", { className: "mt-3 text-center sm:mt-5", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-base font-semibold text-gray-900 dark:text-gray-100", children: [
          "Training for ",
          parsedDate == null ? void 0 : parsedDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-2", children: summary.length > 0 ? /* @__PURE__ */ jsx("div", { className: "space-y-3", children: summary.map((exercise, index) => /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg", children: /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("h4", { className: "font-medium text-gray-900 dark:text-gray-100", children: exercise.name }),
          /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: [
            exercise.sets,
            " sets × ",
            exercise.reps,
            " reps"
          ] }),
          exercise.weight !== "Body weight" && /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 dark:text-gray-500", children: exercise.weight })
        ] }) }, index)) }) : /* @__PURE__ */ jsx("p", { className: "text-gray-500 dark:text-gray-400", children: !athlete.currentPlan ? "No training plan configured. Please set up a training plan to see exercises." : "No exercises planned for this date." }) })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-5 sm:mt-6 flex justify-end space-x-3", children: [
        (firstTraining == null ? void 0 : firstTraining.id) ? /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => handleViewTraining(firstTraining.id),
            className: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            children: "View Training"
          }
        ) : isToday ? /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleStartTraining,
            className: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500",
            children: "Start Training"
          }
        ) : null,
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: handleClose,
            className: "inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            children: "Close"
          }
        )
      ] })
    ] }) }) })
  ] });
}
function PageTransition({ children, className = "" }) {
  const [isVisible, setIsVisible] = useState(false);
  const { url } = usePage();
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [url]);
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `
        transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        ${className}
      `,
      children
    }
  );
}
function StaggeredAnimation({
  children,
  delay = 100,
  className = ""
}) {
  const [visibleItems, setVisibleItems] = useState([]);
  useEffect(() => {
    setVisibleItems([]);
    children.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems((prev) => [...prev, index]);
      }, index * delay);
    });
  }, [children.length, delay]);
  return /* @__PURE__ */ jsx("div", { className, children: children.map((child, index) => /* @__PURE__ */ jsx(
    "div",
    {
      className: `
            transition-all duration-500 ease-out
            ${visibleItems.includes(index) ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"}
          `,
      children: child
    },
    index
  )) });
}
function FadeIn({
  children,
  delay = 0,
  className = ""
}) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `
        transition-all duration-500 ease-out
        ${isVisible ? "opacity-100" : "opacity-0"}
        ${className}
      `,
      children
    }
  );
}
function DashboardHeader({
  athleteName,
  currentDate,
  formattedDate,
  isToday,
  onDateChange
}) {
  return /* @__PURE__ */ jsx(FadeIn, { className: "mb-8", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-gray-100", children: "Dashboard" }),
      /* @__PURE__ */ jsxs("p", { className: "text-gray-600 dark:text-gray-400", children: [
        "Welcome back, ",
        athleteName || "Athlete"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => onDateChange("prev"),
            className: "p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
            children: "←"
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 min-w-[120px] text-center", children: formattedDate }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => onDateChange("next"),
            className: "p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
            children: "→"
          }
        )
      ] }),
      !isToday && /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => onDateChange("today"),
          className: "px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800",
          children: "Today"
        }
      )
    ] })
  ] }) });
}
function LoadingSkeleton({
  className,
  variant = "default",
  width,
  height,
  lines = 1
}) {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-700";
  const variantClasses = {
    default: "rounded",
    rounded: "rounded-lg",
    circular: "rounded-full"
  };
  const skeletonClasses = cn(
    baseClasses,
    variantClasses[variant],
    className
  );
  if (lines > 1) {
    return /* @__PURE__ */ jsx("div", { className: "space-y-2", children: Array.from({ length: lines }, (_, i) => /* @__PURE__ */ jsx(
      "div",
      {
        className: cn(
          skeletonClasses,
          i === lines - 1 ? "w-3/4" : "w-full"
        ),
        style: {
          width: i === lines - 1 ? "75%" : width,
          height: height || "1rem"
        }
      },
      i
    )) });
  }
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: skeletonClasses,
      style: { width, height }
    }
  );
}
function DashboardStats({ isNavigating, metrics }) {
  const stats = [
    {
      label: "Total Workouts",
      value: metrics.totalWorkouts
    },
    {
      label: "Current Streak",
      value: metrics.currentStreak
    },
    {
      label: "This Week",
      value: `${metrics.completedThisWeek}/${metrics.weeklyGoal}`
    },
    {
      label: "Phase Progress",
      value: `${metrics.phaseProgress}%`
    }
  ];
  if (isNavigating) {
    return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6 mb-8", children: Array.from({ length: 4 }, (_, i) => /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: [
      /* @__PURE__ */ jsx(LoadingSkeleton, { className: "h-4 w-20 mb-2" }),
      /* @__PURE__ */ jsx(LoadingSkeleton, { className: "h-8 w-16" })
    ] }, i)) });
  }
  return /* @__PURE__ */ jsx(
    StaggeredAnimation,
    {
      delay: 150,
      className: "grid grid-cols-1 md:grid-cols-4 gap-6 mb-8",
      children: stats.map((stat, index) => /* @__PURE__ */ jsx(Card, { className: "transition-all duration-300 hover:shadow-md hover:scale-105", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-6", children: [
        /* @__PURE__ */ jsx(CardDescription, { className: "text-sm font-medium", children: stat.label }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold transition-all duration-500", children: stat.value })
      ] }) }, index))
    }
  );
}
function EmptyState({
  icon = "document",
  title,
  description,
  action,
  className = ""
}) {
  const icons = {
    calendar: Calendar,
    target: Target,
    dumbbell: Dumbbell,
    chart: TrendingUp,
    users: Users,
    document: FileText
  };
  const IconComponent = typeof icon === "string" ? icons[icon] : null;
  return /* @__PURE__ */ jsxs("div", { className: `text-center py-12 ${className}`, children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4", children: IconComponent ? /* @__PURE__ */ jsx(IconComponent, { className: "w-8 h-8 text-gray-400 dark:text-gray-500" }) : icon }),
    /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-2", children: title }),
    /* @__PURE__ */ jsx("p", { className: "text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto", children: description }),
    action && /* @__PURE__ */ jsx(
      "button",
      {
        onClick: action.onClick,
        className: `
            inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors
            ${action.variant === "secondary" ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600" : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"}
          `,
        children: action.label
      }
    )
  ] });
}
function NoUpcomingWorkouts({ onCreateWorkout }) {
  return /* @__PURE__ */ jsx(
    EmptyState,
    {
      icon: "calendar",
      title: "No upcoming workouts",
      description: "You're all caught up! Schedule your next training session to continue your progress.",
      action: onCreateWorkout ? {
        label: "Schedule Workout",
        onClick: onCreateWorkout
      } : void 0
    }
  );
}
function TodaysTraining({
  isToday,
  formattedDate,
  plannedExercises,
  currentStreak,
  onStartTraining
}) {
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: isToday ? "Today's Training" : `Training for ${formattedDate}` }),
      currentStreak > 0 && /* @__PURE__ */ jsxs(Badge, { variant: "secondary", children: [
        "🔥 ",
        currentStreak,
        " day streak"
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(CardContent, { children: plannedExercises.length > 0 ? /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        plannedExercises.slice(0, 3).map((exercise, index) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between py-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-gray-700 dark:text-gray-300", children: exercise.name }),
          /* @__PURE__ */ jsxs("span", { className: "text-sm text-gray-500 dark:text-gray-400", children: [
            exercise.sets,
            " sets × ",
            exercise.reps,
            " reps"
          ] })
        ] }, index)),
        plannedExercises.length > 3 && /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: [
          "+",
          plannedExercises.length - 3,
          " more exercises"
        ] })
      ] }),
      isToday && /* @__PURE__ */ jsx(
        Button,
        {
          onClick: onStartTraining,
          className: "w-full",
          size: "lg",
          children: "Start Training"
        }
      )
    ] }) : /* @__PURE__ */ jsx("div", { className: "py-4", children: isToday ? /* @__PURE__ */ jsx(NoUpcomingWorkouts, { onCreateWorkout: onStartTraining }) : /* @__PURE__ */ jsx(
      EmptyState,
      {
        icon: "calendar",
        title: "No training scheduled",
        description: `No workout is planned for ${formattedDate}. Check your training schedule or create a custom session.`
      }
    ) }) })
  ] });
}
const Progress = React.forwardRef(({ className, value, ...props }, ref) => /* @__PURE__ */ jsx(
  ProgressPrimitive.Root,
  {
    ref,
    className: cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsx(
      ProgressPrimitive.Indicator,
      {
        className: "h-full w-full flex-1 bg-primary transition-all",
        style: { transform: `translateX(-${100 - (value || 0)}%)` }
      }
    )
  }
));
Progress.displayName = ProgressPrimitive.Root.displayName;
function EnhancedProgress({
  value,
  max = 100,
  label,
  showValue = false,
  variant = "default",
  size = "md",
  className
}) {
  const percentage = Math.min(value / max * 100, 100);
  const variants = {
    default: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500"
  };
  const sizes = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3"
  };
  return /* @__PURE__ */ jsxs("div", { className: cn("space-y-2", className), children: [
    (label || showValue) && /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-sm", children: [
      label && /* @__PURE__ */ jsx("span", { className: "font-medium", children: label }),
      showValue && /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
        value,
        "/",
        max,
        " (",
        Math.round(percentage),
        "%)"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: cn(
      "relative w-full overflow-hidden rounded-full bg-muted",
      sizes[size]
    ), children: /* @__PURE__ */ jsx(
      "div",
      {
        className: cn(
          "h-full transition-all duration-300 ease-out",
          variants[variant]
        ),
        style: { width: `${percentage}%` }
      }
    ) })
  ] });
}
function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  className,
  showValue = true,
  variant = "default"
}) {
  const percentage = Math.min(value / max * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - percentage / 100 * circumference;
  const variants = {
    default: "stroke-primary",
    success: "stroke-green-500",
    warning: "stroke-yellow-500",
    danger: "stroke-red-500"
  };
  return /* @__PURE__ */ jsxs("div", { className: cn("relative", className), style: { width: size, height: size }, children: [
    /* @__PURE__ */ jsxs(
      "svg",
      {
        width: size,
        height: size,
        className: "transform -rotate-90",
        children: [
          /* @__PURE__ */ jsx(
            "circle",
            {
              cx: size / 2,
              cy: size / 2,
              r: radius,
              stroke: "currentColor",
              strokeWidth,
              fill: "none",
              className: "text-muted stroke-current opacity-20"
            }
          ),
          /* @__PURE__ */ jsx(
            "circle",
            {
              cx: size / 2,
              cy: size / 2,
              r: radius,
              stroke: "currentColor",
              strokeWidth,
              fill: "none",
              strokeDasharray: circumference,
              strokeDashoffset,
              strokeLinecap: "round",
              className: cn("transition-all duration-300 ease-out", variants[variant])
            }
          )
        ]
      }
    ),
    showValue && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-2xl font-bold", children: [
        Math.round(percentage),
        "%"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
        value,
        "/",
        max
      ] })
    ] }) })
  ] });
}
function DashboardSidebar({
  progressMetrics,
  currentPhaseName,
  recoveryExercises
}) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Weekly Goal" }),
        /* @__PURE__ */ jsxs(CardDescription, { children: [
          progressMetrics.completedThisWeek,
          " of ",
          progressMetrics.weeklyGoal,
          " workouts completed"
        ] })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsx(
          EnhancedProgress,
          {
            value: progressMetrics.completedThisWeek,
            max: progressMetrics.weeklyGoal,
            showValue: true,
            variant: progressMetrics.completedThisWeek >= progressMetrics.weeklyGoal ? "success" : "default"
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsx(
          CircularProgress,
          {
            value: progressMetrics.completedThisWeek,
            max: progressMetrics.weeklyGoal,
            size: 100,
            variant: progressMetrics.completedThisWeek >= progressMetrics.weeklyGoal ? "success" : "default"
          }
        ) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Phase Progress" }),
        /* @__PURE__ */ jsxs(CardDescription, { children: [
          "Week ",
          progressMetrics.phaseWeek,
          " of ",
          progressMetrics.totalPhaseWeeks,
          " in current phase"
        ] })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsx(
          EnhancedProgress,
          {
            value: progressMetrics.phaseWeek,
            max: progressMetrics.totalPhaseWeeks,
            label: `${currentPhaseName} Phase`,
            showValue: true,
            variant: "default"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsxs("div", { className: "text-2xl font-bold text-primary", children: [
            Math.round(progressMetrics.phaseWeek / progressMetrics.totalPhaseWeeks * 100),
            "%"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Complete" })
        ] })
      ] }) })
    ] }),
    recoveryExercises.length > 0 && /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Recovery & Mobility" }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "space-y-2", children: recoveryExercises.slice(0, 5).map((exercise, index) => /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
        "• ",
        exercise.name
      ] }, index)) }) })
    ] })
  ] });
}
function DashboardPage({
  athlete,
  metrics,
  weightProgressions,
  plannedExercises,
  recoveryExercises,
  date,
  formattedDate
}) {
  var _a, _b, _c;
  const [currentDate, setCurrentDate] = useState(new Date(date));
  const [showExerciseSummary, setShowExerciseSummary] = useState(false);
  const [exerciseSummaryDate] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(
    ((_c = (_b = (_a = weightProgressions == null ? void 0 : weightProgressions.progressions) == null ? void 0 : _a[0]) == null ? void 0 : _b.exercise) == null ? void 0 : _c.value) || null
  );
  const [timeframe, setTimeframe] = useState("12");
  const [isNavigating, setIsNavigating] = useState(false);
  const progressMetrics = useMemo(() => ({
    completedThisWeek: metrics.completedThisWeek,
    weeklyGoal: metrics.weeklyGoal,
    phaseWeek: metrics.currentPhaseWeek,
    totalPhaseWeeks: metrics.totalPhaseWeeks,
    phaseProgressPercentage: () => metrics.phaseProgress
  }), [metrics]);
  const handleDateChange = (direction) => {
    let newDate = new Date(currentDate);
    switch (direction) {
      case "prev":
        newDate.setDate(newDate.getDate() - 1);
        break;
      case "next":
        newDate.setDate(newDate.getDate() + 1);
        break;
      case "today":
        newDate = /* @__PURE__ */ new Date();
        break;
    }
    setCurrentDate(newDate);
    setIsNavigating(true);
    router.visit(dashboard$1.url({
      query: { date: newDate.toISOString().split("T")[0] }
    }), {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setIsNavigating(false)
    });
  };
  const handleStartTraining = () => {
    router.post(dashboard.startTraining.url(), {
      date: currentDate.toISOString().split("T")[0]
    });
  };
  const handleSelectExercise = (exercise) => {
    setSelectedExercise(exercise);
  };
  const handleSetTimeframe = (newTimeframe) => {
    setTimeframe(newTimeframe);
    router.visit(dashboard$1.url(), {
      data: { timeframe: newTimeframe },
      preserveState: true,
      preserveScroll: true,
      only: ["weightProgressions"]
    });
  };
  const isToday = currentDate.toDateString() === (/* @__PURE__ */ new Date()).toDateString();
  return /* @__PURE__ */ jsxs(AppLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Dashboard" }),
    /* @__PURE__ */ jsx(PageTransition, { children: /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [
      /* @__PURE__ */ jsx(
        DashboardHeader,
        {
          athleteName: athlete.name,
          currentDate,
          formattedDate,
          isToday,
          onDateChange: handleDateChange
        }
      ),
      /* @__PURE__ */ jsx(
        DashboardStats,
        {
          isNavigating,
          metrics
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-3 gap-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "xl:col-span-2 space-y-8", children: [
          /* @__PURE__ */ jsx(
            TodaysTraining,
            {
              isToday,
              formattedDate,
              plannedExercises,
              currentStreak: metrics.currentStreak,
              onStartTraining: handleStartTraining
            }
          ),
          /* @__PURE__ */ jsx(
            WeightProgressionChart,
            {
              athlete,
              weightProgressions,
              selectedExercise,
              timeframe,
              onSelectExercise: handleSelectExercise,
              onSetTimeframe: handleSetTimeframe
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          DashboardSidebar,
          {
            progressMetrics,
            currentPhaseName: metrics.currentPhaseName,
            recoveryExercises
          }
        )
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsx(
      ExerciseSummary,
      {
        athlete,
        trainings: [],
        show: showExerciseSummary,
        date: exerciseSummaryDate,
        summary: [],
        onHide: () => setShowExerciseSummary(false)
      }
    )
  ] });
}
export {
  DashboardPage as default
};
