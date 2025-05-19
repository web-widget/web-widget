import path from 'node:path';
import crypto from 'node:crypto';
import type { Middleware } from '@web-widget/node';
import NodeAdapter from '@web-widget/node';
import { renderMetaToString } from '@web-widget/helpers';
import stripAnsi from 'strip-ansi';
import type { Plugin, ViteDevServer } from 'vite';
import type WebRouter from '@web-widget/web-router';
import { getMeta } from './meta';
import { fileSystemRouteGenerator } from './routing';
import type { ResolvedWebRouterConfig } from '@/types';
import { getWebRouterPluginApi } from '@/utils';
import { SOURCE_PROTOCOL } from '@/constants';

export function webRouterDevServerPlugin(
  options?: ResolvedWebRouterConfig
): Plugin {
  let resolvedWebRouterConfig: ResolvedWebRouterConfig;
  let root: string;
  let base: string;
  return {
    name: '@web-widget:dev',
    enforce: 'pre',
    apply: 'serve',

    async config() {
      return {
        appType: 'custom',
      };
    },

    async configResolved(config) {
      root = config.root;
      base = config.base;

      if (options) {
        resolvedWebRouterConfig = options;
      }

      if (!resolvedWebRouterConfig) {
        const webRouterPluginApi = getWebRouterPluginApi(config);
        if (webRouterPluginApi) {
          resolvedWebRouterConfig = webRouterPluginApi.config;
        }
      }

      if (!resolvedWebRouterConfig) {
        throw new Error('Missing options.');
      }
    },

    async configureServer(viteServer) {
      const [webRouter, restartWebRouter] = autoRestartMiddleware(
        viteServer,
        () => {
          return viteWebRouterMiddlewareV2(
            root,
            resolvedWebRouterConfig,
            viteServer
          );
        }
      );

      if (resolvedWebRouterConfig.filesystemRouting.enabled) {
        const {
          dir: routesPath,
          basePathname,
          overridePathname,
          rewrite,
        } = resolvedWebRouterConfig.filesystemRouting;
        let overrideRoute = rewrite;
        const { routemap: routemapPath } = resolvedWebRouterConfig.input.server;

        if (overridePathname && !rewrite) {
          overrideRoute = (route, source) => {
            console.warn(
              'The `overridePathname` property is deprecated. Use `rewrite` instead.'
            );
            return {
              pathname: overridePathname(route.pathname!, source),
            };
          };
        }

        fileSystemRouteGenerator({
          basePathname,
          root,
          routemapPath,
          routesPath,
          rewrite: overrideRoute,
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

async function viteWebRouterMiddlewareV2(
  root: string,
  resolvedWebRouterConfig: ResolvedWebRouterConfig,
  viteServer: ViteDevServer
): Promise<Middleware> {
  let origin: string;
  const resolvedUrls = viteServer.resolvedUrls;

  if (resolvedUrls?.local && resolvedUrls?.local[0]) {
    origin = new URL(resolvedUrls.local[0]).origin;
  } else {
    const protocol = viteServer.config.preview.https ? 'https' : 'http';
    const host = viteServer.config.preview.host || 'localhost';
    const port = viteServer.config.preview.port || 5173;
    const { ORIGIN } = process.env;
    origin = ORIGIN ?? `${protocol}://${host}:${port}`;
  }

  const webRouter: WebRouter = (
    await viteServer.ssrLoadModule(resolvedWebRouterConfig.input.server.entry, {
      fixStacktrace: true,
    })
  ).default;

  webRouter.fixErrorStack = (error: Error) => {
    viteServer.ssrFixStacktrace(error);
  };

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

          const xModuleSource = 'x-module-source';
          const sourceProtocol = res.headers.get(xModuleSource);

          if (sourceProtocol) {
            const source = path.resolve(
              path.dirname(resolvedWebRouterConfig.input.server.routemap),
              sourceProtocol.replace(`${SOURCE_PROTOCOL}//`, '')
            );

            const html = await res.text();
            const meta = await getMeta(source, viteServer);
            const url = new URL(request.url);
            const viteHtml = await viteServer.transformIndexHtml(
              url.pathname + url.search,
              html.replace(/(<\/head>)/, renderMetaToString(meta) + '$1')
            );
            const headers = new Headers(res.headers);

            if (headers.has('etag')) {
              const newEtag = crypto
                .createHash('sha1')
                .update(viteHtml)
                .digest('hex');
              headers.set('etag', `W/"${newEtag}"`);
            }

            res = new Response(viteHtml, {
              status: res.status,
              statusText: res.statusText,
              headers,
            });
          }

          return res;
        } catch (error) {
          let message: string;
          const prefix = '🚧 @web-widget/web-router exception:';
          if (error instanceof Error) {
            message = stripAnsi(error.stack ?? error.message);
            console.error(`${prefix} ${error.stack}`);
          } else {
            message = `Unknown error.`;
            console.error(prefix, error);
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
