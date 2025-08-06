import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { Head } from "@inertiajs/react";
function Terms() {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Head, { title: "Terms of Service - Athletos" }),
    /* @__PURE__ */ jsx("div", { className: "bg-white", children: /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-4xl font-bold text-gray-900 mb-8", children: "Terms of Service" }),
      /* @__PURE__ */ jsxs("div", { className: "prose prose-lg text-gray-700 space-y-6", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-500", children: [
          "Last updated: ",
          (/* @__PURE__ */ new Date()).toLocaleDateString()
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "1. Acceptance of Terms" }),
          /* @__PURE__ */ jsx("p", { children: "By accessing and using Athletos, you accept and agree to be bound by the terms and provision of this agreement." })
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "2. Use License" }),
          /* @__PURE__ */ jsx("p", { children: "Permission is granted to temporarily use Athletos for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title." })
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "3. Health and Safety" }),
          /* @__PURE__ */ jsx("p", { children: "Athletos provides fitness guidance and training plans. Always consult with a healthcare professional before beginning any exercise program. Use of our platform is at your own risk." })
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "4. Privacy" }),
          /* @__PURE__ */ jsx("p", { children: "Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the platform." })
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "5. Modifications" }),
          /* @__PURE__ */ jsx("p", { children: "Athletos may revise these terms of service at any time without notice. By using this platform, you are agreeing to be bound by the then current version of these terms of service." })
        ] }),
        /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "6. Contact Information" }),
          /* @__PURE__ */ jsx("p", { children: "If you have any questions about these Terms of Service, please contact us through our support channels." })
        ] })
      ] })
    ] }) }) })
  ] });
}
export {
  Terms as default
};
