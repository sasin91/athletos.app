import { jsxs, jsx } from "react/jsx-runtime";
import { useForm, Head, Link } from "@inertiajs/react";
import { A as AuthLayout } from "./auth-layout-C2gqtMIU.js";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { L as Label, I as Input } from "./label-qls5No9M.js";
import { C as Checkbox } from "./checkbox-D07xazED.js";
import { r as register, l as login } from "./index-CrXrSpq1.js";
import { p as password } from "./index-CAndY3nf.js";
import "./app-logo-icon-wMAVxvx3.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
import "@radix-ui/react-checkbox";
import "lucide-react";
import "./index-ID1znBf5.js";
function Login({ status, canResetPassword }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: "",
    password: "",
    remember: false
  });
  const submit = (e) => {
    e.preventDefault();
    post(login.url(), {
      onFinish: () => reset("password")
    });
  };
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Login", description: "Please sign in to your account", children: [
    /* @__PURE__ */ jsx(Head, { title: "Login" }),
    /* @__PURE__ */ jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden", children: /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-6", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-gray-800 dark:text-gray-100", children: "Login" }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-1", children: "Sign in to your account" })
      ] }),
      status && /* @__PURE__ */ jsx("div", { className: "mb-4 font-medium text-sm text-green-600 dark:text-green-400", children: status }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, children: [
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
              autoComplete: "current-password",
              placeholder: "••••••••",
              onChange: (e) => setData("password", e.target.value),
              required: true
            }
          ),
          errors.password && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.password }),
          canResetPassword && /* @__PURE__ */ jsx(
            Link,
            {
              href: password.request.url(),
              className: "text-xs text-blue-600 dark:text-blue-400 hover:underline",
              children: "Forgot password?"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsxs(Label, { className: "flex items-center space-x-2", children: [
          /* @__PURE__ */ jsx(
            Checkbox,
            {
              name: "remember",
              checked: data.remember,
              onCheckedChange: (checked) => setData("remember", checked)
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "text-sm", children: "Remember me" })
        ] }) }),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "submit",
            disabled: processing,
            className: "w-full",
            children: processing ? "Signing In..." : "Sign In"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "text-center mt-6", children: /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: [
        "Don't have an account?",
        " ",
        /* @__PURE__ */ jsx(
          Link,
          {
            href: register.url(),
            className: "text-blue-600 dark:text-blue-400 hover:underline font-medium",
            children: "Sign up"
          }
        )
      ] }) })
    ] }) })
  ] });
}
export {
  Login as default
};
