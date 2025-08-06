import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { Head } from "@inertiajs/react";
function Privacy() {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Privacy Policy - Athletos" }),
    /* @__PURE__ */ jsx("div", { className: "bg-white", children: /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-4xl font-bold text-gray-900 mb-8", children: "Privacy Policy" }),
      /* @__PURE__ */ jsxs("div", { className: "prose prose-lg text-gray-700 space-y-6", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-500", children: [
          "Last updated: ",
          (/* @__PURE__ */ new Date()).toLocaleDateString()
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "Information We Collect" }),
          /* @__PURE__ */ jsx("p", { children: "We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support." }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-6 mt-4 space-y-2", children: [
            /* @__PURE__ */ jsx("li", { children: "Account information (name, email, profile details)" }),
            /* @__PURE__ */ jsx("li", { children: "Training data (workouts, progress, measurements)" }),
            /* @__PURE__ */ jsx("li", { children: "Usage information (how you interact with our platform)" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "How We Use Your Information" }),
          /* @__PURE__ */ jsx("p", { children: "We use the information we collect to:" }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-6 mt-4 space-y-2", children: [
            /* @__PURE__ */ jsx("li", { children: "Provide and improve our services" }),
            /* @__PURE__ */ jsx("li", { children: "Create personalized training plans" }),
            /* @__PURE__ */ jsx("li", { children: "Track your fitness progress" }),
            /* @__PURE__ */ jsx("li", { children: "Communicate with you about your account" }),
            /* @__PURE__ */ jsx("li", { children: "Ensure platform security" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "Information Sharing" }),
          /* @__PURE__ */ jsx("p", { children: "We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy." })
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "Data Security" }),
          /* @__PURE__ */ jsx("p", { children: "We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction." })
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "Your Rights" }),
          /* @__PURE__ */ jsx("p", { children: "You have the right to:" }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-6 mt-4 space-y-2", children: [
            /* @__PURE__ */ jsx("li", { children: "Access your personal information" }),
            /* @__PURE__ */ jsx("li", { children: "Correct inaccurate information" }),
            /* @__PURE__ */ jsx("li", { children: "Delete your account and data" }),
            /* @__PURE__ */ jsx("li", { children: "Export your data" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "Contact Us" }),
          /* @__PURE__ */ jsx("p", { children: "If you have questions about this Privacy Policy, please contact us through our support channels." })
        ] })
      ] })
    ] }) }) })
  ] });
}
export {
  Privacy as default
};
