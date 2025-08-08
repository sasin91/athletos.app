import { jsx } from "react/jsx-runtime";
import { createInertiaApp } from "@inertiajs/react";
import createServer from "@inertiajs/react/server";
import ReactDOMServer from "react-dom/server";
async function resolvePageComponent(path, pages) {
  for (const p of Array.isArray(path) ? path : [path]) {
    const page = pages[p];
    if (typeof page === "undefined") {
      continue;
    }
    return typeof page === "function" ? page() : page;
  }
  throw new Error(`Page not found: ${path}`);
}
const appName = "Laravel";
createServer(
  (page) => createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    title: (title) => title ? `${title} - ${appName}` : appName,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, /* @__PURE__ */ Object.assign({ "./pages/about.tsx": () => import("./assets/about-sxVwHPrg.js"), "./pages/auth/confirm-password.tsx": () => import("./assets/confirm-password-BzIdNqrI.js"), "./pages/auth/forgot-password.tsx": () => import("./assets/forgot-password-DkYvmGwI.js"), "./pages/auth/login.tsx": () => import("./assets/login--mdpZMT3.js"), "./pages/auth/register.tsx": () => import("./assets/register-c6BLMlhs.js"), "./pages/auth/reset-password.tsx": () => import("./assets/reset-password-DXlErQPE.js"), "./pages/auth/verify-email.tsx": () => import("./assets/verify-email-B21SsgHE.js"), "./pages/chat.tsx": () => import("./assets/chat-CitBn7kU.js"), "./pages/dashboard.tsx": () => import("./assets/dashboard-Ck8hrxpU.js"), "./pages/exercises/show.tsx": () => import("./assets/show-DzI6jViV.js"), "./pages/onboarding/plan.tsx": () => import("./assets/plan-CmIs0LCz.js"), "./pages/onboarding/preferences.tsx": () => import("./assets/preferences-C6np7av6.js"), "./pages/onboarding/profile.tsx": () => import("./assets/profile-DUoKNo0y.js"), "./pages/onboarding/schedule.tsx": () => import("./assets/schedule-D-oGGf7s.js"), "./pages/onboarding/stats.tsx": () => import("./assets/stats-CRxApkwY.js"), "./pages/privacy.tsx": () => import("./assets/privacy-Dl39q5l8.js"), "./pages/settings/appearance.tsx": () => import("./assets/appearance-CMNdKvUF.js"), "./pages/settings/athlete-profile.tsx": () => import("./assets/athlete-profile-BXyon5Ff.js"), "./pages/settings/password.tsx": () => import("./assets/password-DW9WGLPS.js"), "./pages/settings/profile.tsx": () => import("./assets/profile-DFCqQo7d.js"), "./pages/terms.tsx": () => import("./assets/terms-CcozOrR6.js"), "./pages/training-plans/create.tsx": () => import("./assets/create-xAwip95e.js"), "./pages/training-plans/show.tsx": () => import("./assets/show-9SnA5KY1.js"), "./pages/training.tsx": () => import("./assets/training-CvtE2U5i.js"), "./pages/trainings/complete.tsx": () => import("./assets/complete-CE0F0bDu.js"), "./pages/trainings/index.tsx": () => import("./assets/index-cMmoCLBZ.js"), "./pages/welcome.tsx": () => import("./assets/welcome-B-ezo8V7.js") })),
    setup: ({ App, props }) => {
      return /* @__PURE__ */ jsx(App, { ...props });
    }
  })
);
