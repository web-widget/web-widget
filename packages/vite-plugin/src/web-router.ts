import type { Plugin } from 'vite';
import { buildWebRouterEntryPlugin } from './build/build-web-router-entry';
import { parseConfig } from './config';
import { pluginContainer } from './container';
import { webRouterDevServerPlugin } from './dev/dev-server';
import type {
  BuilderUserConfig,
  ImportMap,
  ResolvedBuilderConfig,
  RouteMap,
  WebRouterPlugin,
} from './types';
import { importActionPlugin } from './build/import-action';

export function webRouterPlugin(options: BuilderUserConfig = {}): Plugin[] {
  let builderConfig: ResolvedBuilderConfig;
  const api = {
    get config() {
      return builderConfig;
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
  };
  return [
    {
      name: 'vite-plugin-web-router',
      enforce: 'pre',
      api,
      async config({ root = process.cwd(), resolve: { extensions } = {} }) {
        builderConfig = parseConfig(options, root, extensions);
      },
    } as WebRouterPlugin,

    ...pluginContainer<ResolvedBuilderConfig>(
      buildWebRouterEntryPlugin,
      () => {
        return builderConfig;
      },
      true
    ),

    webRouterDevServerPlugin(),

    importActionPlugin({}),
  ];
}
