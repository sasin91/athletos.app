import { jsxs, jsx } from "react/jsx-runtime";
import { useForm, Head } from "@inertiajs/react";
import { S as SettingsLayout } from "./settings-layout-DvcHR2Gt.js";
import { s as settings } from "./index-BAFHCEvX.js";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { L as Label, I as Input } from "./label-qls5No9M.js";
import "@radix-ui/react-separator";
import "./index-ID1znBf5.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
function Password({ user }) {
  const { data, setData, put, processing, errors, reset } = useForm({
    current_password: "",
    password: "",
    password_confirmation: ""
  });
  const submit = (e) => {
    e.preventDefault();
    put(settings.password.update.url(), {
      onSuccess: () => {
        reset();
      }
    });
  };
  return /* @__PURE__ */ jsxs(SettingsLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Password Settings - Athletos" }),
    /* @__PURE__ */ jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6", children: /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: "Update Password" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: "Ensure your account is using a long, random password to stay secure" })
      ] }),
      /* @__PURE__ */ jsxs("form", { className: "max-w-md", onSubmit: submit, children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "current_password", className: "mb-2", children: "Current Password" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "password",
              id: "current_password",
              name: "current_password",
              value: data.current_password,
              onChange: (e) => setData("current_password", e.target.value),
              required: true
            }
          ),
          errors.current_password && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.current_password })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "password", className: "mb-2", children: "New Password" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "password",
              id: "password",
              name: "password",
              value: data.password,
              onChange: (e) => setData("password", e.target.value),
              required: true
            }
          ),
          errors.password && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.password })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "password_confirmation", className: "mb-2", children: "Confirm Password" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "password",
              id: "password_confirmation",
              name: "password_confirmation",
              value: data.password_confirmation,
              onChange: (e) => setData("password_confirmation", e.target.value),
              required: true
            }
          ),
          errors.password_confirmation && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.password_confirmation })
        ] }),
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
          Button,
          {
            type: "submit",
            disabled: processing,
            children: processing ? "Updating..." : "Update Password"
          }
        ) })
      ] })
    ] }) })
  ] });
}
export {
  Password as default
};
