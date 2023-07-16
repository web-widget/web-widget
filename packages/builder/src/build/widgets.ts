import { fileURLToPath } from "node:url";
import { build as viteBuild, mergeConfig as mergeViteConfig } from "vite";
import type { UserConfig as ViteUserConfig } from "vite";
import type { PreRenderedChunk } from "rollup";
import type { BuilderConfig, WidgetDefinition } from "../types";

export const manifest = "widgets-manifest.json";

export async function bundleWidgets(
  config: BuilderConfig,
  widgets: WidgetDefinition[]
) {
  const entryFiles = widgets.map((widget) => widget.file).sort();

  if (Object.keys(entryFiles).length === 0) return;

  function chunkFileNames(chunk: PreRenderedChunk) {
    return `${config.output.assets}/$[name].[hash].js`;
  }

  return await viteBuild(
    mergeViteConfig(config.viteOptions, {
      logLevel: config.viteOptions.logLevel ?? "warn",
      publicDir: false,
      build: {
        emptyOutDir: true,
        outDir: fileURLToPath(config.output.client),
        manifest,
        minify: "esbuild",
        rollupOptions: {
          input: entryFiles,
          output: {
            entryFileNames: chunkFileNames,
            chunkFileNames,
            //manualChunks: extendManualChunks(config),
          },
        },
      },
      plugins: [],
    } as ViteUserConfig)
  );
}
