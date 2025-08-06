import { jsxs, jsx } from "react/jsx-runtime";
import { A as AppLogoIcon } from "./app-logo-icon-wMAVxvx3.js";
import { Link } from "@inertiajs/react";
import { h as home } from "./index-CrXrSpq1.js";
function AuthSimpleLayout({ children, title, description }) {
  return /* @__PURE__ */ jsxs("div", { className: "relative flex min-h-svh flex-col items-center justify-center gap-6 bg-white dark:bg-gray-900 p-6 md:p-10", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) }),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) }),
    /* @__PURE__ */ jsx("div", { className: "relative w-full max-w-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-4", children: [
        /* @__PURE__ */ jsxs(Link, { href: home.url(), className: "flex flex-col items-center gap-2 font-medium", children: [
          /* @__PURE__ */ jsx("div", { className: "mb-1 flex h-9 w-9 items-center justify-center rounded-md", children: /* @__PURE__ */ jsx(AppLogoIcon, { className: "size-9 fill-current text-[var(--foreground)]" }) }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: title })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-center", children: [
          /* @__PURE__ */ jsx("h1", { className: "text-xl font-medium", children: title }),
          /* @__PURE__ */ jsx("p", { className: "text-center text-sm text-muted-foreground", children: description })
        ] })
      ] }),
      children
    ] }) })
  ] });
}
function AuthLayout({ children, title, description, ...props }) {
  return /* @__PURE__ */ jsx(AuthSimpleLayout, { title, description, ...props, children });
}
export {
  AuthLayout as A
};
