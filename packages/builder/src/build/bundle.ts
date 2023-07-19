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
import { Meta, DocumentLink } from "@web-widget/web-server";
import { parse, init } from "es-module-lexer";

type Entrypoints = Record<string, string>;
type FileNamesCache = [Map<string, string>, Map<string, string>];

// Internal: Bundles the widgets app for both client and server.
//
// Multi-entry build: every page is considered an entry chunk.
export async function bundle(config: BuilderConfig) {
  const cache = [new Map(), new Map()] as FileNamesCache;
  const entrypoints = resolveEntrypoints(config);

  const clientResult = await bundleWithVite(config, entrypoints, false, cache);

  const meta = getMeta(clientResult);

  const serverResult = await bundleWithVite(
    config,
    entrypoints,
    true,
    cache,
    meta
  );

  return { clientResult, serverResult };
}

// Internal: Creates a client and server bundle.
// NOTE: The client bundle is used only to obtain styles, JS entry is discarded.
async function bundleWithVite(
  config: BuilderConfig,
  entrypoints: string[] | Entrypoints,
  isServer: boolean,
  cache: FileNamesCache,
  meta?: Meta
) {
  const vite = mergeViteConfig(config.vite, {
    base: config.base,
    cacheDir: fileURLToPath(config.cacheDir),
    publicDir: fileURLToPath(config.publicDir),
    root: fileURLToPath(config.root),
    define: {},
    logLevel: config.vite.logLevel ?? "warn",
    ssr: {
      external: [],
      noExternal: [],
    },
    plugins: [
      !isServer && removeEntryPlugin(),
      isServer && injectionMetaPlugin(meta),
      isServer && addESMPackagePlugin(config),
      chunkFileNamesPlugin(cache),
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
  return (await build(vite)) as RollupOutput;
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
function chunkFileNamesPlugin([
  oldFileNameCache,
  renamed,
]: FileNamesCache): Plugin[] {
  return [
    {
      name: "builder:fileNames:rename-chunks",
      enforce: "pre",
      generateBundle(options, bundle) {
        Object.keys(bundle).forEach((fileName) => {
          const chunk = bundle[fileName];
          const type = chunk.type;

          if (type === "chunk" && chunk.facadeModuleId) {
            if (oldFileNameCache.has(chunk.facadeModuleId)) {
              const oldFileName = chunk.fileName;
              const newFileName = oldFileNameCache.get(
                chunk.facadeModuleId
              ) as string;

              renamed.set(oldFileName, newFileName);
              chunk.fileName = newFileName;
              bundle[newFileName] = chunk;
              delete bundle[oldFileName];
            } else {
              oldFileNameCache.set(chunk.facadeModuleId, fileName);
            }
          }
        });
      },
    },
    {
      name: "builder:fileNames:rename-imports",
      enforce: "post",
      generateBundle(options, bundle) {
        const rename = (fileName: string) => renamed.get(fileName) || fileName;

        Object.keys(bundle).forEach((fileName) => {
          const chunk = bundle[fileName];
          const type = chunk.type;
          if (type === "chunk") {
            chunk.imports = chunk.imports.map(rename);
            chunk.dynamicImports = chunk.dynamicImports.map(rename);
            for (const [oldFileName, newFileName] of renamed) {
              const newCode = chunk.code.replaceAll(oldFileName, newFileName);
              chunk.code = newCode;
            }
          }
        });
      },
    },
  ];
}

function removeEntryPlugin(): Plugin {
  return {
    name: "builder:remove-entry",
    generateBundle(options, bundle) {
      Object.keys(bundle).forEach((fileName) => {
        const chunk = bundle[fileName];
        const type = chunk.type;

        if (type === "chunk" && chunk.isEntry) {
          delete bundle[fileName];
        }
      });
    },
  };
}

function injectionMetaPlugin(meta: Meta): Plugin {
  return {
    name: "builder:injection-meta",
    async generateBundle(options, bundle) {
      await init;

      Object.keys(bundle).forEach((fileName) => {
        const chunk = bundle[fileName];
        const type = chunk.type;

        if (type !== "chunk" || !chunk.isEntry) {
          return;
        }

        const [_, exports] = parse(chunk.code);

        if (exports.find(({ s, e }) => chunk.code.slice(s, e) === "meta")) {
          chunk.code += `
try {
  const assets = ${JSON.stringify(meta.link)};
  if (meta.link) {
    meta.link = Array.isArray(meta.link) ? meta.link.push(...assets) : [assets];
  } else {
    meta.link = assets;
  }
} catch(e) {
  throw new Error("Builder: No meta variable found.", e);
}`;
        } else {
          chunk.code += `
export const meta = {
  link: ${JSON.stringify(meta.link)}
};
`;
        }
      });
    },
  };
}

// Internal: Add a `package.json` file specifying the type of files as MJS.
function addESMPackagePlugin(config: BuilderConfig) {
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

function getMeta(clientResult: RollupOutput): Meta {
  const meta = {
    link: [] as DocumentLink[],
  };

  for (const chunk of clientResult.output.values()) {
    const fileName = chunk.fileName;
    const type = chunk.type;
    const asset = type === "asset";

    if (fileName.endsWith(".js")) {
      meta.link!.push({
        crossOrigin: true,
        href: fileName,
        rel: "modulepreload",
      });
    } else if (asset && fileName.endsWith(".css")) {
      meta.link!.push({
        href: fileName,
        rel: "stylesheet",
      });
    } else if (asset && fileName.endsWith(".woff")) {
      meta.link!.push({
        as: "font",
        crossOrigin: true,
        href: fileName,
        rel: "preload",
        type: "font/woff",
      });
    } else if (asset && fileName.endsWith(".woff2")) {
      meta.link!.push({
        as: "font",
        crossOrigin: true,
        href: fileName,
        rel: "preload",
        type: "font/woff2",
      });
    } else if (asset && fileName.endsWith(".gif")) {
      meta.link!.push({
        as: "image",
        href: fileName,
        rel: "preload",
        type: "image/gif",
      });
    } else if (
      asset &&
      (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg"))
    ) {
      meta.link!.push({
        as: "image",
        href: fileName,
        rel: "preload",
        type: "image/jpeg",
      });
    } else if (asset && fileName.endsWith(".png")) {
      meta.link!.push({
        as: "image",
        href: fileName,
        rel: "preload",
        type: "image/png",
      });
    }
  }

  return meta;
}
