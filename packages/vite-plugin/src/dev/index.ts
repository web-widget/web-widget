import type { Middleware } from '@web-widget/node';
import NodeAdapter from '@web-widget/node';
import stripAnsi from 'strip-ansi';
import { createRequire } from 'node:module';
import type { Plugin, ViteDevServer } from 'vite';
import { isRunnableDevEnvironment } from 'vite';
import type WebRouter from '@web-widget/web-router';
import { getMeta } from './meta';
import { parseHeadTags, type DevHeadTags } from './parse-head-tags';
import { fileSystemRouteGenerator } from './routing';
import { handleDevRoutemapChange } from './routemap-invalidation';
import type { ResolvedWebRouterConfig } from '@/types';
import type { RouterPluginHost } from '@/router/host';
import {
  asServerDevEnvironment,
  getClientEnvironmentFromDevServer,
  getServerEnvironmentFromDevServer,
} from '@/internal/environment';
import { getWebRouterPluginApi } from '@/internal/manifest';
import { resolveModuleSourcePath } from './module-source';
import { resolveDevOrigin } from './resolve-dev-origin';
import { getDevServerRevision } from './dev-server-cache';
import { logPlugin } from '@/internal/log';
import { warmupServerDevModules } from './warmup';
import { printDevWelcome } from './welcome';

export function webRouterDevServerPlugin(host?: RouterPluginHost): Plugin[] {
  let resolvedWebRouterConfig: ResolvedWebRouterConfig;
  let root: string;

  const devServerPlugin: Plugin = {
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
          ignore: resolvedWebRouterConfig.ignore,
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
              logPlugin('error', 'Routemap server invalidation failed', error);
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
            ).catch((error) =>
              logPlugin('error', 'Server warmup failed', error)
            );
            printDevWelcome();
          } catch (error) {
            logPlugin('error', 'Service startup failed', error);
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
          logPlugin('error', 'Service startup failed', error);
        }
      };
    },
  };

  return [devServerPlugin];
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
  const clientDev = getClientEnvironmentFromDevServer(viteServer);
  const serverEntry = resolvedWebRouterConfig.input.server.entry;
  const root = viteServer.config.root;
  const base = viteServer.config.base;
  const widgetModuleFilter = getWebRouterPluginApi(
    viteServer.config
  )?.widgetModuleFilter;

  // Resolve the Inspector module URL once, from the vite-plugin package
  // itself (which depends on @web-widget/inspector). The page source is
  // passed to the element via its `page-source` attribute.
  const inspectorEntry = createRequire(import.meta.url).resolve(
    '@web-widget/inspector'
  );
  const inspectorScriptUrl = `${base}@fs${inspectorEntry}`;

  // Pre-extract head tags that Vite plugins inject via
  // transformIndexHtml (e.g. @vitejs/plugin-react's refresh preamble,
  // /@vite/client, plugin-injected styles/links). We run
  // transformIndexHtml on an empty HTML shell once and cache the
  // result, then merge into meta via setDevMetaProvider. This avoids
  // calling transformIndexHtml on the final SSR HTML (which would
  // buffer the response and break streaming), while still supporting
  // framework plugins that rely on transformIndexHtml for HMR
  // injection.
  let cachedDevTags: DevHeadTags | undefined;
  async function getDevTags(): Promise<DevHeadTags> {
    if (cachedDevTags) return cachedDevTags;
    const shell = '<!doctype html><html><head></head><body></body></html>';
    const transformed = await viteServer.transformIndexHtml('/', shell);
    cachedDevTags = parseHeadTags(transformed);
    return cachedDevTags;
  }

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
            // Inject dev meta provider so dev assets (CSS, HMR client,
            // Inspector, page source) are collected at the rendering level,
            // preserving streaming support.
            webRouter.setDevMetaProvider(async (context) => {
              const source = (
                context.module as { $source?: string } | undefined
              )?.$source;
              if (!source) return;
              const meta = await getMeta(
                resolveModuleSourcePath(source, root),
                serverDev,
                clientDev,
                widgetModuleFilter
              );
              // Merge dev tags from transformIndexHtml (React refresh
              // preamble, /@vite/client, plugin styles/links/meta) into
              // the structured meta arrays.
              const devTags = await getDevTags();
              meta.script.unshift(...devTags.script);
              meta.style.unshift(...devTags.style);
              meta.link.unshift(...devTags.link);
              meta.meta.unshift(...devTags.meta);
              // Bootstrap the Inspector, passing the route module source
              // path via the element's `page-source` attribute.
              meta.script.push({
                content: `import(${JSON.stringify(inspectorScriptUrl)}).then(()=>{
                  var el=document.querySelector('web-widget-inspector');
                  if(!el){
                    el=document.createElement('web-widget-inspector');
                    el.dir=${JSON.stringify(root)};
                    document.body.appendChild(el);
                  }
                  el.setAttribute('page-source',${JSON.stringify(source)});
                });`,
              });
              return meta;
            });
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
          return await webRouter.handler(request, ...args);
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

function renderHandlerError(
  viteServer: ViteDevServer,
  requestUrl: string,
  error: unknown
) {
  let message: string;
  if (error instanceof Error) {
    viteServer.ssrFixStacktrace(error);
    message = stripAnsi(error.stack ?? error.message);
  } else {
    message = `Unknown error.`;
  }
  logPlugin(
    'error',
    `${requestUrl} exception`,
    error,
    '@web-widget/web-router'
  );

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
