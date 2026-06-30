import path from 'node:path';
import fs from 'node:fs/promises';
import type { Plugin } from 'vite';
import { applyToServerEnvironment } from '@/internal/environment';
import {
  SERVER_ASSETS_MODULE_ID,
  SERVER_ASSETS_RESOLVED_ID,
  SERVER_ASSETS_DATA_MODULE_ID,
  SERVER_ASSETS_DATA_RESOLVED_ID,
  SERVER_ASSETS_DATA_FILE_NAME,
  generateServerAssetsModuleCode,
  generateServerAssetsDevModuleCode,
  generateServerAssetsDataModuleCode,
  generateServerAssetsPlaceholderCode,
  buildServerAssetsData,
  serializeServerAssetsData,
} from '@/internal/server-assets-module';
import { defaultWidgetPathMatcher } from '@/internal/collect-route-assets';
import type { RouterPluginHost } from './host';

/**
 * Provides two virtual modules for the server-side asset resolver:
 *
 * - `virtual:web-widget-server-assets` (consumer): re-exports
 *   `resolveWidgetAsset` / `resolveLinks` and the data maps. Its code is
 *   fixed at server-build time and statically imports the data module.
 * - `virtual:web-widget-server-assets-data` (data): at runtime loads the
 *   real data from the emitted data file via `import.meta.url` +
 *   `new URL(..., import.meta.url)` + dynamic `import()`. The data file
 *   is emitted into the server output's assets dir (placeholder at
 *   server-build time, overwritten with real data after the client build).
 *
 * Using `URL` + `import.meta.url` + dynamic `import()` keeps the runtime
 * tech-stack neutral (no `node:fs` / `node:url` / `node:path`) while
 * preserving the reverse build order (server → client).
 */
export function createServerAssetsPlugin(host: RouterPluginHost): Plugin {
  let command: 'build' | 'serve';
  return {
    name: '@web-widget:server-assets',
    enforce: 'pre',
    sharedDuringBuild: true,
    applyToEnvironment: applyToServerEnvironment(),

    configResolved(config) {
      command = config.command;
      // Capture `build.assetsDir` so the `generateBundle` hook emits the
      // data file into the same directory server chunks are written to.
      host.patchState({ serverAssetsDir: config.build?.assetsDir ?? 'assets' });
    },

    resolveId(id) {
      if (id === SERVER_ASSETS_MODULE_ID) {
        return SERVER_ASSETS_RESOLVED_ID;
      }
      if (id === SERVER_ASSETS_DATA_MODULE_ID) {
        return SERVER_ASSETS_DATA_RESOLVED_ID;
      }
      return null;
    },

    load(id) {
      // In dev mode, CSS is collected by `dev/meta.ts` via the server
      // module graph, so the virtual module only needs to provide empty
      // data + stub resolvers. The build uses the real data file emitted
      // after the client build completes.
      if (command === 'serve' && id === SERVER_ASSETS_RESOLVED_ID) {
        return generateServerAssetsDevModuleCode();
      }
      if (id === SERVER_ASSETS_RESOLVED_ID) {
        return generateServerAssetsModuleCode();
      }
      if (id === SERVER_ASSETS_DATA_RESOLVED_ID) {
        return generateServerAssetsDataModuleCode();
      }
      return null;
    },

    generateBundle() {
      const assetsDir = host.state.serverAssetsDir || 'assets';
      // Emit a placeholder data file at server-build time so the data
      // virtual module's runtime dynamic `import()` resolves to a real
      // file. The real data is written by `writeServerAssetsDataFile`
      // after the client build completes.
      this.emitFile({
        type: 'prebuilt-chunk',
        fileName: `${assetsDir}/${SERVER_ASSETS_DATA_FILE_NAME}`,
        code: generateServerAssetsPlaceholderCode(),
      });
    },
  };
}

/**
 * After the client build completes, overwrite the data file
 * (`<serverOutDir>/<serverAssetsDir>/.server-assets.js`) with the real
 * asset URLs and pre-computed link lists derived from the client
 * manifest. The placeholder emitted at server-build time is replaced with
 * a regular ES module that exports `assetUrls` and `linkMap`.
 */
export async function writeServerAssetsDataFile(
  host: RouterPluginHost,
  serverOutDir: string
): Promise<void> {
  const { root, resolvedWebRouterConfig, widgetModuleFilter, serverAssetsDir } =
    host.state;
  const base = host.state.base;
  const routeClientAssets = host.api.getRouteClientAssets();
  const manifest = host.state.clientManifest;
  if (!manifest) {
    throw new Error(
      'Client manifest not available. Ensure the client build has completed before calling writeServerAssetsDataFile.'
    );
  }

  const clientEntryId = path
    .relative(root, resolvedWebRouterConfig.input.client.entry)
    .replace(/\\/g, '/');

  // `widgetModuleFilter` may not be set yet (see `resolveClientBuildGraph`).
  // Fall back to the default widget path matcher so widget CSS links are
  // still collected for the linkMap.
  const dynamicImportPredicate = widgetModuleFilter ?? defaultWidgetPathMatcher;

  const data = buildServerAssetsData(
    manifest,
    routeClientAssets,
    base,
    root,
    dynamicImportPredicate,
    clientEntryId
  );

  const code = serializeServerAssetsData(data);
  const filePath = path.join(
    serverOutDir,
    serverAssetsDir || 'assets',
    SERVER_ASSETS_DATA_FILE_NAME
  );
  await fs.writeFile(filePath, code, 'utf-8');
}
