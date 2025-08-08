import { jsxs, jsx } from "react/jsx-runtime";
import { Head } from "@inertiajs/react";
import { A as AppLayout, t as trainings } from "./app-layout-J2OJ2uom.js";
import { C as Card, c as CardHeader, d as CardTitle, b as CardDescription, a as CardContent } from "./card-BeSThMpO.js";
import { B as Badge } from "./badge-qfXdiv_u.js";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { CheckCircle, Target, Clock, Zap } from "lucide-react";
import { d as dashboard } from "./index-CrXrSpq1.js";
import "react";
import "class-variance-authority";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-slot";
import "@radix-ui/react-avatar";
import "./dropdown-menu-BtKPamvc.js";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-navigation-menu";
import "@radix-ui/react-dialog";
import "./index-BAFHCEvX.js";
import "./index-ID1znBf5.js";
import "./app-logo-icon-wMAVxvx3.js";
import "sonner";
import "clsx";
import "tailwind-merge";
function TrainingComplete({
  training,
  recoveryExercises
}) {
  return /* @__PURE__ */ jsxs(AppLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Training Complete" }),
    /* @__PURE__ */ jsx("div", { className: "py-12", children: /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center space-y-4", children: [
        /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsx(CheckCircle, { className: "h-16 w-16 text-green-500" }) }),
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold", children: "Training Complete!" }),
        /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Great job finishing your workout. Here's a summary of what you accomplished." })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Target, { className: "h-5 w-5" }),
            training.name
          ] }),
          /* @__PURE__ */ jsxs(CardDescription, { children: [
            "Completed on ",
            new Date(training.completed_at).toLocaleDateString()
          ] })
        ] }),
        /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4" }),
            "Duration: ",
            training.duration,
            " minutes"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsx("h4", { className: "font-medium", children: "Exercises Completed:" }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: training.exercises.map((exercise) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3 bg-muted rounded-lg", children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: exercise.name }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxs(Badge, { variant: "outline", children: [
                  exercise.sets,
                  " sets × ",
                  exercise.reps,
                  " reps"
                ] }),
                exercise.weight && /* @__PURE__ */ jsxs(Badge, { variant: "outline", children: [
                  exercise.weight,
                  " lbs"
                ] })
              ] })
            ] }, exercise.id)) })
          ] })
        ] })
      ] }),
      recoveryExercises.length > 0 && /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Zap, { className: "h-5 w-5" }),
            "Recommended Recovery"
          ] }),
          /* @__PURE__ */ jsx(CardDescription, { children: "Help your body recover with these suggested exercises" })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "grid gap-4", children: recoveryExercises.map((exercise) => /* @__PURE__ */ jsxs("div", { className: "p-4 border rounded-lg space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("h4", { className: "font-medium", children: exercise.name }),
            /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: exercise.type })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: exercise.description }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4" }),
            exercise.duration,
            " minutes"
          ] })
        ] }, exercise.id)) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-4 justify-center", children: [
        /* @__PURE__ */ jsx(Button, { onClick: () => window.location.href = dashboard.url(), children: "Back to Dashboard" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outline",
            onClick: () => window.location.href = trainings.index.url(),
            children: "View All Trainings"
          }
        )
      ] })
    ] }) })
  ] });
}
export {
  TrainingComplete as default
};
