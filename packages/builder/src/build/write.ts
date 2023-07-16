import { promises as fs } from "fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "pathe";
import type { Manifest } from "vite";
import { build } from "vite";
import { uniq } from "./utils";
import { manifest } from "./widgets";
import type { BuilderConfig, WidgetDefinition } from "../types";

export async function writeRoutes(
  config: BuilderConfig,
  input: Map<string, string>,
  widgets: WidgetDefinition[]
) {
  const manifest: Manifest = await parseManifest(
    fileURLToPath(config.output.client),
    widgets
  );
  const placeholders = new Map();
  widgets.forEach(({ importerFile, placeholder, file }) => {
    const routeFilename = input.get(importerFile) as string;
    const routeFile = join(fileURLToPath(config.output.server), routeFilename);

    if (!placeholders.has(routeFile)) {
      placeholders.set(routeFile, []);
    }

    const manifestKey = relative(fileURLToPath(config.root), file);
    const replaceValue = manifest[manifestKey]?.file;

    if (typeof replaceValue !== "string") {
      throw new Error(`Not found in manifest: ${manifestKey}`);
    }

    placeholders.get(routeFile).push([placeholder, replaceValue]);
  });

  await bundleWithVite(config, placeholders);
}

async function bundleWithVite(
  config: BuilderConfig,
  entrypoints: Record<string, string>,
  placeholders: Map<string, [placeholder: string, replaceValue: string][]>
) {
  return await build({
    logLevel: config.viteOptions.logLevel ?? "warn",
    plugins: [
      {
        name: "builder:write-placeholder",
        transform(code, id, options) {
          if (placeholders.has(id)) {
            placeholders.get(id)?.forEach(([placeholder, replaceValue]) => {
              code = code.replace(placeholder, replaceValue);
            });
            placeholders.delete(id);
            return code;
          }
        },
      },
    ],
    build: {
      emptyOutDir: false,
      outDir: fileURLToPath(config.output.server),
      sourcemap: false,
      rollupOptions: {
        input: entrypoints,
      },
    },
  });
}

function getModulepreloadLinks(
  base: string,
  manifest: Manifest,
  hrefs: string[]
) {
  return uniq(resolveManifestEntries(manifest, hrefs)).map(
    (href) => base + href
  );
}

function resolveManifestEntries(
  manifest: Manifest,
  entryNames: string[]
): string[] {
  return entryNames.flatMap((entryName) => {
    const entry = manifest[entryName];
    return [
      entry.file,
      ...resolveManifestEntries(manifest, entry.imports || []),
    ];
  });
}

async function parseManifest(outDir: string, widgets: WidgetDefinition[]) {
  const manifestPath = join(outDir, manifest);
  try {
    return JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  } catch (err) {
    if (widgets.length > 0) throw err;
    return {};
  }
}
