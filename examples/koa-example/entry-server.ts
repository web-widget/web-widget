import server from "@web-widget/web-server";
import * as manifest from "./web-server.gen.ts";

const router = server(manifest);

export async function render(request: Request, viteManifest: any) {
  const res = await router.handler(request);
  return res;
}