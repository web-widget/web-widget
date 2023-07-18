import { fileURLToPath } from "node:url";
import type { Manifest } from "@web-widget/web-server";
import type { Plugin, ServerOptions, UserConfig as ViteUserConfig } from "vite";
import type { BuilderConfig } from "../types";
import { createServer as createViteServer, mergeConfig } from "vite";
import { createViteLoader, ModuleLoader } from "../core/loader/index";
import { handleRequest } from "./request";
import { openConfig } from "../config";

async function resolveManifest(
  devManifest: BuilderConfig["input"],
  loader: ModuleLoader
) {
  const manifest: Manifest = {
    routes: [],
    middlewares: [],
  };

  const resolveModule = (object: { module: URL }[] | { module: URL }) =>
    Array.isArray(object)
      ? Promise.all(
          object.map(({ module: file, ...values }) =>
            loader.import(fileURLToPath(file)).then((module) => ({
              ...values,
              module,
              $devFile: file,
            }))
          )
        )
      : loader.import(fileURLToPath(object.module)).then((module) => ({
          ...object,
          module,
          $devFile: object.module,
        }));

  for (const [key, value] of Object.entries(devManifest)) {
    // TODO fix type error
    // @ts-ignore
    manifest[key] = await resolveModule(value);
  }

  return manifest;
}

function createVitePluginServer(config: BuilderConfig): Plugin {
  return {
    name: "@web-widget/builder:server",
    async configureServer(viteServer) {
      const loader = createViteLoader(viteServer);
      let manifest: Manifest | void;

      /** rebuild the route cache + manifest, as needed. */
      async function rebuildManifest(
        needsManifestRebuild: boolean,
        _file: string
      ) {
        if (needsManifestRebuild) {
          // TODO 重载配置
          // manifest = await resolveManifest(config.input, loader);
        }
      }
      // Rebuild route manifest on file change, if needed.
      viteServer.watcher.on("add", rebuildManifest.bind(null, true));
      viteServer.watcher.on("unlink", rebuildManifest.bind(null, true));
      viteServer.watcher.on("change", rebuildManifest.bind(null, false));

      return async () => {
        // Note that this function has a name so other middleware can find it.
        viteServer.middlewares.use(async function widgetServerDevHandler(
          req,
          res
        ) {
          manifest = manifest || (await resolveManifest(config.input, loader));
          return handleRequest(manifest, viteServer, loader, req, res);
        });
      };
    },
  };
}

export async function createServer(
  root: string = process.cwd(),
  serverOptions: ServerOptions = {}
) {
  const { builderConfig } = await openConfig({
    cwd: process.cwd(),
    cmd: "server",
    // mode: 'dev'
  });
  const viteConfig = mergeConfig(builderConfig.viteConfig, {
    root,
    appType: "custom",
    plugins: [createVitePluginServer(builderConfig)],
    server: serverOptions,
  } as ViteUserConfig);

  return {
    //config,
    viteConfig,
    viteServer: await createViteServer(viteConfig),
  };
}
