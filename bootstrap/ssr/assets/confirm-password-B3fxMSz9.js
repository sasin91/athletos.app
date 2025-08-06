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
function ConfirmPassword() {
  const { data, setData, post, processing, errors, reset } = useForm({
    password: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(password.confirm.url(), {
      onFinish: () => reset("password")
    });
  };
  return /* @__PURE__ */ jsxs(
    AuthLayout,
    {
      title: "Confirm Password",
      description: "This is a secure area of the application. Please confirm your password before continuing.",
      children: [
        /* @__PURE__ */ jsx(Head, { title: "Confirm Password" }),
        /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-4", children: [
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
                autoFocus: true,
                onChange: (e) => setData("password", e.target.value)
              }
            ),
            errors.password && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600", children: errors.password })
          ] }),
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, className: "w-full", children: "Confirm" })
        ] })
      ]
    }
  );
}
export {
  ConfirmPassword as default
};
