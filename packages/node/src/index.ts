import {
  buildToFetchEvent,
  buildToNodeHandler,
  buildToRequest,
  mergeIntoServerResponse,
  toOutgoingHeaders,
} from "@edge-runtime/node-utils";
import primitives from "@edge-runtime/primitives";
import type { IncomingMessage, ServerResponse } from "node:http";

import type {
  BuildDependencies,
  NodeHandler,
  RequestOptions,
  WebHandler,
} from "@edge-runtime/node-utils";
import type { Writable } from "node:stream";

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
export interface Middleware {
  (req: IncomingMessage, res: ServerResponse, next: Function): void;
}

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

    // this.#middleware = (req, res, next) => {
    //   res.on("finish", () => {
    //     next();
    //   });
    //   this.#handler(req, res);
    // };
    this.#middleware = toMiddleware(webRouter.handler, options);
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

async function toServerResponse(
  webResponse: Response | null | undefined,
  serverResponse: ServerResponse
) {
  if (!webResponse) {
    serverResponse.end();
    return;
  }
  mergeIntoServerResponse(
    // @ts-ignore getAll() is not standard https://fetch.spec.whatwg.org/#headers-class
    toOutgoingHeaders(webResponse.headers),
    serverResponse
  );

  serverResponse.statusCode = webResponse.status;
  serverResponse.statusMessage = webResponse.statusText;
  if (!webResponse.body) {
    serverResponse.end();
    return;
  }

  await writeReadableStreamToWritable(webResponse.body, serverResponse);
}

async function writeReadableStreamToWritable(
  stream: ReadableStream,
  writable: Writable
) {
  let reader = stream.getReader();

  async function read() {
    let { done, value } = await reader.read();

    if (done) {
      writable.end();
      return;
    }

    writable.write(value);

    // If the stream is flushable, flush it to allow streaming to continue.
    let flushable = writable as { flush?: Function };
    if (typeof flushable.flush === "function") {
      flushable.flush();
    }

    await read();
  }

  try {
    await read();
  } catch (error: any) {
    writable.destroy(error);
    throw error;
  }
}

function toMiddleware(
  webHandler: WebHandler,
  options: RequestOptions
): Middleware {
  const toRequest = buildToRequest(dependencies);
  const toFetchEvent = buildToFetchEvent(dependencies);
  return async function middleware(incomingMessage, serverResponse, next) {
    const request = toRequest(incomingMessage, options);
    const webResponse = await webHandler(request, toFetchEvent(request));
    await toServerResponse(webResponse, serverResponse);

    await next();
  };
}
