import { jsxs, jsx } from "react/jsx-runtime";
import { useForm, Head, Link } from "@inertiajs/react";
import { A as AuthLayout } from "./auth-layout-C2gqtMIU.js";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { a as logout } from "./index-CrXrSpq1.js";
import "./app-logo-icon-wMAVxvx3.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "./index-ID1znBf5.js";
const verification = {};
function VerifyEmail({ status }) {
  const { post, processing } = useForm({});
  const submit = (e) => {
    e.preventDefault();
    post(verification.send.url());
  };
  return /* @__PURE__ */ jsxs(
    AuthLayout,
    {
      title: "Verify Your Email",
      description: "Thanks for signing up! Before getting started, could you verify your email address by clicking on the link we just emailed to you?",
      children: [
        /* @__PURE__ */ jsx(Head, { title: "Email Verification" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          status === "verification-link-sent" && /* @__PURE__ */ jsx("div", { className: "rounded-md bg-green-50 p-4 text-sm text-green-600", children: "A new verification link has been sent to the email address you provided during registration." }),
          /* @__PURE__ */ jsx("form", { onSubmit: submit, className: "space-y-4", children: /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, className: "w-full", children: "Resend Verification Email" }) }),
          /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsx(
            Link,
            {
              href: logout.url(),
              method: "post",
              as: "button",
              className: "text-sm text-muted-foreground hover:text-foreground underline",
              children: "Log Out"
            }
          ) })
        ] })
      ]
    }
  );
}
export {
  VerifyEmail as default
};
