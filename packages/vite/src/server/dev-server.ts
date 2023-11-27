import type { Middleware } from "@web-widget/node";
import NodeAdapter from "@web-widget/node";
import type { RouteModule } from "@web-widget/schema";
import type { ManifestJSON, ManifestResolved } from "@web-widget/web-router";
import path from "node:path";
import url from "node:url";
import stripAnsi from "strip-ansi";
import type { Plugin, ViteDevServer } from "vite";
import type { ResolvedBuilderConfig, ServerEntryModule } from "../types";
import { createViteLoader } from "./loader/index";
import { getMeta } from "./render";
import clickToComponent from "./click-to-source";

export function webRouterDevServerPlugin(
  builderConfig: ResolvedBuilderConfig
): Plugin {
  let root: string;
  return {
    name: "builder:web-router-dev-server",
    enforce: "pre",
    apply: "serve",
    async config() {
      return {
        appType: "custom",
        optimizeDeps: {
          exclude: [],
        },
        ssr: {
          noExternal: [],
        },
      };
    },
    async configResolved(config) {
      root = config.root;
    },
    async configureServer(viteServer) {
      autoRestartServer(viteServer);

      return async () => {
        viteServer.middlewares.use(
          await createWebRouterDevMiddleware(builderConfig, viteServer)
        );
      };
    },
    async transformIndexHtml() {
      return [
        {
          tag: "web-widget-inspector",
          children: clickToComponent({
            srcDir: root,
          }),
          injectTo: "body",
        },
      ];
    },
  };
}

function autoRestartServer(viteServer: ViteDevServer) {
  const send = viteServer.ws.send;
  viteServer.ws.send = function () {
    // @see https://github.com/vitejs/vite/blob/b361ffa6724d9191fc6a581acfeab5bc3ebbd931/packages/vite/src/node/server/hmr.ts#L194
    if (arguments[0]?.type === "full-reload") {
      return viteServer.restart().then(() => {
        // @ts-ignore
        send.apply(this, arguments);
      });
    }
    // @ts-ignore
    send.apply(this, arguments);
  };
}

async function createWebRouterDevMiddleware(
  builderConfig: ResolvedBuilderConfig,
  viteServer: ViteDevServer
): Promise<Middleware> {
  const baseModulePath = path.join(viteServer.config.root, path.sep);
  const baseModuleUrl = url.pathToFileURL(baseModulePath);
  const loader = createViteLoader(viteServer);

  function createRouteLoader(id: string) {
    let routeModule: RouteModule;
    return async () => {
      if (routeModule) {
        return routeModule;
      }

      const source = new URL(id, baseModuleUrl);
      const modulePath = url.fileURLToPath(source);

      routeModule = {
        meta: {},
        ...((await loader.import(modulePath)) as RouteModule),
      };

      const meta = await getMeta(source, loader, baseModuleUrl, "development");
      Object.entries(meta).forEach(([key, value]) => {
        // @ts-ignore
        if (routeModule.meta[key]) {
          // @ts-ignore
          routeModule.meta[key].push(...value);
        } else {
          // @ts-ignore
          routeModule.meta[key] = value;
        }
      });

      routeModule.meta?.script?.push({
        type: "module",
        id: "entry.client",
        src:
          "/" +
          path.relative(
            viteServer.config.root,
            builderConfig.input.client.entry
          ),
      });

      return routeModule;
    };
  }

  const manifestJson = (
    await loader.import(builderConfig.input.server.routemap)
  ).default as ManifestJSON;
  const manifest = Object.entries(manifestJson).reduce(
    (manifest, [key, value]) => {
      if (Array.isArray(value)) {
        // @ts-ignore
        manifest[key] = [];
        value.forEach((mod) => {
          // @ts-ignore
          manifest[key].push({
            ...mod,
            module: createRouteLoader(mod.module),
          });
        });
      } else if (value.module) {
        // @ts-ignore
        manifest[key] = {
          ...value,
          module: createRouteLoader(value.module),
        };
      } else {
        // @ts-ignore
        manifest[key] = value;
      }
      return manifest;
    },
    {} as ManifestResolved
  );

  const start = (
    (await loader.import(builderConfig.input.server.entry)) as ServerEntryModule
  ).default;

  const webRouter = start(manifest, {
    dev: true,
    baseAsset: viteServer.config.base,
    baseModule: baseModuleUrl,
  });

  const nodeAdapter = new NodeAdapter({
    async handler(request, fetchEvent) {
      try {
        const webResponse = await webRouter.handler(request, fetchEvent);

        if (
          !webResponse.headers.get("content-type")?.startsWith("text/html;")
        ) {
          return webResponse;
        }

        const html = await webResponse.text();
        const viteHtml = await viteServer.transformIndexHtml(
          new URL(request.url).pathname,
          html
        );

        return new Response(viteHtml, {
          status: webResponse.status,
          statusText: webResponse.statusText,
          headers: webResponse.headers,
        });
      } catch (error) {
        viteServer.ssrFixStacktrace(error);
        console.error(error.stack);

        return new Response(errorTemplate(stripAnsi(error.stack)), {
          status: 500,
          statusText: "Internal Server Error",
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        });
      }
    },
  });

  return nodeAdapter.middleware;
}

function errorTemplate(message: string) {
  return `<!doctype html>
  <html lang="en">
    <head>
      <title>Error: @web-widget/vite</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div style="display:flex;justify-content:center;align-items:center">
        <div style="border:#f3f4f6 2px solid;border-top:red 4px solid;background:#f9fafb;margin:16px;min-width:550px">
          <p style="margin:0;font-size:12pt;padding:16px;font-family:sans-serif"> An error occurred during route handling or page rendering. </p>
          <pre style="margin:0;font-size:12pt;overflow-y:auto;padding:16px;padding-top:0;font-family:monospace">${message}</pre>
        </div>
      </div>
    <body>
  </html>`;
}
