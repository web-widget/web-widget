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
      let pendingReload: DeferredPromise<Manifest> | void;

      /** rebuild the route cache + manifest, as needed. */
      async function rebuildManifest(
        needsManifestRebuild: boolean,
        _file: string
      ) {
        if (needsManifestRebuild) {
          pendingReload = new DeferredPromise<Manifest>()
          manifest = await getManifest(loader);
          pendingReload.complete(manifest)
          pendingReload = undefined;
        }
      }
      // Rebuild route manifest on file change, if needed.
      viteServer.watcher.on("add", rebuildManifest.bind(null, true));
      viteServer.watcher.on("unlink", rebuildManifest.bind(null, true));
      viteServer.watcher.on("change", rebuildManifest.bind(null, true));

      return async () => {
        // Note that this function has a name so other middleware can find it.
        viteServer.middlewares.use(async function widgetServerDevHandler(
          req,
          res
        ) {
          if (pendingReload) await pendingReload.p;
          manifest = manifest || (await getManifest(loader));
          return handleRequest(manifest, viteServer, loader, req, res);
        });
      };
    },
  };
}

export type ValueCallback<T = unknown> = (value: T | Promise<T>) => void;

export class DeferredPromise<T> {
  private completeCallback!: ValueCallback<T>;

  public readonly p: Promise<T>;

  constructor() {
    this.p = new Promise<T>((c) => {
      this.completeCallback = c;
    });
  }

  public complete(value: T) {
    return new Promise<void>(resolve => {
      this.completeCallback(value);
      resolve();
    });
  }
}
