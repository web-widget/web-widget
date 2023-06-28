import type { ServerOptions, UserConfig as ViteUserConfig } from "vite";
import { createServer as createViteServer, mergeConfig } from "vite";
//import { resolveConfig } from "../config";
import createVitePluginServer from "../plugin/server";

export async function createServer(
  root: string = process.cwd(),
  serverOptions: ServerOptions = {}
) {
  //const config = await resolveConfig(root);
  const viteConfig = mergeConfig(/*config.viteOptions*/ {}, {
    root,
    appType: "custom",
    plugins: [createVitePluginServer() /*...config.vitePlugins*/],
    server: serverOptions,
  } as ViteUserConfig);

  return {
    //config,
    viteConfig,
    viteServer: await createViteServer(viteConfig),
  };
}
