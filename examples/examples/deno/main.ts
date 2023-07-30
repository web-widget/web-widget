import { Server, ConnInfo } from "https://deno.land/std@0.196.0/http/mod.ts";
import staticFiles from "https://deno.land/x/static_files@1.1.6/mod.ts";

import WebRouter from "./dist/web-router.js";

const webRouter = new WebRouter(
  new URL("../dist/server/routemap.json", import.meta.url),
  {
    client: {
      base: "/",
    },
  }
);

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
