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
import { viteWebRouterMiddlewareV1 } from '@/v1/router';
import type { ResolvedWebRouterConfig } from '@/types';
import { getWebRouterPluginApi } from '@/utils';

export function webRouterDevServerPlugin(
  options?: ResolvedWebRouterConfig
): Plugin {
  let resolvedWebRouterConfig: ResolvedWebRouterConfig;
  let root: string;
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
          const entryFormatVersion = resolvedWebRouterConfig.entryFormatVersion;
          if (entryFormatVersion === 1) {
            return viteWebRouterMiddlewareV1(
              resolvedWebRouterConfig,
              viteServer,
              errorTemplate
            );
          }

          return viteWebRouterMiddlewareV2(resolvedWebRouterConfig, viteServer);
        }
      );

      if (resolvedWebRouterConfig.filesystemRouting.enabled) {
        const {
          dir: routesPath,
          basePathname,
          overridePathname,
        } = resolvedWebRouterConfig.filesystemRouting;
        const { routemap: routemapPath } = resolvedWebRouterConfig.input.server;
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
      const entryFormatVersion = resolvedWebRouterConfig.entryFormatVersion;
      return entryFormatVersion === 1
        ? [
            {
              injectTo: 'head',
              tag: 'script',
              attrs: {
                type: 'module',
                src:
                  '/' +
                  path.relative(
                    root,
                    resolvedWebRouterConfig.input.client.entry
                  ),
              },
            },
          ]
        : [];
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
  resolvedWebRouterConfig: ResolvedWebRouterConfig,
  viteServer: ViteDevServer
): Promise<Middleware> {
  const protocol = viteServer.config.server.https ? 'https' : 'http';
  const host = viteServer.config.server.host || 'localhost';
  const port = viteServer.config.server.port || 8080;
  const { ORIGIN } = process.env;
  const origin = ORIGIN ?? `${protocol}://${host}:${port}`;

  const webRouter: WebRouter = (
    await viteServer.ssrLoadModule(resolvedWebRouterConfig.input.server.entry, {
      fixStacktrace: true,
    })
  ).default;

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

          const xModuleSource = 'x-module-source';
          const currentModule = res.headers.get(xModuleSource);

          if (currentModule) {
            const html = await res.text();
            const meta = await getMeta(currentModule, viteServer);
            const url = new URL(request.url);
            const viteHtml = await viteServer.transformIndexHtml(
              url.pathname + url.search,
              html.replace(/(<\/head>)/, renderMetaToString(meta) + '$1')
            );
            const headers = new Headers(res.headers);
            headers.delete(xModuleSource);

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
