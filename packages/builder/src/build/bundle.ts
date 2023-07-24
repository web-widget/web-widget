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
import { Meta, LinkDescriptor, ScriptDescriptor } from "@web-widget/schema";
import { parse, init } from "es-module-lexer";
import { resolve } from "import-meta-resolve";

const clientModuleName = "@web-widget/web-server/client";
const CLIENT_ENTRY = fileURLToPath(resolve(clientModuleName, import.meta.url));

type Entrypoints = Record<string, string>;
type FileNamesCache = [Map<string, string>, Map<string, string>];

export async function bundle(config: BuilderConfig) {
  const cache = [new Map(), new Map()] as FileNamesCache;
  const entrypoints = resolveEntrypoints(config);

  const clientResult = await bundleWithVite(
    config,
    {
      ...entrypoints,
      [`${config.output.asset}/entry-client`]: CLIENT_ENTRY,
    },
    false,
    cache
  );

  const meta: Meta = {
    script: [
      {
        type: "importmap",
        content: JSON.stringify({
          imports: {
            [clientModuleName]: clientResult.output.find(
              (chunk) =>
                chunk.type === "chunk" && chunk.facadeModuleId === CLIENT_ENTRY
            )?.fileName,
          },
        }),
      },
    ] as ScriptDescriptor[],
    link: getLinks(clientResult),
  };

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
      !isServer && removeEntryPlugin([CLIENT_ENTRY]),
      isServer && injectionMetaPlugin(meta || {}),
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
  outputNamesCache,
  inputNamesCache,
]: FileNamesCache): Plugin[] {
  return [
    {
      name: "builder:rename-output-filenames",
      enforce: "pre",
      generateBundle(options, bundle) {
        Object.keys(bundle).forEach((fileName) => {
          const chunk = bundle[fileName];
          const type = chunk.type;

          if (type === "chunk" && chunk.facadeModuleId) {
            if (outputNamesCache.has(chunk.facadeModuleId)) {
              const oldFileName = chunk.fileName;
              const newFileName = outputNamesCache.get(
                chunk.facadeModuleId
              ) as string;

              inputNamesCache.set(oldFileName, newFileName);
              chunk.fileName = newFileName;
              bundle[newFileName] = chunk;
              delete bundle[oldFileName];
            } else {
              outputNamesCache.set(chunk.facadeModuleId, fileName);
            }
          }
        });
      },
    },
    {
      name: "builder:rename-input-filenames",
      enforce: "post",
      generateBundle(options, bundle) {
        const rename = (fileName: string) =>
          inputNamesCache.get(fileName) || fileName;

        Object.keys(bundle).forEach((fileName) => {
          const chunk = bundle[fileName];
          const type = chunk.type;
          if (type === "chunk") {
            chunk.imports = chunk.imports.map(rename);
            chunk.dynamicImports = chunk.dynamicImports.map(rename);
            for (const [oldFileName, newFileName] of inputNamesCache) {
              const newCode = chunk.code.replaceAll(oldFileName, newFileName);
              chunk.code = newCode;
            }
          }
        });
      },
    },
  ];
}

function removeEntryPlugin(exclude: string[]): Plugin {
  return {
    name: "builder:remove-entry",
    generateBundle(options, bundle) {
      Object.keys(bundle).forEach((fileName) => {
        const chunk = bundle[fileName];
        const type = chunk.type;

        if (
          type === "chunk" &&
          chunk.isEntry &&
          !exclude.includes(chunk.facadeModuleId as string)
        ) {
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
  const link = ${JSON.stringify(meta.link)};
  const script = ${JSON.stringify(meta.script)};
  meta.link = meta.link ? meta.link.push(...link) : link;
  meta.script = meta.script ? meta.script.push(...script) : script;
} catch(e) {
  throw new Error("Builder: No meta variable found.", e);
}`;
        } else {
          chunk.code += `
export const meta = {
  link: ${JSON.stringify(meta.link)},
  script: ${JSON.stringify(meta.script)}
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

function getLinks(clientResult: RollupOutput): LinkDescriptor[] {
  const links: LinkDescriptor[] = [];

  for (const chunk of clientResult.output.values()) {
    const fileName = chunk.fileName;
    const type = chunk.type;
    const asset = type === "asset";

    if (fileName.endsWith(".js")) {
      links.push({
        crossorigin: "",
        href: fileName,
        rel: "modulepreload",
      });
    } else if (asset && fileName.endsWith(".css")) {
      links.push({
        href: fileName,
        rel: "stylesheet",
      });
    } else if (asset && fileName.endsWith(".woff")) {
      links.push({
        as: "font",
        crossorigin: "",
        href: fileName,
        rel: "preload",
        type: "font/woff",
      });
    } else if (asset && fileName.endsWith(".woff2")) {
      links.push({
        as: "font",
        crossorigin: "",
        href: fileName,
        rel: "preload",
        type: "font/woff2",
      });
    } else if (asset && fileName.endsWith(".gif")) {
      links.push({
        as: "image",
        href: fileName,
        rel: "preload",
        type: "image/gif",
      });
    } else if (
      asset &&
      (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg"))
    ) {
      links.push({
        as: "image",
        href: fileName,
        rel: "preload",
        type: "image/jpeg",
      });
    } else if (asset && fileName.endsWith(".png")) {
      links.push({
        as: "image",
        href: fileName,
        rel: "preload",
        type: "image/png",
      });
    }
  }

  return links;
}
