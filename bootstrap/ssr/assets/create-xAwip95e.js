import { jsxs, jsx } from "react/jsx-runtime";
import { useForm, Head } from "@inertiajs/react";
import { A as AppLayout } from "./app-layout-J2OJ2uom.js";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { C as Card, c as CardHeader, d as CardTitle, b as CardDescription, a as CardContent } from "./card-BeSThMpO.js";
import { L as Label, I as Input } from "./label-qls5No9M.js";
import { T as Textarea } from "./textarea-CMuAavpa.js";
import { t as trainingPlans } from "./index-VEfDRYSW.js";
import "react";
import "class-variance-authority";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-slot";
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
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
function CreateTrainingPlan() {
  const { data, setData, post, processing, errors } = useForm({
    name: "",
    description: "",
    duration_weeks: "",
    difficulty_level: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(trainingPlans.store.url());
  };
  return /* @__PURE__ */ jsxs(AppLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Create Training Plan" }),
    /* @__PURE__ */ jsx("div", { className: "py-12", children: /* @__PURE__ */ jsx("div", { className: "max-w-2xl mx-auto sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsx(CardTitle, { children: "Create New Training Plan" }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Design a custom training plan for your fitness goals." })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "Plan Name" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "name",
              name: "name",
              value: data.name,
              onChange: (e) => setData("name", e.target.value),
              placeholder: "Enter plan name",
              autoFocus: true
            }
          ),
          errors.name && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600", children: errors.name })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "description", children: "Description" }),
          /* @__PURE__ */ jsx(
            Textarea,
            {
              id: "description",
              name: "description",
              value: data.description,
              onChange: (e) => setData("description", e.target.value),
              placeholder: "Describe the training plan",
              rows: 4
            }
          ),
          errors.description && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600", children: errors.description })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "duration_weeks", children: "Duration (weeks)" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "duration_weeks",
                name: "duration_weeks",
                type: "number",
                value: data.duration_weeks,
                onChange: (e) => setData("duration_weeks", e.target.value),
                placeholder: "12",
                min: "1",
                max: "52"
              }
            ),
            errors.duration_weeks && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600", children: errors.duration_weeks })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "difficulty_level", children: "Difficulty Level" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                id: "difficulty_level",
                name: "difficulty_level",
                value: data.difficulty_level,
                onChange: (e) => setData("difficulty_level", e.target.value),
                className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Select difficulty" }),
                  /* @__PURE__ */ jsx("option", { value: "beginner", children: "Beginner" }),
                  /* @__PURE__ */ jsx("option", { value: "intermediate", children: "Intermediate" }),
                  /* @__PURE__ */ jsx("option", { value: "advanced", children: "Advanced" })
                ]
              }
            ),
            errors.difficulty_level && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600", children: errors.difficulty_level })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-4", children: [
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: "Create Training Plan" }),
          /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              variant: "outline",
              onClick: () => window.history.back(),
              children: "Cancel"
            }
          )
        ] })
      ] }) })
    ] }) }) })
  ] });
}
export {
  CreateTrainingPlan as default
};
