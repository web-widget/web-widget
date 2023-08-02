import { ModuleLoader, createViteLoader } from "../core/loader/index";
import type { Plugin, ServerOptions, UserConfig as ViteUserConfig } from "vite";
import { createServer as createViteServer, mergeConfig } from "vite";
import { join, relative } from "node:path";
import { openConfig, resolveConfigPath } from "../config";

import type { BuilderConfig } from "../types";
import type { Manifest } from "@web-widget/web-router";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { handleRequest } from "./request";
import pc from "picocolors";
import stripAnsi from "strip-ansi";

async function getModuleFiles(config: BuilderConfig, loader: ModuleLoader) {
  const modules: string[] = [];
  const json = await loader.import(
    config.base +
      relative(fileURLToPath(config.root), fileURLToPath(config.input))
  );
  const manifest: Manifest = json.default;

  Array.from(Object.entries(manifest)).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(({ module }) => {
        modules.push(join(fileURLToPath(config.root), module));
      });
    } else {
      modules.push(join(fileURLToPath(config.root), value.module));
    }
  });
  return modules;
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
      let modules: string[];

      /** rebuild the route cache + manifest, as needed. */
      async function rebuildManifest(file: string) {
        if (
          file === configPath ||
          file === fileURLToPath(config.input.href) ||
          modules?.includes(file)
        ) {
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
          modules = await getModuleFiles(config, loader);
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

      return async () => {
        // Note that this function has a name so other middleware can find it.
        viteServer.middlewares.use(async function widgetServerDevHandler(
          req,
          res
        ) {
          modules = modules || (await getModuleFiles(config, loader));
          return handleRequest(
            config.base +
              relative(fileURLToPath(config.root), fileURLToPath(config.input)),
            viteServer,
            loader,
            req,
            res
          ).catch((e) => {
            viteServer.ssrFixStacktrace(e);
            console.error(e.stack);

            res.statusCode = 500;
            res.setHeader("content-type", "text/html; charset=utf-8");
            res.end(`<!DOCTYPE html>
            <html>
              <head>
                <title>Error</title>
              </head>
              <body>
                <div style="display:flex;justify-content:center;align-items:center">
                  <div style="border:#f3f4f6 2px solid;border-top:red 4px solid;background:#f9fafb;margin:16px;min-width:550px">
                    <p style="margin:0;font-size:12pt;padding:16px;font-family:sans-serif"> An error occurred during route handling or page rendering. </p>
                    <pre style="margin:0;font-size:12pt;overflow-y:auto;padding:16px;padding-top:0;font-family:monospace">${stripAnsi(
                      e.stack
                    )}</pre>
                  </div>
                </div>
              <body>
            </html>`);
          });
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
    logLevel: "info",
    plugins: [createVitePluginServer(builderConfig)],
    server: serverOptions,
  } as ViteUserConfig);

  return {
    //config,
    viteConfig,
    viteServer: await createViteServer(viteConfig),
  };
}
