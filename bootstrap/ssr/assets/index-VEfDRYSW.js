import { q as queryParams } from "./index-ID1znBf5.js";
const store = (options) => ({
  url: store.url(options),
  method: "post"
});
store.definition = {
  methods: ["post"],
  url: "/training-plans"
};
store.url = (options) => {
  return store.definition.url + queryParams(options);
};
store.post = (options) => ({
  url: store.url(options),
  method: "post"
});
const assign = (args, options) => ({
  url: assign.url(args, options),
  method: "post"
});
assign.definition = {
  methods: ["post"],
  url: "/training-plans/{trainingPlan}/assign"
};
assign.url = (args, options) => {
  if (typeof args === "string" || typeof args === "number") {
    args = { trainingPlan: args };
  }
  if (typeof args === "object" && !Array.isArray(args) && "id" in args) {
    args = { trainingPlan: args.id };
  }
  if (Array.isArray(args)) {
    args = {
      trainingPlan: args[0]
    };
  }
  const parsedArgs = {
    trainingPlan: typeof args.trainingPlan === "object" ? args.trainingPlan.id : args.trainingPlan
  };
  return assign.definition.url.replace("{trainingPlan}", parsedArgs.trainingPlan.toString()).replace(/\/+$/, "") + queryParams(options);
};
assign.post = (args, options) => ({
  url: assign.url(args, options),
  method: "post"
});
const trainingPlans = {
  store,
  assign
};
export {
  trainingPlans as t
};
