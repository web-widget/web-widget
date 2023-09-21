import {
  buildToFetchEvent,
  buildToNodeHandler,
  buildToRequest,
  toOutgoingHeaders,
  toToReadable,
} from "@edge-runtime/node-utils";
import primitives from "@edge-runtime/primitives";
import type { Middleware } from "koa";

import type {
  BuildDependencies,
  NodeHandler,
  RequestOptions,
  WebHandler,
} from "@edge-runtime/node-utils";

if (!Reflect.get(global, "DISABLE_INSTALL_MCA_SHIMS")) {
  Object.assign(global, primitives, { console });
}

class FetchEvent {
  public request: Request;
  public awaiting: Set<Promise<void>>;
  public response: Response | null;

  constructor(request: Request) {
    this.request = request;
    this.response = null;
    this.awaiting = new Set();
  }

  respondWith(response: Response) {
    this.response = response;
  }

  waitUntil() {
    throw new Error("waitUntil is not implemented yet for Node.js");
  }
}

const dependencies: BuildDependencies = {
  Headers,
  ReadableStream,
  // @ts-ignore
  Request: class extends Request {
    constructor(input: RequestInfo | URL, init?: RequestInit | undefined) {
      super(input, addDuplexToInit(init));
    }
  },
  Uint8Array: Uint8Array,
  FetchEvent: FetchEvent,
};

export interface NodeAdapterOptions extends RequestOptions {}
export { Middleware };

export default class NodeAdapter {
  #handler: NodeHandler;
  #middleware: Middleware;

  constructor(
    webRouter: {
      handler: WebHandler;
      options?: {
        origin?: string;
      };
    },
    options: NodeAdapterOptions = {
      defaultOrigin: webRouter?.options?.origin ?? "https://web-widget.js.org",
    }
  ) {
    this.#handler = buildToNodeHandler(
      dependencies,
      options
    )(webRouter.handler);

    const toRequest = buildToRequest(dependencies);
    const toFetchEvent = buildToFetchEvent(dependencies);

    this.#middleware = async (ctx, next) => {
      const incomingMessage = ctx.req;
      const request = toRequest(incomingMessage, options);
      const response = await webRouter.handler(request, toFetchEvent(request));

      ctx.status = response.status;
      ctx.message = response.statusText;
      ctx.set(
        toOutgoingHeaders(response.headers) as {
          [key: string]: string | string[];
        }
      );
      ctx.body = toToReadable(response.body);
      await next();
    };
  }

  get middleware() {
    return this.#middleware;
  }

  get handler() {
    return this.#handler;
  }

  static get primitives() {
    return primitives;
  }
}

/**
 * Add `duplex: 'half'` by default to all requests
 * https://github.com/vercel/edge-runtime/blob/bf167c418247a79d3941bfce4a5d43c37f512502/packages/primitives/src/primitives/fetch.js#L22-L26
 * https://developer.chrome.com/articles/fetch-streaming-requests/#streaming-request-bodies
 */
function addDuplexToInit(init: RequestInit | undefined) {
  if (typeof init === "undefined" || typeof init === "object") {
    return { duplex: "half", ...init };
  }
  return init;
}
