import { ServerContext } from "./context";
import type {
  StartOptions,
  RouterHandler,
  ConnectionInfo,
  Manifest,
} from "./types";
export type * from "./types";

export default class WebRouter {
  #handler: RouterHandler;

  constructor(routemap: string | URL | Manifest, opts: StartOptions = {}) {
    const promise = ServerContext.fromManifest(routemap, opts, !!opts.dev).then(
      (serverContext) => {
        this.#handler = serverContext.handler();
        return serverContext;
      }
    );

    this.#handler = async (req: Request, info?: ConnectionInfo) => {
      const serverContext = await promise;
      return serverContext.handler()(req, info);
    };
  }

  get handler(): RouterHandler {
    return this.#handler;
  }

  /**
   * Implements the (ancient) event listener object interface to allow passing to fetch event directly,
   * e.g. `self.addEventListener('fetch', new WebRouter(manifest, options))`.
   */
  handleEvent(fetchEvent: FetchEvent) {
    fetchEvent.respondWith(this.handler(fetchEvent.request, fetchEvent));
  }
}
