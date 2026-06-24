import type { Plugin, ViteBuilder } from 'vite';
import {
  isServerEnvironment,
  getServerEnvironmentFromBuilder,
} from '@/internal/environment';
import type { RouterPluginHost } from './host';

const SERVER_ENTRY_OUTPUT_NAME = 'index';

export function createServerOutputPlugin(host: RouterPluginHost): Plugin {
  return {
    name: '@web-widget:server-output',
    apply: 'build',
    enforce: 'pre',
    sharedDuringBuild: true,

    async generateBundle(_options, bundle) {
      if (!isServerEnvironment(this.environment)) {
        return;
      }

      this.emitFile({
        type: 'prebuilt-chunk',
        fileName: `${SERVER_ENTRY_OUTPUT_NAME}.d.ts`,
        code: [
          `import WebRouter from '@web-widget/web-router';`,
          `declare const _default: WebRouter;`,
          `export default _default;`,
        ].join('\n'),
      });

      this.emitFile({
        type: 'prebuilt-chunk',
        fileName: 'package.json',
        code: JSON.stringify(
          {
            type: 'module',
            exports: {
              '.': {
                types: `./${SERVER_ENTRY_OUTPUT_NAME}.d.ts`,
                default: `./${SERVER_ENTRY_OUTPUT_NAME}.js`,
              },
            },
          },
          null,
          2
        ),
      });
    },

    buildApp: {
      order: 'post',
      async handler() {
        if (host.state.useAppBuilder) {
          console.info(`@web-widget: build success!`);
        }
      },
    },
  };
}

export async function runRouterBuildApp(
  host: RouterPluginHost,
  builder: ViteBuilder
) {
  const client = builder.environments.client;
  const server = getServerEnvironmentFromBuilder(builder);

  if (!client || !server) {
    throw new Error('Expected both client and server build environments.');
  }

  await builder.build(client);
  await builder.build(server);
}

export async function runRouterServerBuildApp(
  host: RouterPluginHost,
  builder: ViteBuilder
) {
  const server = getServerEnvironmentFromBuilder(builder);
  if (!server) {
    throw new Error('Expected server build environment.');
  }
  await builder.build(server);
}
