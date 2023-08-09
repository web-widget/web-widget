import { ServerContext } from "./context";
import type { Manifest, Requester, RouterHandler, StartOptions } from "./types";
export type * from "./types";

export default class WebRouter {
  #handler: RouterHandler;
  #options: StartOptions;

  constructor(manifest: Manifest, opts: StartOptions) {
    const promise = ServerContext.fromManifest(manifest, opts, !!opts.dev).then(
      (serverContext) => {
        this.#handler = serverContext.handler();
        return serverContext;
      }
    );

    this.#handler = async (req: Request, requester?: Requester) => {
      const serverContext = await promise;
      return serverContext.handler()(req, requester);
    };
    this.#options = opts;
  }

  get handler(): RouterHandler {
    return this.#handler;
  }

  get options(): StartOptions {
    return this.#options;
  }

  /**
   * Implements the (ancient) event listener object interface to allow passing to fetch event directly,
   * e.g. `self.addEventListener('fetch', new WebRouter(manifest, options))`.
   */
  handleEvent(fetchEvent: FetchEvent) {
    fetchEvent.respondWith(this.#handler(fetchEvent.request, fetchEvent));
  }
}
