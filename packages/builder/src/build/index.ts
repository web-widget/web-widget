import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import type { RollupOutput } from "rollup";
import { join, extname, relative, dirname, basename } from "node:path";
import { build as viteBuild, mergeConfig as mergeViteConfig } from "vite";
import mime from "mime-types";
import type {
  Plugin as VitePlugin,
  UserConfig as ViteUserConfig,
  // ResolvedConfig as ViteResolvedConfig,
  Manifest as ViteManifest,
} from "vite";
import type { BuilderConfig } from "../types";
import type {
  Meta,
  LinkDescriptor,
  ScriptDescriptor,
} from "@web-widget/schema";
import type { Manifest } from "@web-widget/web-router";
import { parse, init } from "es-module-lexer";
import { resolve } from "import-meta-resolve";
import { openConfig } from "../config";
import { withSpinner } from "./utils";

const CLIENT_MODUL_ENAME = "@web-widget/web-widget";
const CLIENT_ENTRY = fileURLToPath(
  resolve(CLIENT_MODUL_ENAME, import.meta.url)
);

type Entrypoints = Record<string, string>;
type FileNamesCache = [Map<string, string>, Map<string, string>];

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
  const cache = [new Map(), new Map()] as FileNamesCache;
  const manifest = await parseManifest(config);
  const entrypoints = resolveEntrypoints(manifest, config);
  const clientResult = await withSpinner(
    "building client bundles",
    async () =>
      await bundleWithVite(
        config,
        {
          ...entrypoints,
          [`${config.output.asset}/web-widget`]: CLIENT_ENTRY,
        },
        false,
        cache
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
      await bundleWithVite(config, entrypoints, true, cache, metaMap).then(
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
  cache: FileNamesCache,
  metaMap?: Map<string, Meta>
) {
  const vite = mergeViteConfig(config.vite, {
    base: config.base,
    cacheDir: fileURLToPath(config.cacheDir),
    publicDir: fileURLToPath(config.publicDir),
    root: fileURLToPath(config.root),
    define: {},
    logLevel: config.vite.logLevel ?? "warn",
    ssr: isServer
      ? {
          target: "webworker",
          format: "esm",
          //external: ["@web-server/web-router"],
          noExternal: true,
        }
      : undefined,
    resolve: isServer
      ? {
          // https://github.com/vitejs/vite/issues/6401
          // https://webpack.js.org/guides/package-exports/
          conditions: ["import", "module", "worklet", "worker", "default"],
        }
      : undefined,
    plugins: [
      //!isServer && removeEntryPlugin([CLIENT_ENTRY]),
      isServer && metaMap && injectionMetaPlugin(metaMap),
      isServer && addESMPackagePlugin(config),
      chunkFileNamesPlugin(cache),
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
      manifest: !isServer,
      rollupOptions: {
        input: entrypoints,
        preserveEntrySignatures: "allow-extension",
        treeshake: true,
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
  return (await viteBuild(vite)) as RollupOutput;
}

function resolveEntrypoints(
  manifest: Manifest,
  config: BuilderConfig
): Entrypoints {
  const entrypoints: Entrypoints = {};
  const getEntrypoint = (file: string) => {
    const modulePath = join(dirname(fileURLToPath(config.input)), file);
    const name = modulePath.slice(
      0,
      modulePath.length - extname(modulePath).length
    );
    return [name.replace(fileURLToPath(config.root), ""), modulePath];
  };

  for (const [_key, value] of Object.entries(manifest)) {
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
]: FileNamesCache): VitePlugin[] {
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

function removeEntryPlugin(exclude: string[]): VitePlugin {
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

function injectionMetaPlugin(metaMap: Map<string, Meta>): VitePlugin {
  // let config: ViteResolvedConfig;
  return {
    name: "builder:injection-meta",
    // configResolved(resolvedConfig) {
    //   config = resolvedConfig;
    // },
    async generateBundle(options, bundle) {
      await init;

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

function getMetaMap(
  manifest: ViteManifest,
  clientResult: RollupOutput,
  rootDir: string
): Map<string, Meta> {
  const clientModuleFileName = clientResult.output.find(
    (chunk) => chunk.type === "chunk" && chunk.facadeModuleId === CLIENT_ENTRY
  )?.fileName;
  const rebase = (src: string, importer: string) =>
    relative(dirname(importer), src);

  return clientResult.output.reduce((map, chunk) => {
    const srcFileName =
      chunk.type === "chunk" &&
      chunk.facadeModuleId &&
      relative(rootDir, chunk.facadeModuleId);
    map.set(chunk.fileName, {
      script: clientModuleFileName
        ? [
            {
              type: "importmap",
              content: JSON.stringify({
                imports: {
                  [CLIENT_MODUL_ENAME]: rebase(
                    clientModuleFileName,
                    chunk.fileName
                  ),
                },
              }),
            } as ScriptDescriptor,
          ]
        : [],
      link: (srcFileName ? getLinks(manifest, srcFileName, false) : []).map(
        ({ href, ...arrts }) => {
          if (href) {
            return {
              ...arrts,
              href: rebase(href, chunk.fileName),
            };
          } else {
            return arrts;
          }
        }
      ),
    });
    return map;
  }, new Map());
}

function getLinks(
  manifest: ViteManifest,
  srcFileName: string,
  containSelf: boolean
): LinkDescriptor[] {
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
      links.push(...getLinks(manifest, srcFileName, true));
    });
  }

  if (Array.isArray(item.dynamicImports)) {
    item.dynamicImports?.forEach((srcFileName) => {
      links.push(...getLinks(manifest, srcFileName, true));
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
  manifest: Manifest,
  config: BuilderConfig,
  output: RollupOutput
) {
  function getModule(module: string) {
    const file = join(dirname(fileURLToPath(config.input)), module);
    const chunk = output.output.find(
      (chunk) => chunk.type === "chunk" && chunk.facadeModuleId === file
    );

    if (!chunk) {
      throw new Error(`Module not found`);
    }

    return "./" + chunk.fileName;
  }

  const json = Object.entries(manifest).reduce((manifest, [key, value]) => {
    if (Array.isArray(value)) {
      // @ts-ignore
      manifest[key] = [];
      value.forEach((mod) => {
        // @ts-ignore
        manifest[key].push({
          ...mod,
          module: getModule(mod.module),
        });
      });
    } else {
      // @ts-ignore
      manifest[key] = {
        ...value,
        module: getModule(value.module),
      };
    }
    return manifest;
  }, {});

  await fs.writeFile(
    join(
      fileURLToPath(config.output.server),
      basename(fileURLToPath(config.input))
    ),
    JSON.stringify(json, null, 2)
  );
}

async function parseViteManifest(outDir: string): Promise<ViteManifest> {
  const manifestPath = join(outDir, "manifest.json");
  return JSON.parse(await fs.readFile(manifestPath, "utf-8"));
}

async function parseManifest(config: BuilderConfig): Promise<Manifest> {
  const manifestPath = fileURLToPath(config.input);
  return JSON.parse(await fs.readFile(manifestPath, "utf-8"));
}
