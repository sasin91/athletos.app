import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { usePage, Head, Deferred, router } from "@inertiajs/react";
import { C as Card, a as CardContent, b as CardDescription, c as CardHeader, d as CardTitle } from "./card-BeSThMpO.js";
import { c as cn, B as Button } from "./button-hAi0Fg-Q.js";
import { B as Badge } from "./badge-qfXdiv_u.js";
import { FileText, Users, TrendingUp, Dumbbell, Target, Calendar } from "lucide-react";
import * as RechartsPrimitive from "recharts";
import { LineChart, CartesianGrid, XAxis, YAxis, Line } from "recharts";
import { A as AppLayout } from "./app-layout-J2OJ2uom.js";
import { d as dashboard$1 } from "./index-CrXrSpq1.js";
import { q as queryParams } from "./index-ID1znBf5.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-avatar";
import "./dropdown-menu-BtKPamvc.js";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-navigation-menu";
import "@radix-ui/react-dialog";
import "./index-BAFHCEvX.js";
import "./app-logo-icon-wMAVxvx3.js";
import "sonner";
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
function TodaysTraining({ trainingPlan, isToday, formattedDate, plannedExercises, currentStreak, onStartTraining }) {
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: trainingPlan.name }),
        /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("em", { children: formattedDate }) })
      ] }),
      currentStreak > 0 && /* @__PURE__ */ jsxs(Badge, { variant: "secondary", children: [
        "🔥 ",
        currentStreak,
        " day streak"
      ] })
    ] }),
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
      isToday && /* @__PURE__ */ jsx(Button, { onClick: onStartTraining, className: "w-full", size: "lg", children: "Start Training" })
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
const THEMES = { light: "", dark: ".dark" };
const ChartContext = React.createContext(null);
function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}
function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;
  return /* @__PURE__ */ jsx(ChartContext.Provider, { value: { config }, children: /* @__PURE__ */ jsxs(
    "div",
    {
      "data-slot": "chart",
      "data-chart": chartId,
      className: cn(
        "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
        className
      ),
      ...props,
      children: [
        /* @__PURE__ */ jsx(ChartStyle, { id: chartId, config }),
        /* @__PURE__ */ jsx(RechartsPrimitive.ResponsiveContainer, { children })
      ]
    }
  ) });
}
const ChartStyle = ({ id, config }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config2]) => config2.theme || config2.color
  );
  if (!colorConfig.length) {
    return null;
  }
  return /* @__PURE__ */ jsx(
    "style",
    {
      dangerouslySetInnerHTML: {
        __html: Object.entries(THEMES).map(
          ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig.map(([key, itemConfig]) => {
            var _a;
            const color = ((_a = itemConfig.theme) == null ? void 0 : _a[theme]) || itemConfig.color;
            return color ? `  --color-${key}: ${color};` : null;
          }).join("\n")}
}
`
        ).join("\n")
      }
    }
  );
};
const ChartTooltip = RechartsPrimitive.Tooltip;
function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey
}) {
  const { config } = useChart();
  const tooltipLabel = React.useMemo(() => {
    var _a;
    if (hideLabel || !(payload == null ? void 0 : payload.length)) {
      return null;
    }
    const [item] = payload;
    const key = `${labelKey || (item == null ? void 0 : item.dataKey) || (item == null ? void 0 : item.name) || "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value = !labelKey && typeof label === "string" ? ((_a = config[label]) == null ? void 0 : _a.label) || label : itemConfig == null ? void 0 : itemConfig.label;
    if (labelFormatter) {
      return /* @__PURE__ */ jsx("div", { className: cn("font-medium", labelClassName), children: labelFormatter(value, payload) });
    }
    if (!value) {
      return null;
    }
    return /* @__PURE__ */ jsx("div", { className: cn("font-medium", labelClassName), children: value });
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey
  ]);
  if (!active || !(payload == null ? void 0 : payload.length)) {
    return null;
  }
  const nestLabel = payload.length === 1 && indicator !== "dot";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      ),
      children: [
        !nestLabel ? tooltipLabel : null,
        /* @__PURE__ */ jsx("div", { className: "grid gap-1.5", children: payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color || item.payload.fill || item.color;
          return /* @__PURE__ */ jsx(
            "div",
            {
              className: cn(
                "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                indicator === "dot" && "items-center"
              ),
              children: formatter && (item == null ? void 0 : item.value) !== void 0 && item.name ? formatter(item.value, item.name, item, index, item.payload) : /* @__PURE__ */ jsxs(Fragment, { children: [
                (itemConfig == null ? void 0 : itemConfig.icon) ? /* @__PURE__ */ jsx(itemConfig.icon, {}) : !hideIndicator && /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: cn(
                      "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "w-1": indicator === "line",
                        "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                        "my-0.5": nestLabel && indicator === "dashed"
                      }
                    ),
                    style: {
                      "--color-bg": indicatorColor,
                      "--color-border": indicatorColor
                    }
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center"
                    ),
                    children: [
                      /* @__PURE__ */ jsxs("div", { className: "grid gap-1.5", children: [
                        nestLabel ? tooltipLabel : null,
                        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: (itemConfig == null ? void 0 : itemConfig.label) || item.name })
                      ] }),
                      item.value && /* @__PURE__ */ jsx("span", { className: "text-foreground font-mono font-medium tabular-nums", children: item.value.toLocaleString() })
                    ]
                  }
                )
              ] })
            },
            item.dataKey
          );
        }) })
      ]
    }
  );
}
const ChartLegend = RechartsPrimitive.Legend;
function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey
}) {
  const { config } = useChart();
  if (!(payload == null ? void 0 : payload.length)) {
    return null;
  }
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      ),
      children: payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        return /* @__PURE__ */ jsxs(
          "div",
          {
            className: cn(
              "[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
            ),
            children: [
              (itemConfig == null ? void 0 : itemConfig.icon) && !hideIcon ? /* @__PURE__ */ jsx(itemConfig.icon, {}) : /* @__PURE__ */ jsx(
                "div",
                {
                  className: "h-2 w-2 shrink-0 rounded-[2px]",
                  style: {
                    backgroundColor: item.color
                  }
                }
              ),
              itemConfig == null ? void 0 : itemConfig.label
            ]
          },
          item.value
        );
      })
    }
  );
}
function getPayloadConfigFromPayload(config, payload, key) {
  if (typeof payload !== "object" || payload === null) {
    return void 0;
  }
  const payloadPayload = "payload" in payload && typeof payload.payload === "object" && payload.payload !== null ? payload.payload : void 0;
  let configLabelKey = key;
  if (key in payload && typeof payload[key] === "string") {
    configLabelKey = payload[key];
  } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === "string") {
    configLabelKey = payloadPayload[key];
  }
  return configLabelKey in config ? config[configLabelKey] : config[key];
}
function WeightProgressionChart({
  weightProgressions,
  selectedExercise,
  timeframe,
  onSelectExercise,
  onSetTimeframe
}) {
  var _a, _b;
  const selectedProgression = (_a = weightProgressions == null ? void 0 : weightProgressions.progressions) == null ? void 0 : _a.find(
    (p) => p.exercise.value === selectedExercise
  );
  const chartData = useMemo(() => {
    var _a2;
    if (!((_a2 = selectedProgression == null ? void 0 : selectedProgression.dataPoints) == null ? void 0 : _a2.length)) return [];
    return selectedProgression.dataPoints.map((point) => ({
      week: `Week ${point.week}`,
      expected: point.expected_weight,
      current: point.current_weight
    }));
  }, [selectedProgression]);
  const chartConfig = {
    expected: {
      label: "Expected Weight",
      color: "hsl(220, 70%, 50%)"
      // Blue
    },
    current: {
      label: "Current Weight",
      color: "hsl(160, 60%, 45%)"
      // Green
    }
  };
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
  if (!((_b = weightProgressions == null ? void 0 : weightProgressions.progressions) == null ? void 0 : _b.length)) {
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
            progression.exercise.displayName || progression.exercise.value,
            /* @__PURE__ */ jsx("span", { className: "ml-1", children: getStatusIcon(progression) })
          ]
        },
        progression.exercise.value
      );
    }) }) }),
    selectedProgression ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsx(ChartContainer, { config: chartConfig, className: "h-80 w-full", children: /* @__PURE__ */ jsxs(LineChart, { data: chartData, children: [
        /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
        /* @__PURE__ */ jsx(
          XAxis,
          {
            dataKey: "week",
            tickLine: false,
            axisLine: false,
            tickMargin: 8
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            tickLine: false,
            axisLine: false,
            tickMargin: 8,
            tickFormatter: (value) => `${value}kg`
          }
        ),
        /* @__PURE__ */ jsx(ChartTooltip, { content: /* @__PURE__ */ jsx(ChartTooltipContent, {}) }),
        /* @__PURE__ */ jsx(ChartLegend, { content: /* @__PURE__ */ jsx(ChartLegendContent, {}) }),
        /* @__PURE__ */ jsx(
          Line,
          {
            type: "monotone",
            dataKey: "expected",
            stroke: "var(--color-expected)",
            strokeWidth: 2,
            dot: { r: 4 },
            strokeDasharray: "5 5"
          }
        ),
        /* @__PURE__ */ jsx(
          Line,
          {
            type: "monotone",
            dataKey: "current",
            stroke: "var(--color-current)",
            strokeWidth: 3,
            dot: { r: 5 }
          }
        )
      ] }) }) }),
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
function WeightProgressionSkeleton() {
  return /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsx("div", { className: "h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx("div", { className: "h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" }),
        /* @__PURE__ */ jsx("div", { className: "h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "h-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-4" }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsx("div", { className: "h-9 bg-gray-200 dark:bg-gray-700 rounded-full w-24 animate-pulse" }, i)) })
  ] });
}
function OneRepMaxesSkeleton() {
  return /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm", children: [
    /* @__PURE__ */ jsx("div", { className: "h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6 animate-pulse" }),
    /* @__PURE__ */ jsx("div", { className: "space-y-4", children: [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsx("div", { className: "w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1 animate-pulse" }),
          /* @__PURE__ */ jsx("div", { className: "h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsx("div", { className: "h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-1 animate-pulse" }),
        /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse" })
      ] })
    ] }, i)) })
  ] });
}
function RecoveryExercisesSkeleton() {
  return /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm", children: [
    /* @__PURE__ */ jsx("div", { className: "h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4 animate-pulse" }),
    /* @__PURE__ */ jsx("div", { className: "space-y-3", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg", children: [
      /* @__PURE__ */ jsx("div", { className: "w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 animate-pulse" })
    ] }, i)) })
  ] });
}
function DashboardPage({
  athlete,
  currentPlan,
  metrics,
  weightProgressions,
  oneRepMaxes,
  plannedExercises,
  recoveryExercises,
  date,
  formattedDate
}) {
  var _a, _b, _c;
  const [currentDate, setCurrentDate] = useState(new Date(date));
  const [selectedExercise, setSelectedExercise] = useState(((_c = (_b = (_a = weightProgressions == null ? void 0 : weightProgressions.progressions) == null ? void 0 : _a[0]) == null ? void 0 : _b.exercise) == null ? void 0 : _c.value) || null);
  const [timeframe, setTimeframe] = useState("12");
  const [isNavigating, setIsNavigating] = useState(false);
  const progressMetrics = useMemo(
    () => ({
      completedThisWeek: metrics.completedThisWeek,
      weeklyGoal: metrics.weeklyGoal,
      phaseWeek: metrics.currentPhaseWeek,
      totalPhaseWeeks: metrics.totalPhaseWeeks,
      phaseProgressPercentage: () => metrics.phaseProgress
    }),
    [metrics]
  );
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
    router.visit(
      dashboard$1.url({
        query: { date: newDate.toISOString().split("T")[0] }
      }),
      {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => setIsNavigating(false)
      }
    );
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
    /* @__PURE__ */ jsx(PageTransition, { children: /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8", children: [
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
      /* @__PURE__ */ jsx(DashboardStats, { isNavigating, metrics }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-8 xl:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-8 xl:col-span-2", children: [
          /* @__PURE__ */ jsx(
            TodaysTraining,
            {
              trainingPlan: currentPlan,
              isToday,
              formattedDate,
              plannedExercises,
              currentStreak: metrics.currentStreak,
              onStartTraining: handleStartTraining
            }
          ),
          /* @__PURE__ */ jsx(Deferred, { data: "weightProgressions", fallback: /* @__PURE__ */ jsx(WeightProgressionSkeleton, {}), children: /* @__PURE__ */ jsx(
            WeightProgressionChart,
            {
              weightProgressions,
              selectedExercise,
              timeframe,
              onSelectExercise: handleSelectExercise,
              onSetTimeframe: handleSetTimeframe
            }
          ) }),
          /* @__PURE__ */ jsx(Deferred, { data: "oneRepMaxes", fallback: /* @__PURE__ */ jsx(OneRepMaxesSkeleton, {}), children: /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800", children: [
            /* @__PURE__ */ jsx("h3", { className: "mb-4 text-lg font-semibold", children: "One Rep Maxes" }),
            /* @__PURE__ */ jsx("div", { className: "space-y-3", children: (oneRepMaxes == null ? void 0 : oneRepMaxes.oneRepMaxes.map((orm) => /* @__PURE__ */ jsxs(
              "div",
              {
                className: "flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: orm.exercise.displayName }),
                  /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
                    /* @__PURE__ */ jsxs("span", { className: "text-lg font-bold", children: [
                      orm.current,
                      "kg"
                    ] }),
                    orm.change !== 0 && /* @__PURE__ */ jsxs("span", { className: `ml-2 text-sm ${orm.change > 0 ? "text-green-600" : "text-red-600"}`, children: [
                      orm.change > 0 ? "+" : "",
                      orm.change,
                      "kg"
                    ] })
                  ] })
                ]
              },
              `oneRepMax-${orm.exercise.value}`
            ))) || [] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800", children: [
            /* @__PURE__ */ jsx("h3", { className: "mb-4 text-lg font-semibold", children: metrics.currentPhaseName }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("div", { className: "mb-1 flex justify-between text-sm text-gray-600 dark:text-gray-400", children: [
                  /* @__PURE__ */ jsx("span", { children: "Week Progress" }),
                  /* @__PURE__ */ jsxs("span", { children: [
                    progressMetrics.completedThisWeek,
                    "/",
                    progressMetrics.weeklyGoal
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700", children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "h-2 rounded-full bg-blue-600 transition-all duration-300",
                    style: {
                      width: `${Math.min(100, progressMetrics.completedThisWeek / progressMetrics.weeklyGoal * 100)}%`
                    }
                  }
                ) })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("div", { className: "mb-1 flex justify-between text-sm text-gray-600 dark:text-gray-400", children: [
                  /* @__PURE__ */ jsx("span", { children: "Phase Progress" }),
                  /* @__PURE__ */ jsxs("span", { children: [
                    progressMetrics.phaseWeek,
                    "/",
                    progressMetrics.totalPhaseWeeks
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700", children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "h-2 rounded-full bg-green-600 transition-all duration-300",
                    style: { width: `${progressMetrics.phaseProgressPercentage()}%` }
                  }
                ) })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Deferred, { data: "recoveryExercises", fallback: /* @__PURE__ */ jsx(RecoveryExercisesSkeleton, {}), children: recoveryExercises && recoveryExercises.length > 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800", children: [
            /* @__PURE__ */ jsx("h3", { className: "mb-4 text-lg font-semibold", children: "Recovery Exercises" }),
            /* @__PURE__ */ jsx("div", { className: "space-y-2", children: recoveryExercises == null ? void 0 : recoveryExercises.map((exercise) => /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-blue-500", children: "•" }),
              /* @__PURE__ */ jsx("span", { children: exercise.name })
            ] }, `recoveryExercise-${exercise.name}`)) })
          ] }) : /* @__PURE__ */ jsx(Fragment, {}) })
        ] })
      ] })
    ] }) }) })
  ] });
}
export {
  DashboardPage as default
};
