import { q as queryParams } from "./index-ID1znBf5.js";
const home = (options) => ({
  url: home.url(options),
  method: "get"
});
home.definition = {
  methods: ["get", "head"],
  url: "/"
};
home.url = (options) => {
  return home.definition.url + queryParams(options);
};
home.get = (options) => ({
  url: home.url(options),
  method: "get"
});
home.head = (options) => ({
  url: home.url(options),
  method: "head"
});
const dashboard = (options) => ({
  url: dashboard.url(options),
  method: "get"
});
dashboard.definition = {
  methods: ["get", "head"],
  url: "/dashboard"
};
dashboard.url = (options) => {
  return dashboard.definition.url + queryParams(options);
};
dashboard.get = (options) => ({
  url: dashboard.url(options),
  method: "get"
});
dashboard.head = (options) => ({
  url: dashboard.url(options),
  method: "head"
});
const register = (options) => ({
  url: register.url(options),
  method: "get"
});
register.definition = {
  methods: ["get", "head"],
  url: "/register"
};
register.url = (options) => {
  return register.definition.url + queryParams(options);
};
register.get = (options) => ({
  url: register.url(options),
  method: "get"
});
register.head = (options) => ({
  url: register.url(options),
  method: "head"
});
const login = (options) => ({
  url: login.url(options),
  method: "get"
});
login.definition = {
  methods: ["get", "head"],
  url: "/login"
};
login.url = (options) => {
  return login.definition.url + queryParams(options);
};
login.get = (options) => ({
  url: login.url(options),
  method: "get"
});
login.head = (options) => ({
  url: login.url(options),
  method: "head"
});
const logout = (options) => ({
  url: logout.url(options),
  method: "post"
});
logout.definition = {
  methods: ["post"],
  url: "/logout"
};
logout.url = (options) => {
  return logout.definition.url + queryParams(options);
};
logout.post = (options) => ({
  url: logout.url(options),
  method: "post"
});
export {
  logout as a,
  dashboard as d,
  home as h,
  login as l,
  register as r
};
