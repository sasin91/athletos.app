import { jsxs, jsx } from "react/jsx-runtime";
import { useForm, Head, Link } from "@inertiajs/react";
import { A as AuthLayout } from "./auth-layout-C2gqtMIU.js";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { L as Label, I as Input } from "./label-qls5No9M.js";
import { p as password } from "./index-CAndY3nf.js";
import { l as login } from "./index-CrXrSpq1.js";
import "./app-logo-icon-wMAVxvx3.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
import "./index-ID1znBf5.js";
function ForgotPassword({ status }) {
  const { data, setData, post, processing, errors } = useForm({
    email: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(password.email.url());
  };
  return /* @__PURE__ */ jsxs(
    AuthLayout,
    {
      title: "Forgot Password",
      description: "Enter your email address and we'll send you a password reset link.",
      children: [
        /* @__PURE__ */ jsx(Head, { title: "Forgot Password" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          status && /* @__PURE__ */ jsx("div", { className: "rounded-md bg-green-50 p-4 text-sm text-green-600", children: status }),
          /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  id: "email",
                  type: "email",
                  name: "email",
                  value: data.email,
                  className: "mt-1 block w-full",
                  autoFocus: true,
                  onChange: (e) => setData("email", e.target.value)
                }
              ),
              errors.email && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600", children: errors.email })
            ] }),
            /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, className: "w-full", children: "Email Password Reset Link" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsx(
            Link,
            {
              href: login.url(),
              className: "text-sm text-muted-foreground hover:text-foreground underline",
              children: "Back to login"
            }
          ) })
        ] })
      ]
    }
  );
}
export {
  ForgotPassword as default
};
