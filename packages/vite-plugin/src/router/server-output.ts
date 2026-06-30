import path from 'node:path';
import fs from 'node:fs/promises';
import type { Plugin, ViteBuilder } from 'vite';
import {
  isServerEnvironment,
  isClientEnvironment,
  getServerEnvironmentFromBuilder,
} from '@/internal/environment';
import { CLIENT_MANIFEST_FILE_NAME } from '@/internal/config';
import { writeServerAssetsDataFile } from './server-assets-plugin';
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
          // After all environments finish building, overwrite the data module
          // file (`.server-assets.js`) with real asset URLs and pre-computed
          // link lists. The client manifest is required, so this must run
          // after the client build. The server's consumer virtual module
          // statically imports this file at runtime.
          const { root, resolvedWebRouterConfig } = host.state;
          const serverOutDir = path.join(
            root,
            resolvedWebRouterConfig.output.dir,
            resolvedWebRouterConfig.output.server
          );
          await writeServerAssetsDataFile(host, serverOutDir);
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

  // Build order: server first, then client.
  // The server build emits the consumer virtual module
  // (`virtual:web-widget-server-assets`) plus a placeholder data module
  // (`.server-assets.js`) so the static import resolves. After the client
  // build completes, the `buildApp: post` hook above overwrites the data
  // module with real asset URLs and link lists derived from the client
  // manifest.
  await builder.build(server);
  await builder.build(client);
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

/**
 * Captures the Vite client manifest from the client build's bundle in-memory
 * (via `generateBundle`) and removes it from the bundle so no `.manifest.json`
 * file is written to disk. The captured manifest is stored in `host.state`
 * and consumed by `writeServerAssetsDataFile` in the `buildApp` hook.
 */
export function createClientManifestCapturePlugin(
  host: RouterPluginHost
): Plugin {
  return {
    name: '@web-widget:client-manifest-capture',
    apply: 'build',
    enforce: 'post',

    generateBundle(_options, bundle) {
      if (!isClientEnvironment(this.environment)) {
        return;
      }
      const asset = bundle[CLIENT_MANIFEST_FILE_NAME];
      if (asset && asset.type === 'asset') {
        const manifest = JSON.parse(
          typeof asset.source === 'string'
            ? asset.source
            : Buffer.from(asset.source).toString('utf-8')
        );
        host.patchState({ clientManifest: manifest });
        // Remove from bundle so the manifest file is not written to disk.
        delete bundle[CLIENT_MANIFEST_FILE_NAME];
      }
    },

    writeBundle(_options, bundle) {
      if (!isClientEnvironment(this.environment)) {
        return;
      }
      // The native viteManifestPlugin adds the manifest to the bundle after
      // all JS `generateBundle` hooks. Capture it here if it wasn't available
      // earlier, then delete the file from disk.
      const asset = bundle[CLIENT_MANIFEST_FILE_NAME];
      if (asset && asset.type === 'asset' && !host.state.clientManifest) {
        const manifest = JSON.parse(
          typeof asset.source === 'string'
            ? asset.source
            : Buffer.from(asset.source).toString('utf-8')
        );
        host.patchState({ clientManifest: manifest });
      }
      // Delete the manifest file from disk — data is passed in-memory only.
      const outDir = this.environment.config.build.outDir;
      const manifestPath = path.join(outDir, CLIENT_MANIFEST_FILE_NAME);
      fs.unlink(manifestPath).catch(() => {});
    },
  };
}
