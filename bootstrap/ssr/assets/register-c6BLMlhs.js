import { jsxs, jsx } from "react/jsx-runtime";
import { useForm, Head, Link } from "@inertiajs/react";
import { A as AuthLayout } from "./auth-layout-C2gqtMIU.js";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { L as Label, I as Input } from "./label-qls5No9M.js";
import { l as login, r as register } from "./index-CrXrSpq1.js";
import "./app-logo-icon-wMAVxvx3.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
import "./index-ID1znBf5.js";
function Register() {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: "",
    email: "",
    password: "",
    password_confirmation: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(register.url(), {
      onFinish: () => reset("password", "password_confirmation")
    });
  };
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Register", children: [
    /* @__PURE__ */ jsx(Head, { title: "Register" }),
    /* @__PURE__ */ jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden", children: /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-6", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-gray-800 dark:text-gray-100", children: "Register" }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-1", children: "Enter your details below to create your account" })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "name", className: "mb-2", children: "Full Name" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "name",
              type: "text",
              name: "name",
              value: data.name,
              autoComplete: "name",
              placeholder: "Full Name",
              onChange: (e) => setData("name", e.target.value),
              required: true
            }
          ),
          errors.name && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.name })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "email", className: "mb-2", children: "Email" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "email",
              type: "email",
              name: "email",
              value: data.email,
              autoComplete: "username",
              placeholder: "your@email.com",
              onChange: (e) => setData("email", e.target.value),
              required: true
            }
          ),
          errors.email && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.email })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "password", className: "mb-2", children: "Password" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "password",
              type: "password",
              name: "password",
              value: data.password,
              autoComplete: "new-password",
              placeholder: "••••••••",
              onChange: (e) => setData("password", e.target.value),
              required: true
            }
          ),
          errors.password && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.password })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "password_confirmation", className: "mb-2", children: "Confirm Password" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "password_confirmation",
              type: "password",
              name: "password_confirmation",
              value: data.password_confirmation,
              autoComplete: "new-password",
              placeholder: "••••••••",
              onChange: (e) => setData("password_confirmation", e.target.value),
              required: true
            }
          ),
          errors.password_confirmation && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.password_confirmation })
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "submit",
            disabled: processing,
            className: "w-full",
            children: processing ? "Creating Account..." : "Create Account"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "text-center mt-6", children: /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: [
        "Already have an account?",
        " ",
        /* @__PURE__ */ jsx(
          Link,
          {
            href: login.url(),
            className: "text-blue-600 dark:text-blue-400 hover:underline font-medium",
            children: "Sign in"
          }
        )
      ] }) })
    ] }) })
  ] });
}
export {
  Register as default
};
