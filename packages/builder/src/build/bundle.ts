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

// Internal: Bundles the widgets app for both client and server.
//
// Multi-entry build: every page is considered an entry chunk.
export async function bundle(config: BuilderConfig) {
  const chunkFileNamesCache = new Map();
  const entrypoints = resolveEntrypoints(config);

  const clientResult = await bundleWithVite(
    config,
    entrypoints,
    false,
    chunkFileNamesCache
  );

  const meta = getMeta(clientResult);

  const serverResult = await bundleWithVite(
    config,
    entrypoints,
    true,
    chunkFileNamesCache,
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
  chunkFileNamesCache: Map<string, string>,
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
          } else {
            chunkFileNamesCache.set(chunk.facadeModuleId, filename);
          }
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

function injectionMetaPlugin(meta: Meta): Plugin {
  return {
    name: "builder:injection-meta",
    async generateBundle(options, bundle) {
      await init;

      Object.keys(bundle).forEach((filename) => {
        const chunk = bundle[filename];
        const type = chunk.type;

        if (type !== "chunk" || !chunk.isEntry) {
          return;
        }

        const [_, exports] = parse(chunk.code);

        if (exports.find(({ s, e }) => chunk.code.slice(s, e) === "meta")) {
          chunk.code += `
try {
var link = ${JSON.stringify(meta.link)};
if (meta.link) {
  meta.link = meta.link.push(...link);
} else {
  meta.link = link;
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
    name: "builder:add-common-js-package-plugin",
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
    const fileName = "./" + chunk.fileName;
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
