import { jsxs, jsx } from "react/jsx-runtime";
import { Head } from "@inertiajs/react";
import { useState, useEffect } from "react";
import { S as SettingsLayout } from "./settings-layout-DvcHR2Gt.js";
import "./button-hAi0Fg-Q.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-separator";
function Appearance() {
  const [currentTheme, setCurrentTheme] = useState("system");
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "system";
    setCurrentTheme(savedTheme);
  }, []);
  const setAppearance = (theme) => {
    setCurrentTheme(theme);
    if (theme === "system") {
      localStorage.removeItem("theme");
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      localStorage.setItem("theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };
  const themeOptions = [
    { value: "light", label: "Light", description: "Always use light mode" },
    { value: "dark", label: "Dark", description: "Always use dark mode" },
    { value: "system", label: "System", description: "Follow system preference" }
  ];
  return /* @__PURE__ */ jsxs(SettingsLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Appearance Settings - Athletos" }),
    /* @__PURE__ */ jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6", children: /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: "Appearance" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: "Update the appearance settings for your account" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3", children: "Theme" }),
          /* @__PURE__ */ jsx("div", { className: "space-y-3", children: themeOptions.map((option) => /* @__PURE__ */ jsxs(
            "label",
            {
              className: `relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${currentTheme === option.value ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600"}`,
              children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "radio",
                    name: "theme",
                    value: option.value,
                    checked: currentTheme === option.value,
                    onChange: () => setAppearance(option.value),
                    className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "ml-4", children: [
                  /* @__PURE__ */ jsx("div", { className: "text-base font-medium text-gray-900 dark:text-gray-100", children: option.label }),
                  /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: option.description })
                ] })
              ]
            },
            option.value
          )) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg", children: /* @__PURE__ */ jsxs("p", { className: "text-sm text-blue-800 dark:text-blue-200", children: [
          /* @__PURE__ */ jsx("strong", { children: "Note:" }),
          " Theme changes are applied immediately and saved to your browser. The system option will automatically switch between light and dark modes based on your device settings."
        ] }) })
      ] })
    ] }) })
  ] });
}
export {
  Appearance as default
};
