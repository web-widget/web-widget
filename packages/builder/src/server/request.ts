import { createWebRequest } from "@web-widget/express";
import { getAssets } from "../core/render";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Connect, ViteDevServer } from "vite";
import type { ModuleLoader } from "../core/loader/index";
import type { ServerResponse } from "node:http";
import WebServer from "@web-widget/web-server";

export async function handleRequest(
  manifestUrl: string,
  viteServer: ViteDevServer,
  loader: ModuleLoader,
  req: Connect.IncomingMessage,
  res: ServerResponse
) {
  const url = req.url || "";

  const router = new WebServer(manifestUrl, {
    loader: loader.import,
    async render(ctx, render) {
      const dir = pathToFileURL(join(viteServer.config.root, "/"));
      const routeFile = new URL(ctx.source, dir);
      const assets = await getAssets(
        routeFile,
        loader,
        pathToFileURL(viteServer.config.root),
        "development"
      );

      ctx.meta.style = [];
      ctx.meta.link = [];
      ctx.meta.script = [];

      assets.styles.forEach(({ props, children }) => {
        // @ts-ignore
        ctx.meta.style.push({
          ...props,
          content: children,
        });
      });
      assets.links.forEach(({ props, children }) => {
        // @ts-ignore
        ctx.meta.link.push(props);
      });
      assets.scripts.forEach(({ props, children }) => {
        // @ts-ignore
        ctx.meta.script.push({
          ...props,
          content: children,
        });
      });

      await render();
    },
  });
  const nodeRequest =
    url === req.originalUrl
      ? req
      : new Proxy(req, {
          get(target, key) {
            if (key === "url") {
              return Reflect.get(target, "originalUrl");
            } else {
              return Reflect.get(target, key);
            }
          },
        });

  const webRequest = createWebRequest(nodeRequest, res);
  const webResponse = await router.handler(webRequest);
  const html = await webResponse.text();
  const viteHtml = await viteServer.transformIndexHtml(
    url,
    html,
    req.originalUrl
  );

  res.statusMessage = webResponse.statusText;
  res.statusCode = webResponse.status;

  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  res.end(viteHtml);
}
