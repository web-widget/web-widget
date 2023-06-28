import type { Manifest } from "@web-widget/web-server";
import type { Plugin } from "vite";
import { createViteLoader, ModuleLoader } from "../../core/loader/index";
import { handleRequest } from "./request";

export default function createVitePluginServer(): Plugin {
  async function getManifest(loader: ModuleLoader) {
    return loader.import("/web-server.gen.ts") as Promise<Manifest>;
  }
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
          manifest = await getManifest(loader);
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
          manifest = manifest || (await getManifest(loader));
          return handleRequest(manifest, viteServer, loader, req, res);
        });
      };
    },
  };
}
