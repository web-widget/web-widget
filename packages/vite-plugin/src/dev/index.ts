import crypto from 'node:crypto';
import type { Middleware } from '@web-widget/node';
import NodeAdapter from '@web-widget/node';
import { renderMetaToString } from '@web-widget/helpers';
import stripAnsi from 'strip-ansi';
import type { Plugin, ViteDevServer } from 'vite';
import { isRunnableDevEnvironment } from 'vite';
import type WebRouter from '@web-widget/web-router';
import { getMeta } from './meta';
import { fileSystemRouteGenerator } from './routing';
import { handleDevRoutemapChange } from './routemap-invalidation';
import type { ResolvedWebRouterConfig } from '@/types';
import type { RouterPluginHost } from '@/router/host';
import {
  asServerDevEnvironment,
  getServerEnvironmentFromDevServer,
} from '@/internal/environment';
import { getWebRouterPluginApi } from '@/internal/manifest';
import {
  DEV_MODULE_SOURCE_HEADER,
  resolveModuleSourcePath,
} from './module-source';
import { resolveDevOrigin } from './resolve-dev-origin';
import { getDevServerRevision } from './dev-server-cache';
import { warmupServerDevModules } from './warmup';
import { printDevWelcome } from './welcome';

export function webRouterDevServerPlugin(host?: RouterPluginHost): Plugin {
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

      const resolvedConfig =
        host?.api.config ?? getWebRouterPluginApi(config)?.config;

      if (!resolvedConfig) {
        throw new Error('Missing options.');
      }

      resolvedWebRouterConfig = resolvedConfig;
    },

    async configureServer(viteServer) {
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
          onRoutemapComputed(routemap) {
            host?.setDevServerRoutemap(routemap);
          },
          async onRoutemapChanged(change) {
            try {
              await handleDevRoutemapChange(
                viteServer,
                resolvedWebRouterConfig,
                {
                  structural: change.structural,
                  filesystemChanged: change.filesystemChanged,
                }
              );
            } catch (error) {
              logDevError('Routemap server invalidation failed', error);
            }
          },
          watcher: viteServer.watcher,
        });
      }

      return async () => {
        const register = () => {
          try {
            viteServer.middlewares.use(
              createWebRouterDevMiddleware(resolvedWebRouterConfig, viteServer)
            );
            void warmupServerDevModules(
              viteServer,
              resolvedWebRouterConfig
            ).catch((error) => logDevError('Server warmup failed', error));
            printDevWelcome();
          } catch (error) {
            logDevError('Service startup failed', error);
          }
        };

        try {
          if (viteServer.httpServer?.listening) {
            register();
          } else if (viteServer.httpServer) {
            viteServer.httpServer.once('listening', register);
          } else {
            register();
          }
        } catch (error) {
          logDevError('Service startup failed', error);
        }
      };
    },
  };
}

function createWebRouterDevMiddleware(
  resolvedWebRouterConfig: ResolvedWebRouterConfig,
  viteServer: ViteDevServer
): Middleware {
  const origin = resolveDevOrigin(viteServer);
  const viteServerEnvironment = getServerEnvironmentFromDevServer(viteServer);

  if (!isRunnableDevEnvironment(viteServerEnvironment)) {
    throw new Error(
      'Expected a RunnableDevEnvironment for the server environment.'
    );
  }

  const serverDev = asServerDevEnvironment(viteServerEnvironment);
  const serverEntry = resolvedWebRouterConfig.input.server.entry;

  /** Rebuilt when server module invalidation bumps {@link getDevServerRevision}. */
  let cachedWebRouter: WebRouter | undefined;
  let cachedWebRouterRevision = -1;

  const nodeAdapter = new NodeAdapter(
    {
      async handler(request, ...args) {
        let webRouter: WebRouter;
        const revision = getDevServerRevision();

        try {
          if (cachedWebRouter && cachedWebRouterRevision === revision) {
            webRouter = cachedWebRouter;
          } else {
            webRouter = (await serverDev.importModule(serverEntry)).default;
            cachedWebRouter = webRouter;
            cachedWebRouterRevision = revision;
          }
          webRouter.fixErrorStack = (error) => {
            viteServer.ssrFixStacktrace(error);
          };
        } catch (error) {
          return renderHandlerError(viteServer, request.url, error);
        }

        try {
          let res = await webRouter.handler(request, ...args);
          if (request.method === 'HEAD') {
            return res;
          }
          const contentType = res.headers.get('content-type') || '';
          const isHtml = contentType.includes('text/html');
          const isJSON = request.url.endsWith('.json');
          const isEmptyStatus =
            ((res.status / 100) | 0) === 1 ||
            res.status === 204 ||
            res.status === 205 ||
            res.status === 304;

          if (isEmptyStatus || !isHtml || isJSON) {
            return res;
          }

          const moduleSource = res.headers.get(DEV_MODULE_SOURCE_HEADER);

          if (moduleSource) {
            const source = resolveModuleSourcePath(
              moduleSource,
              viteServer.config.root
            );

            const html = await res.text();
            const meta = await getMeta(
              source,
              serverDev,
              getWebRouterPluginApi(viteServer.config)?.dynamicImportPredicate
            );
            const url = new URL(request.url);
            const viteHtml = await viteServer.transformIndexHtml(
              url.pathname + url.search,
              html.replace(/(<\/head>)/, renderMetaToString(meta) + '$1')
            );
            const headers = new Headers(res.headers);

            if (html !== viteHtml && headers.has('etag')) {
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
          return renderHandlerError(viteServer, request.url, error);
        }
      },
    },
    {
      defaultOrigin: origin,
    }
  );

  return nodeAdapter.middleware;
}

function logDevError(prefix: string, error: unknown) {
  if (error instanceof Error) {
    console.error(`${prefix}: ${error.stack}`);
  } else {
    console.error(`${prefix}:`, error);
  }
}

function renderHandlerError(
  viteServer: ViteDevServer,
  requestUrl: string,
  error: unknown
) {
  let message: string;
  const prefix = `🚧 @web-widget/web-router ${requestUrl} exception:`;
  if (error instanceof Error) {
    viteServer.ssrFixStacktrace(error);
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
