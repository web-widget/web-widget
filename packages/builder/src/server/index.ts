import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { relative } from "node:path";
import pc from "picocolors";
import type { Manifest } from "@web-widget/web-server";
import type { Plugin, ServerOptions, UserConfig as ViteUserConfig } from "vite";
import type { BuilderConfig } from "../types";
import { createServer as createViteServer, mergeConfig } from "vite";
import { createViteLoader, ModuleLoader } from "../core/loader/index";
import { handleRequest } from "./request";
import { openConfig, resolveConfigPath } from "../config";

async function resolveManifest(
  devManifest: BuilderConfig["input"],
  loader: ModuleLoader
) {
  const devFiles: string[] = [];
  const moduleToFile = (module: URL) => {
    const file = fileURLToPath(module);
    devFiles.push(file);
    return file;
  };
  const manifest: Manifest = {
    routes: [],
    middlewares: [],
  };

  const resolveModule = (object: { module: URL }[] | { module: URL }) =>
    Array.isArray(object)
      ? Promise.all(
          object.map(({ module: file, ...values }) =>
            loader.import(moduleToFile(file)).then((module) => ({
              ...values,
              module,
              $devFile: file,
            }))
          )
        )
      : loader.import(moduleToFile(object.module)).then((module) => ({
          ...object,
          module,
          $devFile: object.module,
        }));

  for (const [key, value] of Object.entries(devManifest)) {
    // TODO fix type error
    // @ts-ignore
    manifest[key] = await resolveModule(value);
  }

  return {
    devFiles,
    manifest,
  };
}

function createVitePluginServer(config: BuilderConfig): Plugin {
  return {
    name: "@web-widget/builder:server",
    async configureServer(viteServer) {
      const configPath = (await resolveConfigPath({
        cwd: fileURLToPath(config.root),
        fs,
      })) as string;
      const loader = createViteLoader(viteServer);
      let manifest: { manifest: Manifest; devFiles: string[] };

      /** rebuild the route cache + manifest, as needed. */
      async function rebuildManifest(file: string) {
        if (file === configPath || manifest.devFiles.includes(file)) {
          viteServer.config.logger.info(
            pc.green(
              `${relative(
                fileURLToPath(config.root),
                file
              )} changed, restarting server...`
            ),
            { clear: true, timestamp: true }
          );
          await viteServer.close();
          // @ts-ignore
          global.__vite_start_time = Date.now();
          manifest = await resolveManifest(config.input, loader);
          const { viteServer: newServer } = await createServer(
            viteServer.config.root,
            viteServer.config.server
          );
          await newServer.listen();
        }
      }
      // Rebuild route manifest on file change, if needed.
      viteServer.watcher.on("add", rebuildManifest);
      viteServer.watcher.on("change", rebuildManifest);
      // viteServer.watcher.add(configPath);

      return async () => {
        // Note that this function has a name so other middleware can find it.
        viteServer.middlewares.use(async function widgetServerDevHandler(
          req,
          res
        ) {
          manifest = manifest || (await resolveManifest(config.input, loader));
          return handleRequest(manifest.manifest, viteServer, loader, req, res);
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
  const viteConfig = mergeConfig(builderConfig.vite, {
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
