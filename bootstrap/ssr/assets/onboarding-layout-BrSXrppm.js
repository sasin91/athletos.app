import { jsx, jsxs } from "react/jsx-runtime";
import { B as Button } from "./button-hAi0Fg-Q.js";
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuItem } from "./dropdown-menu-BtKPamvc.js";
import { useState, useCallback, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
const prefersDark = () => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};
const setCookie = (name, value, days = 365) => {
  if (typeof document === "undefined") {
    return;
  }
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};
const applyTheme = (appearance) => {
  const isDark = appearance === "dark" || appearance === "system" && prefersDark();
  document.documentElement.classList.toggle("dark", isDark);
};
const mediaQuery = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.matchMedia("(prefers-color-scheme: dark)");
};
const handleSystemThemeChange = () => {
  const currentAppearance = localStorage.getItem("appearance");
  applyTheme(currentAppearance || "system");
};
function useAppearance() {
  const [appearance, setAppearance] = useState("system");
  const updateAppearance = useCallback((mode) => {
    setAppearance(mode);
    localStorage.setItem("appearance", mode);
    setCookie("appearance", mode);
    applyTheme(mode);
  }, []);
  useEffect(() => {
    const savedAppearance = localStorage.getItem("appearance");
    updateAppearance(savedAppearance || "system");
    return () => {
      var _a;
      return (_a = mediaQuery()) == null ? void 0 : _a.removeEventListener("change", handleSystemThemeChange);
    };
  }, [updateAppearance]);
  return { appearance, updateAppearance };
}
function AppearanceToggleDropdown({ className = "", ...props }) {
  const { appearance, updateAppearance } = useAppearance();
  const getCurrentIcon = () => {
    switch (appearance) {
      case "dark":
        return /* @__PURE__ */ jsx(Moon, { className: "h-5 w-5" });
      case "light":
        return /* @__PURE__ */ jsx(Sun, { className: "h-5 w-5" });
      default:
        return /* @__PURE__ */ jsx(Monitor, { className: "h-5 w-5" });
    }
  };
  return /* @__PURE__ */ jsx("div", { className, ...props, children: /* @__PURE__ */ jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "icon", className: "h-9 w-9 rounded-md", children: [
      getCurrentIcon(),
      /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Toggle theme" })
    ] }) }),
    /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", children: [
      /* @__PURE__ */ jsx(DropdownMenuItem, { onClick: () => updateAppearance("light"), children: /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Sun, { className: "h-5 w-5" }),
        "Light"
      ] }) }),
      /* @__PURE__ */ jsx(DropdownMenuItem, { onClick: () => updateAppearance("dark"), children: /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Moon, { className: "h-5 w-5" }),
        "Dark"
      ] }) }),
      /* @__PURE__ */ jsx(DropdownMenuItem, { onClick: () => updateAppearance("system"), children: /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Monitor, { className: "h-5 w-5" }),
        "System"
      ] }) })
    ] })
  ] }) });
}
function OnboardingLayout({ children, title }) {
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-white dark:bg-gray-900", children: /* @__PURE__ */ jsxs("div", { className: "relative isolate min-h-screen", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) }),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) }),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 top-1/2 -z-10 flex -translate-y-1/2 transform-gpu justify-center overflow-hidden blur-3xl sm:top-auto sm:right-[calc(50%-6rem)] sm:bottom-0 sm:translate-y-0 sm:transform-gpu sm:justify-end", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-25", style: { clipPath: "polygon(73.6% 48.6%, 91.7% 88.5%, 100% 53.9%, 97.4% 18.1%, 92.5% 15.4%, 75.7% 36.3%, 55.3% 52.8%, 46.5% 50.9%, 45% 37.4%, 50.3% 13.1%, 21.3% 36.2%, 0.1% 0.1%, 5.4% 49.1%, 21.4% 36.4%, 58.9% 100%, 73.6% 48.6%)" } }) }),
    /* @__PURE__ */ jsx("div", { className: "absolute top-full right-0 left-1/2 -z-10 hidden -translate-y-1/2 transform-gpu overflow-hidden blur-3xl sm:block", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30", style: { clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" } }) }),
    /* @__PURE__ */ jsx("div", { className: "absolute top-4 right-4 z-50", children: /* @__PURE__ */ jsx(AppearanceToggleDropdown, {}) }),
    title && /* @__PURE__ */ jsx("div", { className: "relative pt-16 pb-4", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-3xl px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent text-center", children: title }) }) }),
    children
  ] }) });
}
export {
  OnboardingLayout as O
};
