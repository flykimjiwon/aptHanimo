const query = new URLSearchParams(location.search);
const legacy = [
  "character",
  "building",
  "map",
  "view",
  "mode",
  "party",
  "layer",
  "room",
  "legacy",
].some((key) => query.has(key));
if (legacy) void import("./main");
else void import("./village/main");
