import { ServerContext } from "./context";
export { Status } from "./status";
import type { StartOptions, Manifest, ServerHandler } from "./types";
export type * from "./types";

export default class WebServer {
  #handler: ServerHandler;

  constructor(manifest: Manifest, opts: StartOptions = {}) {
    const ctx = ServerContext.fromManifest(manifest, opts, !!opts.dev);
    this.#handler = ctx.handler();
  }

  get handler(): ServerHandler {
    return this.#handler;
  }

  /**
   * Implements the (ancient) event listener object interface to allow passing to fetch event directly,
   * e.g. `self.addEventListener('fetch', router(manifest))`.
   */
  handleEvent(event: FetchEvent) {
    event.respondWith(this.#handler(event.request, {}));
  }
}
