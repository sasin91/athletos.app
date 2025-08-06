import { q as queryParams } from "./index-ID1znBf5.js";
const update$2 = (options) => ({
  url: update$2.url(options),
  method: "put"
});
update$2.definition = {
  methods: ["put"],
  url: "/settings/athlete-profile"
};
update$2.url = (options) => {
  return update$2.definition.url + queryParams(options);
};
update$2.put = (options) => ({
  url: update$2.url(options),
  method: "put"
});
const athleteProfile = {
  update: update$2
};
const edit = (options) => ({
  url: edit.url(options),
  method: "get"
});
edit.definition = {
  methods: ["get", "head"],
  url: "/settings/profile"
};
edit.url = (options) => {
  return edit.definition.url + queryParams(options);
};
edit.get = (options) => ({
  url: edit.url(options),
  method: "get"
});
edit.head = (options) => ({
  url: edit.url(options),
  method: "head"
});
const update$1 = (options) => ({
  url: update$1.url(options),
  method: "put"
});
update$1.definition = {
  methods: ["put", "patch"],
  url: "/settings/profile"
};
update$1.url = (options) => {
  return update$1.definition.url + queryParams(options);
};
update$1.put = (options) => ({
  url: update$1.url(options),
  method: "put"
});
update$1.patch = (options) => ({
  url: update$1.url(options),
  method: "patch"
});
const destroy = (options) => ({
  url: destroy.url(options),
  method: "delete"
});
destroy.definition = {
  methods: ["delete"],
  url: "/settings/profile"
};
destroy.url = (options) => {
  return destroy.definition.url + queryParams(options);
};
destroy.delete = (options) => ({
  url: destroy.url(options),
  method: "delete"
});
const profile = {
  edit,
  update: update$1,
  destroy
};
const update = (options) => ({
  url: update.url(options),
  method: "put"
});
update.definition = {
  methods: ["put"],
  url: "/settings/password"
};
update.url = (options) => {
  return update.definition.url + queryParams(options);
};
update.put = (options) => ({
  url: update.url(options),
  method: "put"
});
const password = {
  update
};
const settings = {
  athleteProfile,
  profile,
  password
};
export {
  settings as s
};
