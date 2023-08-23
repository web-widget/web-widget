import type {
  Manifest as ViteManifest,
  Plugin as VitePlugin,
  UserConfig as ViteUserConfig,
} from "vite";
import { basename, dirname, extname, join } from "node:path";
import { mergeConfig as mergeViteConfig, build as viteBuild } from "vite";

import type { BuilderConfig } from "../types";
import type { ManifestJSON } from "@web-widget/web-router";
import type { RollupOutput } from "rollup";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import { openConfig } from "../config";
import { resolve } from "import-meta-resolve";
import { withSpinner } from "./utils";
import builtins from "builtin-modules";
import { appendWebWidgetMetaPlugin } from "./append-web-widget-meta";
import { replaceAssetPlugin } from "./replace-asset";

const VITE_MANIFEST_NAME = "manifest.json";
const VITE_SSR_MANIFEST_NAME = "ssr-manifest.json";
const WEB_WIDGET_FILE_NAME = "web-widget";
const WEB_WIDGET_CLIENT = "@web-widget/web-widget/client";
const WEB_WIDGET_CLIENT_MODULE_ID = fileURLToPath(
  resolve(WEB_WIDGET_CLIENT, import.meta.url)
);

type EntryPoints = Record<string, string>;

export async function build(root: string) {
  const start = Date.now();

  process.env.NODE_ENV = "production";
  const { builderConfig } = await openConfig({
    cwd: process.cwd(),
    cmd: "build",
    // mode: 'production'
  });

  await bundle(builderConfig);

  console.info(
    `build complete in ${((Date.now() - start) / 1000).toFixed(2)}s.`
  );
}

async function bundle(config: BuilderConfig) {
  const manifest = await parseManifest(config);
  const entryPoints = resolveEntryPoints(manifest, config);
  const clientResult = await withSpinner(
    "building client bundles",
    async () => await bundleWithVite(config, entryPoints, false)
  );

  const viteManifest = await parseViteManifest(
    fileURLToPath(config.output.client)
  );

  const viteSsrManifest = await parseViteSdrManifest(
    fileURLToPath(config.output.client)
  );

  const serverResult = await withSpinner(
    "building server bundles",
    async () =>
      await bundleWithVite(
        config,
        entryPoints,
        true,
        viteManifest,
        viteSsrManifest
      ).then(async (serverResult) => {
        await buildRouteMap(manifest, config, serverResult);
        return serverResult;
      })
  );

  return { clientResult, serverResult };
}

// Internal: Creates a client and server bundle.
// NOTE: The client bundle is used only to obtain styles, JS entry is discarded.
async function bundleWithVite(
  config: BuilderConfig,
  entryPoints: string[] | EntryPoints,
  isServer: boolean,
  viteManifest?: ViteManifest,
  viteSsrManifest?: Record<string, string[]>
) {
  const vite = mergeViteConfig(config.vite, {
    base: config.base,
    cacheDir: fileURLToPath(config.cacheDir),
    publicDir: isServer ? false : fileURLToPath(config.publicDir),
    root: fileURLToPath(config.root),
    define: {},
    logLevel: config.vite.logLevel ?? "warn",
    ssr: isServer
      ? {
          noExternal:
            config.vite.ssr?.noExternal ??
            (config.vite.ssr?.target === "node" ? false : true),
          target: config.vite.ssr?.target ?? "webworker",
        }
      : undefined,
    resolve: isServer
      ? {
          // https://github.com/vitejs/vite/issues/6401
          // https://webpack.js.org/guides/package-exports/
          conditions: ["worklet", "worker", "import", "module", "default"],
        }
      : undefined,
    plugins: [
      //!isServer && removeEntryPlugin([WEB_WIDGET_CLIENT_MODULE_ID]),
      isServer && addESMPackagePlugin(config),
      isServer &&
        viteManifest &&
        appendWebWidgetMetaPlugin({
          manifest: viteManifest,
          include: [...Object.values(entryPoints)],
        }),
      isServer &&
        viteManifest &&
        replaceAssetPlugin({ manifest: [viteSsrManifest!, viteManifest!] }),
    ],
    build: {
      ssr: isServer,
      cssCodeSplit: true,
      minify: isServer ? false : "esbuild",
      emptyOutDir: true,
      ssrEmitAssets: false,
      outDir: fileURLToPath(
        isServer ? config.output.server : config.output.client
      ),
      sourcemap: false,
      manifest: isServer ? false : VITE_MANIFEST_NAME,
      ssrManifest: isServer ? false : VITE_SSR_MANIFEST_NAME,
      rollupOptions: {
        input: {
          ...entryPoints,
          [WEB_WIDGET_FILE_NAME]: WEB_WIDGET_CLIENT_MODULE_ID,
        },
        preserveEntrySignatures: "allow-extension",
        treeshake: true,
        external: isServer ? (builtins as string[]) : [],
        output: isServer
          ? {
              entryFileNames: `${config.output.asset}/[name].js`,
              assetFileNames: `${config.output.asset}/[name][extname]`,
              chunkFileNames: `${config.output.asset}/[name].js`,
            }
          : {
              entryFileNames: `${config.output.asset}/[name]-[hash].js`,
              assetFileNames: `${config.output.asset}/[name]-[hash][extname]`,
              chunkFileNames: `${config.output.asset}/[name]-[hash].js`,
            },
      },
      server: {
        host: config.server.host,
        port: config.server.port,
      },
    },
  } as ViteUserConfig);
  return (await viteBuild(vite)) as RollupOutput;
}

function resolveEntryPoints(
  manifest: ManifestJSON,
  config: BuilderConfig
): EntryPoints {
  const entryPoints: EntryPoints = {};
  const getEntrypoint = (file: string) => {
    const modulePath = join(dirname(fileURLToPath(config.input)), file);
    const name = modulePath
      .slice(0, modulePath.length - extname(modulePath).length)
      .replace(fileURLToPath(config.root), "")
      .replace(/^src\//, "")
      .split("/")
      .join("-");
    return [name, modulePath];
  };

  for (const value of Object.values(manifest)) {
    if (Array.isArray(value)) {
      for (const mod of value) {
        const [name, file] = getEntrypoint(mod.module);
        entryPoints[name] = file;
      }
    } else {
      const [name, file] = getEntrypoint(value.module);
      entryPoints[name] = file;
    }
  }

  return entryPoints;
}

// function removeEntryPlugin(exclude: string[]): VitePlugin {
//   return {
//     name: "builder:remove-entry",
//     generateBundle(options, bundle) {
//       Object.keys(bundle).forEach((fileName) => {
//         const chunk = bundle[fileName];
//         const type = chunk.type;

//         if (
//           type === "chunk" &&
//           chunk.isEntry &&
//           !exclude.includes(chunk.facadeModuleId as string)
//         ) {
//           delete bundle[fileName];
//         }
//       });
//     },
//   };
// }

// Internal: Add a `package.json` file specifying the type of files as MJS.
function addESMPackagePlugin(config: BuilderConfig): VitePlugin {
  return {
    name: "builder:add-esm-package",
    async writeBundle() {
      await fs.writeFile(
        join(fileURLToPath(config.output.server), "package.json"),
        JSON.stringify({ type: "module" })
      );
    },
  };
}

export async function buildRouteMap(
  manifest: ManifestJSON,
  config: BuilderConfig,
  output: RollupOutput
) {
  const imports: string[] = [];
  function getImportModule(module: string) {
    const moduleId = join(dirname(fileURLToPath(config.input)), module);
    const chunk = output.output.find(
      (chunk) => chunk.type === "chunk" && chunk.facadeModuleId === moduleId
    );

    if (!chunk) {
      throw new Error(
        `Unable to build routemap.` +
          ` Since "${module}" is not found in Rollup's output,` +
          ` it is recommended to try renaming the file: ${moduleId}`
      );
    }

    const source = "./" + chunk.fileName;
    imports.push(source);

    return source;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping
  function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
  }

  // eslint-disable-next-line no-template-curly-in-string
  // const basePlaceholder = "${workspace}";

  const json = Object.entries(manifest).reduce(
    (manifest, [key, value]) => {
      if (Array.isArray(value)) {
        // @ts-ignore
        manifest[key] = [];
        value.forEach((mod) => {
          // @ts-ignore
          manifest[key].push({
            ...mod,
            module: getImportModule(mod.module),
          });
        });
      } else if (value.module) {
        // @ts-ignore
        manifest[key] = {
          ...value,
          module: getImportModule(value.module),
        };
      } else {
        // @ts-ignore
        manifest[key] = value;
      }
      return manifest;
    },
    {
      //  base: basePlaceholder,
    } as ManifestJSON
  );

  const input = fileURLToPath(config.input);
  const jsonCode = JSON.stringify(json, null, 2);
  const jsCode =
    imports
      .map((module, index) => `import * as _${index} from "${module}";`)
      .join("\n") +
    "\n\n" +
    `export default ${imports.reduce((jsonCode, source, index) => {
      jsonCode = jsonCode.replaceAll(
        new RegExp(`(\\s*)${escapeRegExp(`"module": "${source}"`)}`, "g"),
        `$1"source": "${source}",$1"module": _${index}`
      );
      return jsonCode;
    }, jsonCode)}`; /*.replace(
      JSON.stringify(basePlaceholder),
      `new URL("./", import.meta.url).href`
    )*/

  const definitionCode = `import type { Manifest } from '@web-widget/web-router';\nexport default {} as Manifest`;

  await Promise.all([
    fs.writeFile(
      join(
        fileURLToPath(config.output.server),
        basename(input.replace(extname(input), ".json"))
      ),
      jsonCode
    ),
    fs.writeFile(
      join(
        fileURLToPath(config.output.server),
        basename(input.replace(extname(input), ".js"))
      ),
      jsCode
    ),
    fs.writeFile(
      join(
        fileURLToPath(config.output.server),
        basename(input.replace(extname(input), ".d.ts"))
      ),
      definitionCode
    ),
  ]);
}

async function parseViteManifest(outDir: string): Promise<ViteManifest> {
  const manifestPath = join(outDir, VITE_MANIFEST_NAME);
  return JSON.parse(await fs.readFile(manifestPath, "utf-8"));
}

async function parseViteSdrManifest(
  outDir: string
): Promise<Record<string, string[]>> {
  const manifestPath = join(outDir, VITE_SSR_MANIFEST_NAME);
  return JSON.parse(await fs.readFile(manifestPath, "utf-8"));
}

async function parseManifest(config: BuilderConfig): Promise<ManifestJSON> {
  const manifestPath = fileURLToPath(config.input);
  return JSON.parse(await fs.readFile(manifestPath, "utf-8"));
}
