import { jsx, jsxs } from "react/jsx-runtime";
import { c as cn, B as Button } from "./button-hAi0Fg-Q.js";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { Link } from "@inertiajs/react";
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    SeparatorPrimitive.Root,
    {
      "data-slot": "separator-root",
      decorative,
      orientation,
      className: cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      ),
      ...props
    }
  );
}
function Heading({ title, description }) {
  return /* @__PURE__ */ jsxs("div", { className: "mb-8 space-y-0.5", children: [
    /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold tracking-tight", children: title }),
    description && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: description })
  ] });
}
const sidebarNavItems = [
  {
    title: "Profile",
    href: "/settings/profile",
    icon: null
  },
  {
    title: "Password",
    href: "/settings/password",
    icon: null
  },
  {
    title: "Appearance",
    href: "/settings/appearance",
    icon: null
  }
];
function SettingsLayout({ children }) {
  if (typeof window === "undefined") {
    return null;
  }
  const currentPath = window.location.pathname;
  return /* @__PURE__ */ jsxs("div", { className: "relative px-4 py-6 bg-white dark:bg-gray-900 min-h-screen", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) }),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) }),
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx(Heading, { title: "Settings", description: "Manage your profile and account settings" }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12", children: [
        /* @__PURE__ */ jsx("aside", { className: "w-full max-w-xl lg:w-48", children: /* @__PURE__ */ jsx("nav", { className: "flex flex-col space-y-1 space-x-0", children: sidebarNavItems.map((item, index) => /* @__PURE__ */ jsx(
          Button,
          {
            size: "sm",
            variant: "ghost",
            asChild: true,
            className: cn("w-full justify-start", {
              "bg-muted": currentPath === item.href
            }),
            children: /* @__PURE__ */ jsx(Link, { href: item.href, prefetch: true, children: item.title })
          },
          `${item.href}-${index}`
        )) }) }),
        /* @__PURE__ */ jsx(Separator, { className: "my-6 md:hidden" }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 md:max-w-2xl", children: /* @__PURE__ */ jsx("section", { className: "max-w-xl space-y-12", children }) })
      ] })
    ] })
  ] });
}
export {
  SettingsLayout as S
};
