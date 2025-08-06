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
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, /* @__PURE__ */ Object.assign({ "./pages/about.tsx": () => import("./assets/about-sxVwHPrg.js"), "./pages/auth/confirm-password.tsx": () => import("./assets/confirm-password-B3fxMSz9.js"), "./pages/auth/forgot-password.tsx": () => import("./assets/forgot-password-QPOrYlka.js"), "./pages/auth/login.tsx": () => import("./assets/login-BgCUyDj-.js"), "./pages/auth/register.tsx": () => import("./assets/register-D9PJ3tDZ.js"), "./pages/auth/reset-password.tsx": () => import("./assets/reset-password-BHoAsxkV.js"), "./pages/auth/verify-email.tsx": () => import("./assets/verify-email-BWWuwq8t.js"), "./pages/chat.tsx": () => import("./assets/chat-CWmWPQr7.js"), "./pages/dashboard.tsx": () => import("./assets/dashboard-C4NSqMej.js"), "./pages/exercises/show.tsx": () => import("./assets/show-CM7kqyN6.js"), "./pages/onboarding/plan.tsx": () => import("./assets/plan-Cd5NmwAR.js"), "./pages/onboarding/preferences.tsx": () => import("./assets/preferences-UQeAgY-m.js"), "./pages/onboarding/profile.tsx": () => import("./assets/profile-DUoKNo0y.js"), "./pages/onboarding/schedule.tsx": () => import("./assets/schedule-DOF_txYo.js"), "./pages/onboarding/stats.tsx": () => import("./assets/stats-DGhFTpqA.js"), "./pages/privacy.tsx": () => import("./assets/privacy-Dl39q5l8.js"), "./pages/settings/appearance.tsx": () => import("./assets/appearance-CMNdKvUF.js"), "./pages/settings/athlete-profile.tsx": () => import("./assets/athlete-profile-BXyon5Ff.js"), "./pages/settings/password.tsx": () => import("./assets/password-DW9WGLPS.js"), "./pages/settings/profile.tsx": () => import("./assets/profile-DFCqQo7d.js"), "./pages/terms.tsx": () => import("./assets/terms-CcozOrR6.js"), "./pages/training-plans/create.tsx": () => import("./assets/create-DMKd5i7i.js"), "./pages/training-plans/show.tsx": () => import("./assets/show-B-Nlc57D.js"), "./pages/training.tsx": () => import("./assets/training-DUIQjfB2.js"), "./pages/trainings/complete.tsx": () => import("./assets/complete-nm5biqpK.js"), "./pages/trainings/index.tsx": () => import("./assets/index-CeCPiCCp.js"), "./pages/welcome.tsx": () => import("./assets/welcome-Bk3h0cLD.js") })),
    setup: ({ App, props }) => {
      return /* @__PURE__ */ jsx(App, { ...props });
    }
  })
);
