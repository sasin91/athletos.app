/**
 * Generated route definitions for TypeScript
 * Auto-generated from Laravel routes - DO NOT EDIT MANUALLY
 */

import { router } from '@inertiajs/react';

interface RouteParams {
  [key: string]: string | number | boolean | undefined;
}

interface RouteOptions {
  method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
  data?: Record<string, any>;
  preserveState?: boolean;
  preserveScroll?: boolean;
  only?: string[];
  except?: string[];
  onFinish?: () => void;
  onSuccess?: (page: any) => void;
  onError?: (errors: any) => void;
  onStart?: () => void;
  onProgress?: (progress: any) => void;
}

interface RouteFunction {
  (params?: RouteParams, options?: RouteOptions): { url: string; method: string };
  url: (params?: RouteParams) => string;
}

// Route helper function
function createRoute(template: string, method: string = 'get') {
  const routeFunction = (params: RouteParams = {}, options: RouteOptions = {}) => {
    const url = buildUrl(template, params);
    return { url, method: options.method || method };
  };
  
  routeFunction.url = (params: RouteParams = {}) => buildUrl(template, params);
  
  return routeFunction as RouteFunction;
}

function buildUrl(template: string, params: RouteParams = {}): string {
  let url = template;
  
  // Replace route parameters
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`{${key}}`, String(value));
    url = url.replace(`{${key}?}`, value ? String(value) : '');
  });
  
  // Remove any remaining optional parameters
  url = url.replace(/\{[^}]*\?\}/g, '');
  
  return url;
}

// Generated route functions
export const route = {
  // Public routes
  home: createRoute('/'),
  terms: createRoute('/terms'),
  privacy: createRoute('/privacy'),
  about: createRoute('/about'),
  
  // Auth routes
  register: createRoute('/register'),
  login: createRoute('/login'),
  logout: createRoute('/logout', 'post'),
  'password.request': createRoute('/forgot-password'),
  'password.email': createRoute('/forgot-password', 'post'),
  'password.reset': createRoute('/reset-password/{token}'),
  'password.store': createRoute('/reset-password', 'post'),
  'password.confirm': createRoute('/confirm-password'),
  'confirmation.store': createRoute('/confirm-password', 'post'),
  'verification.notice': createRoute('/verify-email'),
  'verification.store': createRoute('/verify-email', 'post'),
  'verification.verify': createRoute('/verify-email/{id}/{hash}'),
  
  // Dashboard routes
  dashboard: createRoute('/dashboard'),
  'dashboard.start-training': createRoute('/dashboard/start-training', 'post'),
  
  // Training routes
  'trainings.index': createRoute('/trainings'),
  'trainings.store': createRoute('/trainings', 'post'),
  'trainings.show': createRoute('/trainings/{training}'),
  'trainings.complete': createRoute('/trainings/{training}/complete'),
  
  // Training Plan routes
  'training-plans.create': createRoute('/training-plans/create'),
  'training-plans.store': createRoute('/training-plans', 'post'),
  'training-plans.show': createRoute('/training-plans/{trainingPlan}'),
  'training-plans.assign': createRoute('/training-plans/{trainingPlan}/assign', 'post'),
  
  // Exercise routes
  'exercises.show': createRoute('/exercises/{exercise}'),
  
  // Chat routes
  'chat.index': createRoute('/chat'),
  'chat.session': createRoute('/chat/{session}'),
  'chat.stream.start': createRoute('/chat/stream/start', 'post'),
  'chat.stream': createRoute('/chat/stream/{streamId}'),
  
  // Onboarding routes
  'onboarding.profile': createRoute('/onboarding/profile'),
  'onboarding.profile.store': createRoute('/onboarding/profile', 'post'),
  'onboarding.plan': createRoute('/onboarding/plan'),
  'onboarding.plan.store': createRoute('/onboarding/plan', 'post'),
  'onboarding.schedule': createRoute('/onboarding/schedule'),
  'onboarding.schedule.store': createRoute('/onboarding/schedule', 'post'),
  'onboarding.stats': createRoute('/onboarding/stats'),
  'onboarding.stats.store': createRoute('/onboarding/stats', 'post'),
  'onboarding.preferences': createRoute('/onboarding/preferences'),
  'onboarding.preferences.store': createRoute('/onboarding/preferences', 'post'),
  
  // Settings routes
  'settings.profile.edit': createRoute('/settings/profile'),
  'settings.profile.update': createRoute('/settings/profile', 'put'),
  'settings.profile.destroy': createRoute('/settings/profile', 'delete'),
  'settings.password.edit': createRoute('/settings/password'),
  'settings.password.update': createRoute('/settings/password', 'put'),
  'settings.appearance.edit': createRoute('/settings/appearance'),
  'settings.athlete-profile.edit': createRoute('/settings/athlete-profile'),
  'settings.athlete-profile.update': createRoute('/settings/athlete-profile', 'put'),
};

// Convenience function for legacy compatibility
export default function wayfinder(name: string, params?: RouteParams, options?: RouteOptions) {
  const routeFunc = route[name as keyof typeof route];
  if (!routeFunc) {
    throw new Error(`Route "${name}" not found`);
  }
  return routeFunc(params, options);
}

// Export individual route functions for better tree-shaking
export const {
  home,
  terms,
  privacy,
  about,
  register,
  login,
  logout,
  dashboard,
} = route;

// Compatibility layer for old routes API
export const routes = {
  dashboard: (params?: any, options?: any) => {
    const { url } = route.dashboard(params, options);
    // For compatibility with Inertia, trigger the navigation
    if (typeof window !== 'undefined') {
      if (params?.date) {
        return router.get(url, { date: params.date }, options);
      } else {
        return router.get(url, options?.data || {}, options);
      }
    }
  },
  
  startTraining: (data: any, options?: any) => {
    const { url } = route['dashboard.start-training']({}, { method: 'post' });
    if (typeof window !== 'undefined') {
      return router.post(url, data, options);
    }
  },
  
  progress: (options?: any) => {
    // Assuming progress maps to dashboard with progress view
    if (typeof window !== 'undefined') {
      return router.get('/progress', {}, options);
    }
  },
  
  chat: (options?: any) => {
    const { url } = route['chat.index']();
    if (typeof window !== 'undefined') {
      return router.get(url, {}, options);
    }
  },
  
  calendar: (options?: any) => {
    if (typeof window !== 'undefined') {
      return router.get('/calendar', {}, options);
    }
  },
};