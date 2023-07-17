import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import type { RollupOutput } from "rollup";
import { join, extname } from "node:path";
import {
  build,
  Plugin,
  mergeConfig as mergeViteConfig,
  UserConfig as ViteUserConfig,
} from "vite";
import { BuilderConfig } from "../types";

type Entrypoints = Record<string, string>;

// Internal: Bundles the widgets app for both client and server.
//
// Multi-entry build: every page is considered an entry chunk.
export async function bundle(config: BuilderConfig) {
  const chunkFileNamesCache = new Map();
  const entrypoints = resolveEntrypoints(config);
  const [clientResult, serverResult] = await Promise.all([
    bundleWithVite(config, entrypoints, false, chunkFileNamesCache),
    bundleWithVite(config, entrypoints, true, chunkFileNamesCache),
  ]);

  return { clientResult, serverResult };
}

// Internal: Creates a client and server bundle.
// NOTE: The client bundle is used only to obtain styles, JS entry is discarded.
async function bundleWithVite(
  config: BuilderConfig,
  entrypoints: string[] | Entrypoints,
  isServer: boolean,
  chunkFileNamesCache: Map<string, string>
) {
  const viteConfig = mergeViteConfig(config.viteOptions, {
    base: config.base,
    cacheDir: fileURLToPath(config.cacheDir),
    publicDir: fileURLToPath(config.publicDir),
    root: fileURLToPath(config.root),
    define: {},
    logLevel: config.viteOptions.logLevel ?? "warn",
    ssr: {
      external: [],
      noExternal: [],
    },
    plugins: [
      !isServer && removeEntryPlugin(),
      isServer && addESMPackagePlugin(config),
      chunkFileNamesPlugin(chunkFileNamesCache),
    ],
    build: {
      ssr: isServer,
      cssCodeSplit: false,
      minify: isServer ? false : "esbuild",
      emptyOutDir: true,
      ssrEmitAssets: false,
      outDir: fileURLToPath(
        isServer ? config.output.server : config.output.client
      ),
      sourcemap: false,
      rollupOptions: {
        input: entrypoints,
        preserveEntrySignatures: "allow-extension",
        treeshake: false,
        output: {
          entryFileNames: `[name]-[hash].js`,
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
  return (await build(viteConfig)) as RollupOutput;
}

function resolveEntrypoints(config: BuilderConfig): Entrypoints {
  const entrypoints: Entrypoints = {};
  const getEntrypoint = (url: URL) => {
    const module = fileURLToPath(url);
    const name = module.slice(0, module.length - extname(module).length);
    return [name.replace(fileURLToPath(config.root), ""), module];
  };

  for (const [key, value] of Object.entries(config.input)) {
    if (Array.isArray(value)) {
      for (const mod of value) {
        const [name, file] = getEntrypoint(mod.module);
        entrypoints[name] = file;
      }
    } else {
      const [name, file] = getEntrypoint(value.module);
      entrypoints[name] = file;
    }
  }

  return entrypoints;
}

// NOTE: Keep the relative paths of assets on the client and server consistent.
function chunkFileNamesPlugin(
  chunkFileNamesCache: Map<string, string>
): Plugin {
  return {
    name: "builder:filename",
    generateBundle(options, bundle) {
      Object.keys(bundle).forEach((filename) => {
        const chunk = bundle[filename];
        const type = chunk.type;

        if (type === "chunk" && chunk.facadeModuleId) {
          if (chunkFileNamesCache.has(chunk.facadeModuleId)) {
            const fixedname = chunkFileNamesCache.get(
              chunk.facadeModuleId
            ) as string;
            chunk.fileName = fixedname;
            bundle[fixedname] = chunk;
            delete bundle[filename];
          }

          chunkFileNamesCache.set(chunk.facadeModuleId, filename);
        }
      });
    },
  };
}

function removeEntryPlugin(): Plugin {
  return {
    name: "builder:client-js-removal",
    generateBundle(options, bundle) {
      Object.keys(bundle).forEach((filename) => {
        const chunk = bundle[filename];
        const type = chunk.type;

        if (type === "chunk" && chunk.isEntry) {
          delete bundle[filename];
        }
      });
    },
  };
}

// Internal: Add a `package.json` file specifying the type of files as MJS.
function addESMPackagePlugin(config: BuilderConfig) {
  return {
    name: "builder:add-common-js-package-plugin",
    async writeBundle() {
      await fs.writeFile(
        join(fileURLToPath(config.output.server), "package.json"),
        JSON.stringify({ type: "module" })
      );
    },
  };
}
