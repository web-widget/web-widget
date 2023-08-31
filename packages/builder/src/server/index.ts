import type { ModuleLoader } from "./loader/index";
import { createViteLoader } from "./loader/index";
import type {
  Plugin,
  ServerOptions,
  UserConfig as ViteUserConfig,
  ViteDevServer,
} from "vite";
import { createServer as createViteServer, mergeConfig } from "vite";
import { join, relative } from "node:path";
import { openConfig, resolveConfigPath } from "../config";

import type { BuilderConfig } from "../types";
import type { ManifestJSON } from "@web-widget/web-router";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import pc from "picocolors";
import stripAnsi from "strip-ansi";

import type { Middleware } from "@web-widget/node";
import NodeAdapter from "@web-widget/node";

import WebRouter from "@web-widget/web-router";
import { getMeta } from "./render";
import type { RouteModule } from "@web-widget/schema";

async function loadManifest(
  config: BuilderConfig,
  loader: ModuleLoader
): Promise<ManifestJSON> {
  const json = await loader.import(
    join(
      config.base,
      relative(fileURLToPath(config.root), fileURLToPath(config.input))
    )
  );
  return json.default as ManifestJSON;
}

function getWatchFiles(config: BuilderConfig, manifest: ManifestJSON) {
  const modules: string[] = [];

  Array.from(Object.entries(manifest)).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(({ module }) => {
        modules.push(join(fileURLToPath(config.root), module));
      });
    } else if (value.module) {
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
      const manifest = await loadManifest(config, loader);
      const watchFiles: string[] = getWatchFiles(config, manifest);

      async function restart(file: string) {
        if (
          file === configPath ||
          file === fileURLToPath(config.input.href) ||
          watchFiles.includes(file)
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
          const { viteServer: newServer } = await createServer(
            viteServer.config.root,
            viteServer.config.server
          );
          await newServer.listen();
        }
      }
      // Rebuild route manifest on file change, if needed.
      viteServer.watcher.on("add", restart);
      viteServer.watcher.on("change", restart);

      const webRouterDevMiddleware = toWebRouterDevMiddleware(
        config,
        manifest,
        viteServer,
        loader
      );

      return () => {
        viteServer.middlewares.use(webRouterDevMiddleware);
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

function toWebRouterDevMiddleware(
  config: BuilderConfig,
  manifest: ManifestJSON,
  viteServer: ViteDevServer,
  loader: ModuleLoader
): Middleware {
  const webRouter = new WebRouter(manifest, {
    dev: true,
    baseAsset:
      (viteServer.resolvedUrls?.network ||
        viteServer.resolvedUrls?.local)?.[0] ?? config.base,
    baseModule: config.root,
    experimental: {
      loader: async (id, importer) => {
        const source = new URL(id, importer);
        const module = {
          meta: {},
          ...((await loader.import(fileURLToPath(source))) as RouteModule),
        };

        const meta = await getMeta(source, loader, config.root, "development");
        Object.entries(meta).forEach(([key, value]) => {
          // @ts-ignore
          if (module.meta[key]) {
            // @ts-ignore
            module.meta[key].push(...value);
          } else {
            // @ts-ignore
            module.meta[key] = value;
          }
        });

        return module;
      },
    },
  });

  const nodeAdapter = new NodeAdapter({
    async handler(request, fetchEvent) {
      try {
        const webResponse = await webRouter.handler(request, fetchEvent);

        if (
          !webResponse.headers.get("content-type")?.startsWith("text/html;")
        ) {
          return webResponse;
        }

        const html = await webResponse.text();
        const viteHtml = await viteServer.transformIndexHtml(
          new URL(request.url).pathname,
          html
        );

        return new Response(viteHtml, {
          status: webResponse.status,
          statusText: webResponse.statusText,
          headers: webResponse.headers,
        });
      } catch (error) {
        viteServer.ssrFixStacktrace(error);
        console.error(error.stack);

        return new Response(errorTemplate(stripAnsi(error.stack)), {
          status: 500,
          statusText: "Internal Server Error",
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        });
      }
    },
  });

  return nodeAdapter.middleware;
}

function errorTemplate(message: string) {
  return `<!doctype html>
  <html lang="en">
    <head>
      <title>Error</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div style="display:flex;justify-content:center;align-items:center">
        <div style="border:#f3f4f6 2px solid;border-top:red 4px solid;background:#f9fafb;margin:16px;min-width:550px">
          <p style="margin:0;font-size:12pt;padding:16px;font-family:sans-serif"> An error occurred during route handling or page rendering. </p>
          <pre style="margin:0;font-size:12pt;overflow-y:auto;padding:16px;padding-top:0;font-family:monospace">${message}</pre>
        </div>
      </div>
    <body>
  </html>`;
}
