import path from 'node:path';
import type { Middleware } from '@web-widget/node';
import NodeAdapter from '@web-widget/node';
import type { RouteModule } from '@web-widget/helpers';
import { renderMetaToString } from '@web-widget/helpers';
import stripAnsi from 'strip-ansi';
import type { ViteDevServer } from 'vite';
import type { Manifest } from '@web-widget/web-router';
import { getMeta } from '@/dev/meta';
import type {
  ResolvedWebRouterConfig,
  RouteMap,
  WebRouterServerEntryModuleV1,
} from '@/types';

type DevModule = RouteModule & {
  $source?: string;
};

/** @deprecated */
export async function viteWebRouterMiddlewareV1(
  resolvedWebRouterConfig: ResolvedWebRouterConfig,
  viteServer: ViteDevServer,
  errorTemplate: (message: string) => string
): Promise<Middleware> {
  const protocol = viteServer.config.server.https ? 'https' : 'http';
  const host = viteServer.config.server.host || 'localhost';
  const port = viteServer.config.server.port || 8080;
  const origin = `${protocol}://${host}:${port}`;

  let currentModule: string | undefined;
  const manifest = await loadManifest(
    resolvedWebRouterConfig.input.server.routemap,
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
      resolvedWebRouterConfig.input.server.entry
    )) as WebRouterServerEntryModuleV1
  ).default;

  const webRouter = start(manifest, {
    dev: true,
    baseAsset: viteServer.config.base,
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
      async handler(request, ...args) {
        try {
          let res = await webRouter.handler(request, ...args);
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
    .default as RouteMap;
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
