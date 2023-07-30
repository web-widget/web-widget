import { ServerContext } from "./context";
import type {
  StartOptions,
  ServerHandler,
  ServerConnInfo,
  Manifest,
} from "./types";
export type * from "./types";

export default class WebRouter {
  #handler: ServerHandler;

  constructor(routemap: string | URL | Manifest, opts: StartOptions = {}) {
    const promise = ServerContext.fromManifest(routemap, opts, !!opts.dev).then(
      (serverContext) => {
        this.#handler = serverContext.handler();
        return serverContext;
      }
    );

    this.#handler = async (req: Request, connInfo: ServerConnInfo = {}) => {
      const serverContext = await promise;
      return serverContext.handler()(req, connInfo);
    };
  }

  get handler(): ServerHandler {
    return this.#handler;
  }

  /**
   * Implements the (ancient) event listener object interface to allow passing to fetch event directly,
   * e.g. `self.addEventListener('fetch', new WebRouter(manifest, options))`.
   */
  handleEvent(event: FetchEvent) {
    event.respondWith(this.handler(event.request, {}));
  }
}
