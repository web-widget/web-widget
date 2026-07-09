import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Writable } from 'node:stream';
import type {
  BuildDependencies,
  NodeHandler,
  RequestOptions,
} from '@edge-runtime/node-utils';
import {
  buildToFetchEvent,
  mergeIntoServerResponse,
  toOutgoingHeaders,
} from '@edge-runtime/node-utils';
import primitives from '@edge-runtime/primitives';

import { buildToRequestWithHttp2Compat } from './incoming-request';

type WebHandler = (
  req: Request,
  env: Record<string, unknown>,
  event: FetchEvent
) => Promise<Response> | Response | null | undefined;

const dependencies: BuildDependencies = {
  Headers,
  ReadableStream,
  Request: class extends Request {
    constructor(input: RequestInfo | URL, init?: RequestInit | undefined) {
      super(input, addDuplexToInit(init));
    }
  },
  Uint8Array: Uint8Array,
  FetchEvent: primitives.FetchEvent,
};

export interface NodeAdapterOptions extends RequestOptions {
  /** builds a transformer, using Node.js@18 globals, and a base url for URL constructor. */
  defaultOrigin: string;
}
export interface Middleware {
  (req: IncomingMessage, res: ServerResponse, next: Function): void;
}

export default class NodeAdapter {
  #handler: NodeHandler;
  #middleware: Middleware;

  constructor(
    webRouter: {
      handler: WebHandler;
    },
    options: NodeAdapterOptions
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
}

/**
 * Add `duplex: 'half'` by default to all requests
 * https://github.com/vercel/edge-runtime/blob/bf167c418247a79d3941bfce4a5d43c37f512502/packages/primitives/src/primitives/fetch.js#L22-L26
 * https://developer.chrome.com/articles/fetch-streaming-requests/#streaming-request-bodies
 */
function addDuplexToInit(init: RequestInit | undefined) {
  if (typeof init === 'undefined' || typeof init === 'object') {
    return { duplex: 'half', ...init };
  }
  return init;
}

function isHttp2ServerResponse(serverResponse: ServerResponse): boolean {
  // Http2ServerResponse exposes `stream` but may omit httpVersionMajor on Node 20.
  if ('stream' in serverResponse && serverResponse.stream) return true;
  const httpVersionMajor = (
    serverResponse as ServerResponse & { httpVersionMajor?: number }
  ).httpVersionMajor;
  return Number(httpVersionMajor) >= 2;
}

function setHttp1StatusMessage(
  serverResponse: ServerResponse,
  statusMessage: string
) {
  if (!isHttp2ServerResponse(serverResponse) && statusMessage) {
    serverResponse.statusMessage = statusMessage;
  }
}

function toMiddleware(
  webHandler: WebHandler,
  options: RequestOptions
): Middleware {
  const toRequest = buildToRequestWithHttp2Compat(dependencies);
  const toFetchEvent = buildToFetchEvent(dependencies);
  return async function middleware(incomingMessage, serverResponse, next) {
    const request = toRequest(incomingMessage, options);
    try {
      const env = process.env;
      const event = toFetchEvent(request);
      const webResponse = await webHandler(request, env, event);
      await toServerResponse(webResponse, serverResponse);
      if (!serverResponse.headersSent && !serverResponse.writableEnded) {
        await next();
      }
    } catch (error: unknown) {
      if (
        sendServerError(
          serverResponse,
          error instanceof Error ? error.message : undefined
        )
      ) {
        next();
      } else {
        next(error);
      }
    } finally {
      // Release any unconsumed request body so the underlying socket / file
      // descriptor is not held alive after the response completes.
      cancelRequestBody(request);
    }
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

  const isHttp2 = isHttp2ServerResponse(serverResponse);
  const headers = toOutgoingHeaders(webResponse.headers);
  const status = webResponse.status;

  if (!serverResponse.headersSent) {
    mergeIntoServerResponse(headers, serverResponse);
    serverResponse.statusCode = status;
    if (!isHttp2) {
      setHttp1StatusMessage(serverResponse, webResponse.statusText);
    }
  } else if (!isHttp2) {
    serverResponse.statusCode = status;
    setHttp1StatusMessage(serverResponse, webResponse.statusText);
  }

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
  if (stream.locked) {
    throw new TypeError('ReadableStream is locked.');
  }

  const reader = stream.getReader();
  const flushable = writable as Writable & { flush?: () => void };

  // Cancel the source stream when the destination closes early (e.g. the
  // client disconnects), so reading stops and upstream resources release.
  const onAbort = () => {
    reader.cancel().catch(() => {});
  };
  writable.once('close', onAbort);
  writable.once('error', onAbort);

  try {
    while (!writable.destroyed) {
      const { done, value } = await reader.read();
      if (done) {
        if (!writable.destroyed) writable.end();
        break;
      }
      // Respect backpressure: when the writable's internal buffer is full,
      // wait for it to drain before pulling the next chunk. Without this a
      // slow client + large body causes unbounded memory growth.
      if (writable.write(value) === false) {
        await new Promise<void>((resolve) => {
          if (writable.destroyed) {
            resolve();
          } else {
            writable.once('drain', resolve);
          }
        });
      }
      if (typeof flushable.flush === 'function') {
        flushable.flush();
      }
    }
  } catch (error: unknown) {
    // Source stream errored. If the destination is still alive, tear it down
    // so the client doesn't hang waiting for more data. If it's already gone
    // (client disconnect), there is nothing more to do.
    if (!writable.destroyed) {
      writable.destroy(error instanceof Error ? error : undefined);
      throw error;
    }
  } finally {
    writable.removeListener('close', onAbort);
    writable.removeListener('error', onAbort);
    try {
      reader.releaseLock();
    } catch {
      /* lock already released via cancel() */
    }
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

  // Http2ServerResponse may omit httpVersionMajor and report socket.writable=false.
  if ('stream' in serverResponse && serverResponse.stream) return true;

  const socket = serverResponse.socket;
  // There are already pending outgoing res, but still writable
  // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
  if (!socket) return true;
  return socket.writable;
}

/**
 * Sends a 500 response when a handler throws. Returns `true` when a response
 * was written, `false` when it was not possible (headers already sent, socket
 * closed, etc.) so the caller can decide whether to forward the error.
 */
function sendServerError(
  serverResponse: ServerResponse,
  message?: string
): boolean {
  if (!checkWritable(serverResponse) || serverResponse.headersSent) {
    return false;
  }
  try {
    serverResponse.statusCode = 500;
    setHttp1StatusMessage(serverResponse, 'Internal Server Error');
    serverResponse.setHeader('content-type', 'text/plain; charset=utf-8');
    serverResponse.end(message || 'Internal Server Error');
    return true;
  } catch {
    /* ignore: socket may already be closed */
    return false;
  }
}

/**
 * Cancels an unconsumed request body so the underlying Node stream (and its
 * socket / file descriptor) is released once the response has been sent.
 */
function cancelRequestBody(request: Request) {
  const body = request.body;
  if (body && !body.locked) {
    body.cancel().catch(() => {});
  }
}

function buildToNodeHandler(
  dependencies: BuildDependencies,
  options: RequestOptions
) {
  const toRequest = buildToRequestWithHttp2Compat(dependencies);
  const toFetchEvent = buildToFetchEvent(dependencies);
  return function toNodeHandler(webHandler: WebHandler): NodeHandler {
    return (
      incomingMessage: IncomingMessage,
      serverResponse: ServerResponse
    ) => {
      const request = toRequest(incomingMessage, options);
      const env = process.env;
      const event = toFetchEvent(request);
      const maybePromise = webHandler(request, env, event);
      const respond = (response: Response | null | undefined) =>
        toServerResponse(response, serverResponse).finally(() =>
          cancelRequestBody(request)
        );
      const fail = () => sendServerError(serverResponse);
      if (maybePromise instanceof Promise) {
        maybePromise.then(respond).catch(fail);
      } else {
        respond(maybePromise).catch(fail);
      }
    };
  };
}
