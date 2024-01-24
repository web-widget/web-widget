import path from "node:path";
import type { Middleware } from "@web-widget/node";
import NodeAdapter from "@web-widget/node";
import type { RouteModule, MiddlewareHandler } from "@web-widget/helpers";
import { renderMetaToString } from "@web-widget/helpers";
import type { ManifestJSON, ManifestResolved } from "@web-widget/web-router";
import stripAnsi from "strip-ansi";
import type { Plugin, ViteDevServer } from "vite";
import type { ResolvedBuilderConfig, ServerEntryModule } from "../types";
import { getMeta } from "./meta";
import { fileSystemRouteGenerator } from "./routing";

const WEB_ROUTER = "@web-widget/web-router";

type DevModule = RouteModule & {
  $source?: string;
};

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
          exclude: [WEB_ROUTER],
        },
        ssr: {
          noExternal: [WEB_ROUTER],
        },
      };
    },
    async configResolved(config) {
      root = config.root;
    },
    async configureServer(viteServer) {
      const [webRouter, restartWebRouter] = autoRestartMiddleware(
        viteServer,
        () => viteWebRouterMiddleware(builderConfig, viteServer)
      );

      if (builderConfig.filesystemRouting) {
        const {
          dir: routesPath,
          basePathname,
          trailingSlash,
        } = builderConfig.input.routes;
        const { routemap: routemapPath } = builderConfig.input.server;
        fileSystemRouteGenerator({
          basePathname,
          root,
          routemapPath,
          routesPath,
          trailingSlash,
          update(padding) {
            restartWebRouter(padding);
          },
          watcher: viteServer.watcher,
        });
      }

      return async () => {
        try {
          viteServer.middlewares.use(webRouter);
        } catch (error) {
          viteServer.ssrFixStacktrace(error);
          console.error(`Service startup failed: ${error.stack}`);
        }
      };
    },
    async transformIndexHtml() {
      return [
        {
          injectTo: "head",
          tag: "script",
          attrs: {
            type: "module",
            src: "/" + path.relative(root, builderConfig.input.client.entry),
          },
        },
      ];
    },
  };
}

function autoRestartMiddleware(
  viteServer: ViteDevServer,
  callback: () => Promise<Middleware>
) {
  let middleware;
  let promise = Promise.resolve();
  const send = viteServer.ws.send;

  viteServer.ws.send = function () {
    // @see https://github.com/vitejs/vite/blob/b361ffa6724d9191fc6a581acfeab5bc3ebbd931/packages/vite/src/node/server/hmr.ts#L194
    if (arguments[0]?.type === "full-reload") {
      middleware = undefined;
    }
    // @ts-ignore
    send.apply(this, arguments);
  };

  async function autoRestartMiddleware(...args: any[]) {
    await promise;
    middleware ??= await callback();
    return middleware(...args);
  }

  function restart(padding: Promise<any>) {
    promise = padding;
    middleware = undefined;
  }

  return [autoRestartMiddleware, restart];
}

async function viteWebRouterMiddleware(
  builderConfig: ResolvedBuilderConfig,
  viteServer: ViteDevServer
): Promise<Middleware> {
  const baseModulePath = path.join(viteServer.config.root, path.sep);

  const manifest = await loadManifest(
    builderConfig.input.server.routemap,
    viteServer
  );

  manifest.middlewares ??= [];
  manifest.middlewares.unshift({
    pathname: "*",
    name: "@web-widget/vite:meta",
    module: {
      handler: renderStyles(viteServer),
    },
  });

  const start = (
    (await viteServer.ssrLoadModule(
      builderConfig.input.server.entry
    )) as ServerEntryModule
  ).default;

  const webRouter = start(manifest, {
    dev: true,
    baseAsset: viteServer.config.base,
    baseModule: baseModulePath,
    defaultRenderOptions: {
      react: {
        awaitAllReady: true,
      },
    } as any,
  });

  const nodeAdapter = new NodeAdapter({
    origin: webRouter.origin,
    async handler(request, fetchEvent) {
      try {
        const webResponse = await webRouter.handler(request, fetchEvent);

        return webResponse;
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

async function loadManifest(routemap: string, viteServer: ViteDevServer) {
  function createRouteLoader(id: string) {
    let routeModule: DevModule;
    return async () => {
      const modulePath = path.resolve(path.dirname(routemap), id);

      if (routeModule) {
        return routeModule;
      }

      routeModule = {
        $source: modulePath,
        ...((await viteServer.ssrLoadModule(modulePath)) as RouteModule),
      };

      return routeModule;
    };
  }
  const manifestJson = (await viteServer.ssrLoadModule(routemap))
    .default as ManifestJSON;
  return Object.entries(manifestJson).reduce((manifest, [key, value]) => {
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
  }, {} as ManifestResolved);
}

function renderStyles(viteServer: ViteDevServer): MiddlewareHandler {
  return async (context, next) => {
    let res = await next();

    if (!res.headers.get("content-type")?.startsWith("text/html;")) {
      return res;
    }

    const source = (context?.module as DevModule).$source;
    if (source) {
      const meta = await getMeta(source, viteServer);
      const url = new URL(context.request.url);
      const html = (await res.text()).replace(
        /(<\/head>)/,
        renderMetaToString(meta) + "$1"
      );
      const viteHtml = await viteServer.transformIndexHtml(
        url.pathname + url.search,
        html
      );

      res = new Response(viteHtml, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    }

    return res;
  };
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
