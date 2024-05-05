import type { Plugin } from 'vite';
import { buildWebRouterEntryPlugin } from './build/build-web-router-entry';
import { parseWebRouterConfig } from './config';
import { webRouterDevServerPlugin } from './dev/dev-server';
import type {
  WebRouterUserConfig,
  ImportMap,
  ResolvedWebRouterConfig,
  RouteMap,
  WebRouterPlugin,
} from './types';
import { importActionPlugin } from './build/import-action';
import { WEB_ROUTER_PLUGIN_NAME } from './constants';

export function webRouterPlugin(options: WebRouterUserConfig = {}): Plugin[] {
  let resolvedWebRouterConfig: ResolvedWebRouterConfig;
  return [
    {
      name: WEB_ROUTER_PLUGIN_NAME,
      enforce: 'pre',
      api: {
        get config() {
          return resolvedWebRouterConfig;
        },
        async clientImportap() {
          return (
            await import(this.config.input.client.importmap, {
              assert: {
                type: 'json',
              },
            })
          ).default as ImportMap;
        },
        async serverRoutemap() {
          return (
            await import(this.config.input.server.routemap, {
              assert: {
                type: 'json',
              },
            })
          ).default as RouteMap;
        },
      },
      async config({ root = process.cwd(), resolve: { extensions } = {} }) {
        resolvedWebRouterConfig = parseWebRouterConfig(
          options,
          root,
          extensions
        );
      },
    } as WebRouterPlugin,

    buildWebRouterEntryPlugin(),

    webRouterDevServerPlugin(),

    importActionPlugin(),
  ];
}
