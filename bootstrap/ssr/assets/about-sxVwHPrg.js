import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { Head, Link } from "@inertiajs/react";
function About() {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Head, { title: "About Athletos" }),
    /* @__PURE__ */ jsx("div", { className: "bg-white", children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-4xl font-bold text-gray-900 sm:text-5xl", children: "About Athletos" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 text-xl text-gray-600", children: "Your AI-powered training companion" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-12 prose prose-lg mx-auto text-gray-700", children: [
        /* @__PURE__ */ jsx("p", { children: "Athletos is an innovative fitness platform that combines artificial intelligence with proven training methodologies to deliver personalized workout experiences tailored to your unique goals, preferences, and progress." }),
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mt-8 mb-4", children: "Our Mission" }),
        /* @__PURE__ */ jsx("p", { children: "We believe that everyone deserves access to expert-level training guidance. Our AI-powered platform democratizes personal training by providing intelligent, adaptive workout plans that evolve with your fitness journey." }),
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mt-8 mb-4", children: "Key Features" }),
        /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-6 space-y-2", children: [
          /* @__PURE__ */ jsx("li", { children: "Personalized training plans that adapt to your progress" }),
          /* @__PURE__ */ jsx("li", { children: "Real-time form analysis and correction" }),
          /* @__PURE__ */ jsx("li", { children: "24/7 AI coaching support" }),
          /* @__PURE__ */ jsx("li", { children: "Comprehensive progress tracking" }),
          /* @__PURE__ */ jsx("li", { children: "Evidence-based exercise programming" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-12 text-center", children: /* @__PURE__ */ jsx(
          Link,
          {
            href: "/register",
            className: "inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700",
            children: "Start Your Journey"
          }
        ) })
      ] })
    ] }) }) })
  ] });
}
export {
  About as default
};
