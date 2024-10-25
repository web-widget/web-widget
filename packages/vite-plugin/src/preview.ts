import path from 'node:path';
import NodeAdapter from '@web-widget/node';
import type { Plugin } from 'vite';
import type WebRouter from '@web-widget/web-router';
import type { ResolvedWebRouterConfig } from '@/types';
import { getWebRouterPluginApi } from '@/utils';

export function webRouterPreviewServerPlugin(
  options?: ResolvedWebRouterConfig
): Plugin {
  let root: string;
  let resolvedWebRouterConfig: ResolvedWebRouterConfig;
  return {
    name: '@web-widget:preview',
    enforce: 'pre',
    apply: 'serve',
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

    async configurePreviewServer(viteServer) {
      return async () => {
        let origin: string;
        const resolvedUrls = viteServer.resolvedUrls;
        const headers = viteServer.config.preview.headers;

        if (resolvedUrls?.local && resolvedUrls?.local[0]) {
          origin = new URL(resolvedUrls.local[0]).origin;
        } else {
          const protocol = viteServer.config.preview.https ? 'https' : 'http';
          const host = viteServer.config.preview.host || 'localhost';
          const port = viteServer.config.preview.port || 4173;
          const { ORIGIN } = process.env;
          origin = ORIGIN ?? `${protocol}://${host}:${port}`;
        }

        try {
          const output = resolvedWebRouterConfig.output;
          const entry = path.join(
            path.resolve(root, output.dir),
            output.server,
            'index.js'
          );
          const webRouter: WebRouter = (await import(entry)).default;
          const nodeAdapter = new NodeAdapter(webRouter, {
            defaultOrigin: origin,
          });
          viteServer.middlewares.use(async (req, res, next) => {
            next();
            if (headers) {
              for (const name in headers) {
                res.setHeader(name, headers[name]!);
              }
            }
          });
          viteServer.middlewares.use(nodeAdapter.middleware);
        } catch (error) {
          console.error(`Service startup failed: ${error.stack}`);
        }
      };
    },
  };
}
