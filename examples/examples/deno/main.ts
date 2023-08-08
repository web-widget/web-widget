// @ts-ignore
import type { ConnInfo } from "https://deno.land/std@0.196.0/http/mod.ts";
// @ts-ignore
import { Server } from "https://deno.land/std@0.196.0/http/mod.ts";
// @ts-ignore
import staticFiles from "https://deno.land/x/static_files@1.1.6/mod.ts";

// @ts-ignore
import WebRouter from "./dist/web-router.js";
// @ts-ignore
import routemap from "../dist/server/routemap.js";

const webRouter = new WebRouter(routemap, {
  baseAsset: "http://localhost:4505/",
  baseModule: new URL("../dist/server/", import.meta.url),
});

const serveFiles = (req: Request) =>
  staticFiles("../dist/client")({
    request: req,
    respondWith: (r: Response) => r,
  });

const port = 4505;
const server = new Server({
  port,
  handler: async (request: Request, connInfo: ConnInfo) => {
    if (new URL(request.url).pathname.startsWith("/assets")) {
      return serveFiles(request);
    }

    return webRouter.handler(request, connInfo);
  },
});

console.log(`server listening on http://localhost:${port}`);

server.listenAndServe();
