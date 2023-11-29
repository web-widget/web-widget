import type {
  BuildDependencies,
  NodeHandler,
  RequestOptions,
} from "@edge-runtime/node-utils";
import {
  buildToFetchEvent,
  buildToRequest,
  mergeIntoServerResponse,
  toOutgoingHeaders,
} from "@edge-runtime/node-utils";
import primitives from "@edge-runtime/primitives";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Writable } from "node:stream";

if (!Reflect.get(global, "DISABLE_INSTALL_MCA_SHIMS")) {
  Object.assign(global, primitives, { console });
}

type WebHandler = (
  req: Request,
  env: Record<string, unknown>,
  event: FetchEvent
) => Promise<Response> | Response | null | undefined;

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
      origin?: string;
    },
    options: NodeAdapterOptions = {
      defaultOrigin: webRouter?.origin ?? "https://web-widget.js.org",
    }
  ) {
    const handler = webRouter.handler.bind(webRouter);
    this.#handler = buildToNodeHandler(dependencies, options)(handler);

    // this.#middleware = (req, res, next) => {
    //   res.on("finish", () => {
    //     next();
    //   });
    //   this.#handler(req, res);
    // };
    this.#middleware = toMiddleware(handler, options);
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

function toMiddleware(
  webHandler: WebHandler,
  options: RequestOptions
): Middleware {
  const toRequest = buildToRequest(dependencies);
  const toFetchEvent = buildToFetchEvent(dependencies);
  return async function middleware(incomingMessage, serverResponse, next) {
    const request = toRequest(incomingMessage, options);
    const webResponse = await webHandler(
      request,
      process.env,
      toFetchEvent(request)
    );
    await toServerResponse(webResponse, serverResponse);
    await next();
  };
}

async function toServerResponse(
  webResponse: Response | null | undefined,
  serverResponse: ServerResponse
) {
  if (!checkWritable(serverResponse)) {
    return;
  }

  if (!webResponse) {
    serverResponse.end();
    return;
  }

  if (!serverResponse.headersSent) {
    mergeIntoServerResponse(
      toOutgoingHeaders(webResponse.headers),
      serverResponse
    );
  }

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
  let flushable = writable as { flush?: Function };

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let { done, value } = await reader.read();

      if (done) {
        writable.end();
        break;
      }

      writable.write(value);
      if (typeof flushable.flush === "function") {
        flushable.flush();
      }
    }
  } catch (error: unknown) {
    writable.destroy(error as Error);
    throw error;
  }
}

/**
 * Checks if the request is writable.
 * Tests for the existence of the socket
 * as node sometimes does not set it.
 */
function checkWritable(serverResponse: ServerResponse) {
  // can't write any more after response finished
  // response.writableEnded is available since Node > 12.9
  // https://nodejs.org/api/http.html#http_response_writableended
  // response.finished is undocumented feature of previous Node versions
  // https://stackoverflow.com/questions/16254385/undocumented-response-finished-in-node-js
  if (serverResponse.writableEnded || serverResponse.finished) return false;

  const socket = serverResponse.socket;
  // There are already pending outgoing res, but still writable
  // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
  if (!socket) return true;
  return socket.writable;
}

function buildToNodeHandler(
  dependencies: BuildDependencies,
  options: RequestOptions
) {
  const toRequest = buildToRequest(dependencies);
  const toFetchEvent = buildToFetchEvent(dependencies);
  return function toNodeHandler(webHandler: WebHandler): NodeHandler {
    return (
      incomingMessage: IncomingMessage,
      serverResponse: ServerResponse
    ) => {
      const request = toRequest(incomingMessage, options);
      const maybePromise = webHandler(
        request,
        process.env,
        toFetchEvent(request)
      );
      if (maybePromise instanceof Promise) {
        maybePromise.then((response) =>
          toServerResponse(response, serverResponse)
        );
      } else {
        toServerResponse(maybePromise, serverResponse);
      }
    };
  };
}
