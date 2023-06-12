import server from "@web-widget/web-server";
import * as routerManifest from "./web-server.gen.ts";

const router = server(routerManifest);

export async function render(request: Request, viteManifest: any) {
  return router.handler(request);
}