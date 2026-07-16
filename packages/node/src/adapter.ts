import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Writable } from 'node:stream';
import primitives from '@edge-runtime/primitives';

import {
  buildToRequestSource,
  buildToRequestWithHttp2Compat,
  type NodeRequestSource,
} from './incoming-request';
import {
  buildToFetchEvent,
  type BuildDependencies,
  type EdgeFetchEvent,
  type NodeHandler,
  type RequestOptions,
} from './node-utils';
import {
  getCachedResponse,
  installCachedResponse,
  type CachedResponse,
} from './response';

type WebHandler = (
  req: Request,
  env: Record<string, unknown>,
  event: EdgeFetchEvent
) => Promise<Response> | Response | null | undefined;

type RequestSourceHandler = (
  req: NodeRequestSource,
  env: Record<string, unknown>,
  executionContext: typeof NODE_EXECUTION_CONTEXT
) => Promise<Response> | Response | null | undefined;

const REQUEST_SOURCE_HANDLER = Symbol.for(
  '@web-widget/web-router.request-source-handler'
);
const NODE_EXECUTION_CONTEXT = {
  waitUntil(_promise: Promise<unknown>) {},
  passThroughOnException() {},
};

const dependencies: BuildDependencies = {
  Headers,
  ReadableStream,
  Request,
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
    installCachedResponse();
    const requestSourceHandler = Reflect.get(
      webRouter,
      REQUEST_SOURCE_HANDLER
    ) as RequestSourceHandler | undefined;

    if (typeof requestSourceHandler === 'function') {
      const handler = requestSourceHandler.bind(webRouter);
      this.#handler = buildToNodeSourceHandler(dependencies, options)(handler);
      this.#middleware = toRequestSourceMiddleware(handler, options);
      return;
    }

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

function toRequestSourceMiddleware(
  webHandler: RequestSourceHandler,
  options: RequestOptions
): Middleware {
  const toRequestSource = buildToRequestSource(dependencies, options);
  return async function middleware(incomingMessage, serverResponse, next) {
    const source = toRequestSource(incomingMessage);
    try {
      const webResponse = await webHandler(
        source,
        process.env,
        NODE_EXECUTION_CONTEXT
      );
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
      source.cancel();
    }
  };
}

export function toServerResponse(
  webResponse: Response | null | undefined,
  serverResponse: ServerResponse
): void | Promise<void> {
  if (!checkWritable(serverResponse)) {
    return;
  }

  if (!webResponse) {
    serverResponse.end();
    return;
  }

  const cached = getCachedResponse(webResponse);
  if (cached) {
    return writeCachedResponse(cached, serverResponse);
  }

  const isHttp2 = isHttp2ServerResponse(serverResponse);
  const headers: Record<string, string | string[]> = {};
  const responseHeaders = webResponse.headers;
  const setCookies = responseHeaders.getSetCookie?.();
  for (const [name, value] of responseHeaders) {
    headers[name] =
      name === 'set-cookie' && setCookies?.length ? setCookies : value;
  }
  const status = webResponse.status;

  if (!serverResponse.headersSent) {
    if (!isHttp2) {
      setHttp1StatusMessage(serverResponse, webResponse.statusText);
    }
    serverResponse.writeHead(status, headers);
  } else if (!isHttp2) {
    serverResponse.statusCode = status;
    setHttp1StatusMessage(serverResponse, webResponse.statusText);
  }

  if (!webResponse.body) {
    serverResponse.end();
    return;
  }

  return writeReadableStreamToWritable(webResponse.body, serverResponse);
}

function writeCachedResponse(
  response: CachedResponse,
  serverResponse: ServerResponse
): void | Promise<void> {
  const { body } = response;
  const cachedHeaders = response.headers;

  if (
    !cachedHeaders ||
    (!Array.isArray(cachedHeaders) && !(cachedHeaders instanceof Headers))
  ) {
    const outgoingHeaders: Record<string, string | string[]> = {
      ...cachedHeaders,
    };
    if (response.headerName) {
      outgoingHeaders[response.headerName] = response.headerValue!;
    }

    if (typeof body === 'string' && !outgoingHeaders['content-type']) {
      outgoingHeaders['content-type'] = 'text/plain;charset=UTF-8';
    } else if (
      body instanceof Blob &&
      body.type &&
      !outgoingHeaders['content-type']
    ) {
      outgoingHeaders['content-type'] = body.type;
    }

    if (!outgoingHeaders['content-length']) {
      if (typeof body === 'string') {
        outgoingHeaders['content-length'] = String(Buffer.byteLength(body));
      } else if (body instanceof Uint8Array) {
        outgoingHeaders['content-length'] = String(body.byteLength);
      } else if (body instanceof Blob) {
        outgoingHeaders['content-length'] = String(body.size);
      }
    }

    return writeCachedBody(response, body, outgoingHeaders, serverResponse);
  }

  const headers = new Headers(cachedHeaders);

  if (typeof body === 'string' && !headers.has('content-type')) {
    headers.set('content-type', 'text/plain;charset=UTF-8');
  } else if (
    body instanceof Blob &&
    body.type &&
    !headers.has('content-type')
  ) {
    headers.set('content-type', body.type);
  }

  if (!headers.has('content-length')) {
    if (typeof body === 'string') {
      headers.set('content-length', String(Buffer.byteLength(body)));
    } else if (body instanceof Uint8Array) {
      headers.set('content-length', String(body.byteLength));
    } else if (body instanceof Blob) {
      headers.set('content-length', String(body.size));
    }
  }

  const outgoingHeaders: Record<string, string | string[]> = {};
  const setCookies = headers.getSetCookie?.();
  for (const [name, value] of headers) {
    outgoingHeaders[name] =
      name === 'set-cookie' && setCookies?.length ? setCookies : value;
  }

  return writeCachedBody(response, body, outgoingHeaders, serverResponse);
}

function writeCachedBody(
  response: CachedResponse,
  body: CachedResponse['body'],
  outgoingHeaders: Record<string, string | string[]>,
  serverResponse: ServerResponse
): void | Promise<void> {
  if (!serverResponse.headersSent) {
    if (!isHttp2ServerResponse(serverResponse) && response.statusText) {
      setHttp1StatusMessage(serverResponse, response.statusText);
    }
    serverResponse.writeHead(response.status, outgoingHeaders);
  }

  if (body === null) {
    serverResponse.end();
  } else if (typeof body === 'string' || body instanceof Uint8Array) {
    serverResponse.end(body);
  } else if (body instanceof Blob) {
    return body.arrayBuffer().then((buffer) => {
      serverResponse.end(new Uint8Array(buffer));
    });
  } else {
    return writeReadableStreamToWritable(body, serverResponse);
  }
}

function writeReadableStreamToWritable(
  stream: ReadableStream,
  writable: Writable
): Promise<void> {
  if (stream.locked) {
    throw new TypeError('ReadableStream is locked.');
  }

  const reader = stream.getReader();
  const flushable = writable as Writable & { flush?: () => void };
  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      writable.removeListener('close', onAbort);
      writable.removeListener('error', onAbort);
      writable.removeListener('drain', read);
      try {
        reader.releaseLock();
      } catch {
        /* lock already released via cancel() */
      }
    };

    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error !== undefined) reject(error);
      else resolve();
    };

    const onAbort = () => {
      reader.cancel().then(
        () => finish(),
        () => finish()
      );
    };

    const handleError = (error: unknown) => {
      if (!writable.destroyed) {
        writable.destroy(error instanceof Error ? error : undefined);
      }
      finish(error);
    };

    function read() {
      if (writable.destroyed) {
        onAbort();
        return;
      }
      reader.read().then(flow, handleError);
    }

    const flow = ({ done, value }: ReadableStreamReadResult<unknown>) => {
      if (done) {
        if (!writable.destroyed) writable.end();
        finish();
        return;
      }

      if (writable.write(value) === false) {
        writable.once('drain', read);
      } else {
        read();
      }
      if (typeof flushable.flush === 'function') {
        flushable.flush();
      }
    };

    writable.once('close', onAbort);
    writable.once('error', onAbort);
    read();
  });
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

export function buildToNodeHandler(
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
      if (maybePromise instanceof Promise) {
        maybePromise.then(
          (response) => {
            try {
              const writing = toServerResponse(response, serverResponse);
              if (writing instanceof Promise) {
                writing.then(
                  () => cancelRequestBody(request),
                  () => {
                    cancelRequestBody(request);
                    sendServerError(serverResponse);
                  }
                );
              } else {
                cancelRequestBody(request);
              }
            } catch {
              cancelRequestBody(request);
              sendServerError(serverResponse);
            }
          },
          () => {
            cancelRequestBody(request);
            sendServerError(serverResponse);
          }
        );
        return;
      }

      try {
        const writing = toServerResponse(maybePromise, serverResponse);
        if (writing instanceof Promise) {
          writing.then(
            () => cancelRequestBody(request),
            () => {
              cancelRequestBody(request);
              sendServerError(serverResponse);
            }
          );
        } else {
          cancelRequestBody(request);
        }
      } catch {
        cancelRequestBody(request);
        sendServerError(serverResponse);
      }
    };
  };
}

function buildToNodeSourceHandler(
  dependencies: BuildDependencies,
  options: RequestOptions
) {
  const toRequestSource = buildToRequestSource(dependencies, options);
  return function toNodeHandler(webHandler: RequestSourceHandler): NodeHandler {
    return (
      incomingMessage: IncomingMessage,
      serverResponse: ServerResponse
    ) => {
      const source = toRequestSource(incomingMessage);
      const needsSourceCleanup =
        source.method !== 'GET' && source.method !== 'HEAD';
      const maybePromise = webHandler(
        source,
        process.env,
        NODE_EXECUTION_CONTEXT
      );
      if (maybePromise instanceof Promise) {
        maybePromise.then(
          (response) => {
            try {
              const writing = toServerResponse(response, serverResponse);
              if (writing instanceof Promise) {
                writing.then(
                  () => {
                    if (needsSourceCleanup) source.cancel();
                  },
                  () => {
                    if (needsSourceCleanup) source.cancel();
                    sendServerError(serverResponse);
                  }
                );
              } else if (needsSourceCleanup) {
                source.cancel();
              }
            } catch {
              if (needsSourceCleanup) source.cancel();
              sendServerError(serverResponse);
            }
          },
          () => {
            if (needsSourceCleanup) source.cancel();
            sendServerError(serverResponse);
          }
        );
        return;
      }

      try {
        const writing = toServerResponse(maybePromise, serverResponse);
        if (writing instanceof Promise) {
          writing.then(
            () => {
              if (needsSourceCleanup) source.cancel();
            },
            () => {
              if (needsSourceCleanup) source.cancel();
              sendServerError(serverResponse);
            }
          );
        } else if (needsSourceCleanup) {
          source.cancel();
        }
      } catch {
        if (needsSourceCleanup) source.cancel();
        sendServerError(serverResponse);
      }
    };
  };
}
