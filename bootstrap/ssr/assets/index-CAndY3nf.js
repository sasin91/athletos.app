import { q as queryParams } from "./index-ID1znBf5.js";
const request = (options) => ({
  url: request.url(options),
  method: "get"
});
request.definition = {
  methods: ["get", "head"],
  url: "/forgot-password"
};
request.url = (options) => {
  return request.definition.url + queryParams(options);
};
request.get = (options) => ({
  url: request.url(options),
  method: "get"
});
request.head = (options) => ({
  url: request.url(options),
  method: "head"
});
const email = (options) => ({
  url: email.url(options),
  method: "post"
});
email.definition = {
  methods: ["post"],
  url: "/forgot-password"
};
email.url = (options) => {
  return email.definition.url + queryParams(options);
};
email.post = (options) => ({
  url: email.url(options),
  method: "post"
});
const store = (options) => ({
  url: store.url(options),
  method: "post"
});
store.definition = {
  methods: ["post"],
  url: "/reset-password"
};
store.url = (options) => {
  return store.definition.url + queryParams(options);
};
store.post = (options) => ({
  url: store.url(options),
  method: "post"
});
const confirm = (options) => ({
  url: confirm.url(options),
  method: "get"
});
confirm.definition = {
  methods: ["get", "head"],
  url: "/confirm-password"
};
confirm.url = (options) => {
  return confirm.definition.url + queryParams(options);
};
confirm.get = (options) => ({
  url: confirm.url(options),
  method: "get"
});
confirm.head = (options) => ({
  url: confirm.url(options),
  method: "head"
});
const password = {
  request,
  email,
  store,
  confirm
};
export {
  password as p
};
