import { Miniflare, Log, LogLevel } from "miniflare";

// Create a new Miniflare instance, starting a workerd server
const mf = new Miniflare({
  modulesRoot: "../dist/srver/",
  scriptPath: "./worker.js",
  modules: [{ type: "ESModule", path: "./worker.js" }],
  port: 8787,
  liveReload: true,
  log: new Log(LogLevel.DEBUG),
  bindings: {},
});

// Send a request to the workerd server, the host is ignored
const response = await mf.dispatchFetch("http://localhost:8787/");
console.log(await response.text()); // Hello Miniflare!

// Cleanup Miniflare, shutting down the workerd server
// await mf.dispose();
