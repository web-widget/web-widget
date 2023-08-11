import * as esModuleLexer from "es-module-lexer";

import type {
  LinkDescriptor,
  Meta,
  ScriptDescriptor,
} from "@web-widget/schema";
import type {
  Manifest as ViteManifest,
  Plugin as VitePlugin,
  UserConfig as ViteUserConfig,
} from "vite";
import { basename, dirname, extname, join, relative } from "node:path";
import { mergeConfig as mergeViteConfig, build as viteBuild } from "vite";

import type { BuilderConfig } from "../types";
import type { ManifestJSON } from "@web-widget/web-router";
import type { RollupOutput } from "rollup";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import mime from "mime-types";
import { openConfig } from "../config";
import { resolve } from "import-meta-resolve";
import { withSpinner } from "./utils";
import builtins from "builtin-modules";

const VITE_MANIFEST_NAME = "manifest.json";
const CLIENT_MODUL_NAME = "@web-widget/web-widget";
const CLIENT_NAME = "web-widget";
const CLIENT_ENTRY = fileURLToPath(resolve(CLIENT_MODUL_NAME, import.meta.url));

type Entrypoints = Record<string, string>;

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
  const chunkMap = new Map();
  const manifest = await parseManifest(config);
  const entrypoints = resolveEntrypoints(manifest, config);
  const clientResult = await withSpinner(
    "building client bundles",
    async () =>
      await bundleWithVite(
        config,
        {
          ...entrypoints,
          [CLIENT_NAME]: CLIENT_ENTRY,
        },
        false,
        chunkMap
      )
  );

  const viteManifest = await parseViteManifest(
    fileURLToPath(config.output.client)
  );
  const metaMap = getMetaMap(
    viteManifest,
    clientResult,
    fileURLToPath(config.root)
  );

  const serverResult = await withSpinner(
    "building server bundles",
    async () =>
      await bundleWithVite(config, entrypoints, true, chunkMap, metaMap).then(
        async (serverResult) => {
          await buildRoutemap(manifest, config, serverResult);
          return serverResult;
        }
      )
  );

  return { clientResult, serverResult };
}

// Internal: Creates a client and server bundle.
// NOTE: The client bundle is used only to obtain styles, JS entry is discarded.
async function bundleWithVite(
  config: BuilderConfig,
  entrypoints: string[] | Entrypoints,
  isServer: boolean,
  chunkMap: Map<string, string>,
  metaMap?: Map<string, Meta>
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
      //!isServer && removeEntryPlugin([CLIENT_ENTRY]),
      isServer && addESMPackagePlugin(config),
      chunkFileNamesPlugin(config, chunkMap),
      isServer && metaMap && injectionMetaPlugin(metaMap),
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
      rollupOptions: {
        input: entrypoints,
        preserveEntrySignatures: "allow-extension",
        treeshake: true,
        external: builtins as string[],
      },
      server: {
        host: config.server.host,
        port: config.server.port,
      },
    },
  } as ViteUserConfig);
  return (await viteBuild(vite)) as RollupOutput;
}

function resolveEntrypoints(
  manifest: ManifestJSON,
  config: BuilderConfig
): Entrypoints {
  const entrypoints: Entrypoints = {};
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
  config: BuilderConfig,
  chunkMap: Map<string, string>
): VitePlugin[] {
  let isServer = false;
  const inputFileNamesCache = new Map();
  const bareImportRE = /^(?![a-zA-Z]:)[\w@](?!.*:\/\/)/;
  const chunkNameCache = new Set();
  return [
    {
      name: "builder:rename-output-filenames",
      config(userConfig) {
        isServer = !!userConfig?.build?.ssr;
        return {
          build: {
            rollupOptions: {
              output: {
                entryFileNames: `${config.output.asset}/[name]-[hash].js`,
                assetFileNames: `${config.output.asset}/[name]-[hash][extname]`,
                chunkFileNames: `${config.output.asset}/[name]-[hash].js`,
              },
            },
          },
        };
      },
      generateBundle(options, bundle) {
        Object.keys(bundle).forEach((fileName) => {
          const chunk = bundle[fileName];
          let id = chunk.type === "chunk" ? chunk.facadeModuleId : null;

          if (!id) {
            if (!chunk.name) {
              return;
            }

            if (chunkNameCache.has(chunk.name)) {
              throw new Error(
                `chunk.name conflict, please try renaming the file name.`
              );
            }

            id = chunk.name;
            chunkNameCache.add(chunk.name);
          }

          if (isServer) {
            const newFileName = chunkMap.get(id);
            if (typeof newFileName === "string") {
              inputFileNamesCache.set(chunk.fileName, newFileName);
            }
          } else {
            chunkMap.set(id, fileName);
          }
        });
      },
    },
    {
      name: "builder:rename-input-filenames",
      async generateBundle(_options, bundle) {
        if (!isServer) {
          return;
        }

        await esModuleLexer.init;
        const getNewFileName = (fileName: string) =>
          inputFileNamesCache.get(fileName) || fileName;

        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== "chunk") {
            continue;
          }

          const [imports] = esModuleLexer.parse(chunk.code, chunk.fileName);

          for (const { n: module /*,s: _start, e: _end*/ } of imports) {
            if (module && !bareImportRE.test(module)) {
              const fileName = join(dirname(chunk.fileName), module);
              // chunk.code =
              //   chunk.code.slice(0, start) +
              //   getNewFileName(fileName) +
              //   chunk.code.slice(chunk.code.length - end);
              chunk.code = chunk.code.replace(
                module,
                "./" +
                  relative(dirname(chunk.fileName), getNewFileName(fileName))
              );
            }
          }

          chunk.imports = chunk.imports.map(getNewFileName);
          chunk.dynamicImports = chunk.dynamicImports.map(getNewFileName);
          chunk.importedBindings = Object.entries(
            chunk.importedBindings
          ).reduce(
            (map, [key, value]) => {
              map[key] = value;
              return map;
            },
            {} as { [imported: string]: string[] }
          );
          chunk.implicitlyLoadedBefore =
            chunk.implicitlyLoadedBefore.map(getNewFileName);

          const newFileName = getNewFileName(chunk.fileName);
          delete bundle[chunk.fileName];
          chunk.fileName = newFileName;
          bundle[newFileName] = chunk;
        }
      },
    },
  ];
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

function injectionMetaPlugin(metaMap: Map<string, Meta>): VitePlugin {
  // let config: ViteResolvedConfig;
  return {
    name: "builder:injection-meta",
    // configResolved(resolvedConfig) {
    //   config = resolvedConfig;
    // },
    enforce: "post",
    async generateBundle(_options, bundle) {
      await esModuleLexer.init;

      Object.keys(bundle).forEach((fileName) => {
        const chunk = bundle[fileName];
        const type = chunk.type;
        // const srcFileName =
        //   type === "chunk" &&
        //   chunk.facadeModuleId &&
        //   relative(config.root, chunk.facadeModuleId);
        const meta = metaMap.get(fileName);

        if (
          type !== "chunk" ||
          !chunk.isEntry ||
          chunk.facadeModuleId === CLIENT_ENTRY ||
          !meta
        ) {
          return;
        }

        const [, exports] = esModuleLexer.parse(chunk.code, chunk.fileName);

        if (exports.some(({ n }) => n === "meta")) {
          chunk.code += [
            `try {`,
            `  const link = ${JSON.stringify(meta.link)};`,
            `  const script = ${JSON.stringify(meta.script)};`,
            `  meta.link ? meta.link.push(...link) : (meta.link = link);`,
            `  meta.script ? meta.script.push(...script) : (meta.script = script);`,
            `} catch(e) {`,
            `  throw new Error("@web-widget/builder: Failed to attach meta.", e);`,
            `}`,
          ].join("\n");
        } else {
          chunk.code += [
            `export const meta = {`,
            `  link: ${JSON.stringify(meta.link)},`,
            `  script: ${JSON.stringify(meta.script)},`,
            `};`,
          ].join("\n");
        }
      });
    },
  };
}

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

function getMetaMap(
  manifest: ViteManifest,
  clientResult: RollupOutput,
  rootDir: string
): Map<string, Meta> {
  const webWidgetFileName = clientResult.output.find(
    (chunk) => chunk.type === "chunk" && chunk.facadeModuleId === CLIENT_ENTRY
  )?.fileName;
  const webWidgetSrcName = relative(rootDir, CLIENT_ENTRY);

  const rebase = (src: string, importer: string) =>
    relative(dirname(importer), src);

  return clientResult.output.reduce((map, chunk) => {
    const srcFileName =
      chunk.type === "chunk" &&
      chunk.facadeModuleId &&
      relative(rootDir, chunk.facadeModuleId);

    map.set(chunk.fileName, {
      script: webWidgetFileName
        ? [
            {
              type: "importmap",
              content: JSON.stringify({
                imports: {
                  [CLIENT_MODUL_NAME]: rebase(
                    webWidgetFileName,
                    chunk.fileName
                  ),
                },
              }),
            } as ScriptDescriptor,
          ]
        : [],
      link: (srcFileName
        ? [
            ...getLinks(manifest, webWidgetSrcName, true),
            ...getLinks(manifest, srcFileName, false),
          ]
        : []
      ).map(({ href, ...arrts }) => {
        if (href) {
          return {
            ...arrts,
            href: rebase(href, chunk.fileName),
          };
        } else {
          return arrts;
        }
      }),
    });
    return map;
  }, new Map());
}

function getLinks(
  manifest: ViteManifest,
  srcFileName: string,
  containSelf: boolean,
  cache = new Map()
): LinkDescriptor[] {
  if (cache.has(srcFileName)) {
    return [];
  }

  cache.set(srcFileName, true);

  const links: LinkDescriptor[] = [];
  const item = manifest[srcFileName];
  const push = (srcFileName: string) => {
    const ld = getLink(srcFileName);
    if (ld) {
      links.push(ld);
    }
  };

  if (containSelf) {
    push(item.file);
  }

  if (Array.isArray(item.assets)) {
    item.assets.forEach(push);
  }

  if (Array.isArray(item.css)) {
    item.css.forEach(push);
  }

  if (Array.isArray(item.imports)) {
    item.imports?.forEach((srcFileName) => {
      links.push(
        ...getLinks(manifest, srcFileName, true, cache)
          // Note: In the web router, all client components are loaded asynchronously.
          .filter((link) => link.rel !== "modulepreload")
      );
    });
  }

  if (Array.isArray(item.dynamicImports)) {
    item.dynamicImports?.forEach((srcFileName) => {
      links.push(...getLinks(manifest, srcFileName, true, cache));
    });
  }

  return links;
}

function getLink(fileName: string): LinkDescriptor | null {
  if (fileName.endsWith(".js")) {
    return {
      crossorigin: "",
      href: fileName,
      rel: "modulepreload",
    };
  } else if (fileName.endsWith(".css")) {
    return {
      href: fileName,
      rel: "stylesheet",
    };
  }

  const ext = extname(fileName);
  const type = mime.lookup(ext);
  const asValue = type ? type.split("/")[0] : "";

  if (type && ["image", "font"].includes(asValue)) {
    return {
      as: asValue,
      ...(asValue === "font" ? { crossorigin: "" } : {}),
      href: fileName,
      rel: "preload",
      type,
    };
  }

  return null;
}

export async function buildRoutemap(
  manifest: ManifestJSON,
  config: BuilderConfig,
  output: RollupOutput
) {
  const imports: string[] = [];
  function importModule(module: string) {
    const fileId = join(dirname(fileURLToPath(config.input)), module);
    const chunk = output.output.find(
      (chunk) => chunk.type === "chunk" && chunk.facadeModuleId === fileId
    );

    if (!chunk) {
      throw new Error(`Module not found`);
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
            module: importModule(mod.module),
          });
        });
      } else if (value.module) {
        // @ts-ignore
        manifest[key] = {
          ...value,
          module: importModule(value.module),
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
  ]);
}

async function parseViteManifest(outDir: string): Promise<ViteManifest> {
  const manifestPath = join(outDir, VITE_MANIFEST_NAME);
  return JSON.parse(await fs.readFile(manifestPath, "utf-8"));
}

async function parseManifest(config: BuilderConfig): Promise<ManifestJSON> {
  const manifestPath = fileURLToPath(config.input);
  return JSON.parse(await fs.readFile(manifestPath, "utf-8"));
}
