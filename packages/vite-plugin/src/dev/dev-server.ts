import path from 'node:path';
import type { Middleware } from '@web-widget/node';
import NodeAdapter from '@web-widget/node';
import type { RouteModule } from '@web-widget/helpers';
import { renderMetaToString } from '@web-widget/helpers';
import type { Manifest } from '@web-widget/web-router';
import stripAnsi from 'strip-ansi';
import type { Plugin, ViteDevServer } from 'vite';
import type {
  ManifestJSON,
  ResolvedBuilderConfig,
  ServerEntryModule,
} from '../types';
import { getMeta } from './meta';
import { fileSystemRouteGenerator } from './routing';

type DevModule = RouteModule & {
  $source?: string;
};

export function webRouterDevServerPlugin(
  builderConfig: ResolvedBuilderConfig
): Plugin {
  let root: string;
  return {
    name: '@widget:web-router-dev-server',
    enforce: 'pre',
    apply: 'serve',
    async config() {
      return {
        appType: 'custom',
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

      if (builderConfig.filesystemRouting.enabled) {
        const {
          dir: routesPath,
          basePathname,
          overridePathname,
        } = builderConfig.filesystemRouting;
        const { routemap: routemapPath } = builderConfig.input.server;
        fileSystemRouteGenerator({
          basePathname,
          root,
          routemapPath,
          routesPath,
          overridePathname,
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
          injectTo: 'head',
          tag: 'script',
          attrs: {
            type: 'module',
            src: '/' + path.relative(root, builderConfig.input.client.entry),
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
    if (arguments[0]?.type === 'full-reload') {
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
  const protocol = viteServer.config.server.https ? 'https' : 'http';
  const host = viteServer.config.server.host || 'localhost';
  const port = viteServer.config.server.port || 8080;
  const origin = `${protocol}://${host}:${port}`;

  let currentModule: string | undefined;
  const manifest = await loadManifest(
    builderConfig.input.server.routemap,
    viteServer
  );

  manifest.middlewares ??= [];
  manifest.middlewares.unshift({
    pathname: '(.*)',
    module: {
      async handler(context, next) {
        try {
          return await next();
        } finally {
          currentModule = (context.module as DevModule)?.$source;
        }
      },
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
    onFallback(error, context) {
      currentModule = (context?.module as DevModule)?.$source;
      const status = Reflect.get(error, 'status') ?? 500;
      const expose = Reflect.get(error, 'expose');
      if (status >= 500 && !expose) {
        const message = (error.stack || error.toString()).replace(/^/gm, '  ');
        if (context) {
          console.error(
            `${context.request.method} ${context.request.url}\n${message}\n`
          );
        } else {
          console.error(`\n${message}\n`);
        }
      }
    },
  });

  const nodeAdapter = new NodeAdapter(
    {
      async handler(request, fetchEvent) {
        try {
          let res = await webRouter.handler(request, fetchEvent);
          const isEmptyStatus =
            ((res.status / 100) | 0) === 1 ||
            res.status === 204 ||
            res.status === 205 ||
            res.status === 304;

          if (
            isEmptyStatus ||
            !res.headers.get('content-type')?.startsWith('text/html;')
          ) {
            return res;
          }

          if (currentModule) {
            let html = await res.text();
            const meta = await getMeta(currentModule, viteServer);
            const url = new URL(request.url);
            const viteHtml = await viteServer.transformIndexHtml(
              url.pathname + url.search,
              html.replace(/(<\/head>)/, renderMetaToString(meta) + '$1')
            );

            res = new Response(viteHtml, {
              status: res.status,
              statusText: res.statusText,
              headers: res.headers,
            });
          }

          return res;
        } catch (error) {
          let message: string;
          if (error instanceof Error) {
            viteServer.ssrFixStacktrace(error);
            message = stripAnsi(error.stack ?? error.message);
            console.error(error.stack);
          } else {
            message = String(error);
            console.error(error);
          }

          return new Response(errorTemplate(message), {
            status: 500,
            statusText: 'Internal Server Error',
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
          });
        }
      },
    },
    {
      defaultOrigin: origin,
    }
  );

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
  }, {} as Manifest);
}

function errorTemplate(message: string) {
  return `<!doctype html>
  <html lang="en">
    <head>
      <title>Error: @web-widget/vite-plugin</title>
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
