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
import type { Manifest } from "@web-widget/web-router";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import pc from "picocolors";
import stripAnsi from "strip-ansi";

import type { Middlware } from "@web-widget/node";
import NodeAdapter from "@web-widget/node";

import WebRouter from "@web-widget/web-router";
import { getAssets } from "./render";

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
      let watchFiles: string[] = await getModuleFiles(config, loader);

      /** rebuild the route cache + manifest, as needed. */
      async function rebuildManifest(file: string) {
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
          watchFiles = await getModuleFiles(config, loader);
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

      const webRouterDevMiddlware = toWebRouterDevMiddlware(
        config.base +
          relative(fileURLToPath(config.root), fileURLToPath(config.input)),
        viteServer,
        loader
      );

      return () => {
        viteServer.middlewares.use(webRouterDevMiddlware);
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

function toWebRouterDevMiddlware(
  manifestUrl: string,
  viteServer: ViteDevServer,
  loader: ModuleLoader
): Middlware {
  const webRouter = new WebRouter(manifestUrl, {
    dev: true,
    experimental: {
      loader: loader.import,
      async render(ctx, render) {
        const dir = pathToFileURL(join(viteServer.config.root, "/"));
        const routeFile = new URL(ctx.source, dir);
        const assets = await getAssets(
          routeFile,
          loader,
          pathToFileURL(viteServer.config.root),
          "development"
        );

        ctx.meta.style = [];
        ctx.meta.link = [];
        ctx.meta.script = [];

        assets.styles.forEach(({ props, children }) => {
          // @ts-ignore
          ctx.meta.style.push({
            ...props,
            content: children,
          });
        });
        assets.links.forEach(({ props, children }) => {
          // @ts-ignore
          ctx.meta.link.push(props);
        });
        assets.scripts.forEach(({ props, children }) => {
          // @ts-ignore
          ctx.meta.script.push({
            ...props,
            content: children,
          });
        });

        await render();
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
          statusText: "",
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        });
      }
    },
  });

  return nodeAdapter.middlware;
}

function errorTemplate(message: string) {
  return `<!DOCTYPE html>
  <html>
    <head>
      <title>Error</title>
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
