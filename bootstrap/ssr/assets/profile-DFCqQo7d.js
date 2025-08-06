import { jsxs, jsx } from "react/jsx-runtime";
import { useForm, Head } from "@inertiajs/react";
import { useState } from "react";
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
function Profile({ user }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { data, setData, put, processing, errors, reset } = useForm({
    name: user.name,
    email: user.email
  });
  const { delete: deleteAccount, processing: deleteProcessing } = useForm();
  const submit = (e) => {
    e.preventDefault();
    put(settings.profile.update.url(), {
      onSuccess: () => {
      }
    });
  };
  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      deleteAccount(settings.profile.destroy.url());
    }
  };
  return /* @__PURE__ */ jsxs(SettingsLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Profile Settings - Athletos" }),
    /* @__PURE__ */ jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6", children: /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: "Profile Information" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: "Update your name and email address" })
      ] }),
      /* @__PURE__ */ jsxs("form", { className: "max-w-md mb-10", onSubmit: submit, children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "name", className: "mb-2", children: "Name" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "text",
              id: "name",
              name: "name",
              value: data.name,
              onChange: (e) => setData("name", e.target.value),
              required: true
            }
          ),
          errors.name && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.name })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "email", className: "mb-2", children: "Email" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "email",
              id: "email",
              name: "email",
              value: data.email,
              onChange: (e) => setData("email", e.target.value),
              required: true
            }
          ),
          errors.email && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.email })
        ] }),
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
          Button,
          {
            type: "submit",
            disabled: processing,
            children: processing ? "Saving..." : "Save"
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "border-t border-gray-200 dark:border-gray-700 pt-6 mt-6", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-gray-800 dark:text-gray-200 mb-1", children: "Delete Account" }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 dark:text-gray-400 mb-4", children: "Delete your account and all of its resources. This action cannot be undone." }),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "button",
            variant: "destructive",
            onClick: handleDeleteAccount,
            disabled: deleteProcessing,
            children: deleteProcessing ? "Deleting..." : "Delete Account"
          }
        )
      ] })
    ] }) })
  ] });
}
export {
  Profile as default
};
