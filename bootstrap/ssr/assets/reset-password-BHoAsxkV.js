import { jsxs, jsx } from "react/jsx-runtime";
import { useForm, Head } from "@inertiajs/react";
import { A as AuthLayout } from "./auth-layout-B3uNWcJG.js";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { L as Label, I as Input } from "./label-qls5No9M.js";
import { p as password } from "./index-CAndY3nf.js";
import "./app-logo-icon-wMAVxvx3.js";
import "./index-CrXrSpq1.js";
import "./index-ID1znBf5.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
function ResetPassword({
  token,
  email,
  request
}) {
  const { data, setData, post, processing, errors, reset } = useForm({
    token,
    email,
    password: "",
    password_confirmation: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(password.store.url(), {
      onFinish: () => reset("password", "password_confirmation")
    });
  };
  return /* @__PURE__ */ jsxs(
    AuthLayout,
    {
      title: "Reset Password",
      description: "Enter your new password below.",
      children: [
        /* @__PURE__ */ jsx(Head, { title: "Reset Password" }),
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
                autoComplete: "username",
                onChange: (e) => setData("email", e.target.value)
              }
            ),
            errors.email && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600", children: errors.email })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "password",
                type: "password",
                name: "password",
                value: data.password,
                className: "mt-1 block w-full",
                autoComplete: "new-password",
                autoFocus: true,
                onChange: (e) => setData("password", e.target.value)
              }
            ),
            errors.password && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600", children: errors.password })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "password_confirmation", children: "Confirm Password" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "password_confirmation",
                type: "password",
                name: "password_confirmation",
                value: data.password_confirmation,
                className: "mt-1 block w-full",
                autoComplete: "new-password",
                onChange: (e) => setData("password_confirmation", e.target.value)
              }
            ),
            errors.password_confirmation && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600", children: errors.password_confirmation })
          ] }),
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, className: "w-full", children: "Reset Password" })
        ] })
      ]
    }
  );
}
export {
  ResetPassword as default
};
