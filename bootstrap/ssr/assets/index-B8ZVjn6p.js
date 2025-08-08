import { q as queryParams } from "./index-ID1znBf5.js";
const profile = (options) => ({
  url: profile.url(options),
  method: "get"
});
profile.definition = {
  methods: ["get", "head"],
  url: "/onboarding/profile"
};
profile.url = (options) => {
  return profile.definition.url + queryParams(options);
};
profile.get = (options) => ({
  url: profile.url(options),
  method: "get"
});
profile.head = (options) => ({
  url: profile.url(options),
  method: "head"
});
const plan = (options) => ({
  url: plan.url(options),
  method: "get"
});
plan.definition = {
  methods: ["get", "head"],
  url: "/onboarding/plan"
};
plan.url = (options) => {
  return plan.definition.url + queryParams(options);
};
plan.get = (options) => ({
  url: plan.url(options),
  method: "get"
});
plan.head = (options) => ({
  url: plan.url(options),
  method: "head"
});
const schedule = (options) => ({
  url: schedule.url(options),
  method: "get"
});
schedule.definition = {
  methods: ["get", "head"],
  url: "/onboarding/schedule"
};
schedule.url = (options) => {
  return schedule.definition.url + queryParams(options);
};
schedule.get = (options) => ({
  url: schedule.url(options),
  method: "get"
});
schedule.head = (options) => ({
  url: schedule.url(options),
  method: "head"
});
const stats = (options) => ({
  url: stats.url(options),
  method: "get"
});
stats.definition = {
  methods: ["get", "head"],
  url: "/onboarding/stats"
};
stats.url = (options) => {
  return stats.definition.url + queryParams(options);
};
stats.get = (options) => ({
  url: stats.url(options),
  method: "get"
});
stats.head = (options) => ({
  url: stats.url(options),
  method: "head"
});
export {
  plan as a,
  schedule as b,
  profile as p,
  stats as s
};
