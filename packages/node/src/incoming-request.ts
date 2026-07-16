import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import type { Readable } from 'node:stream';
import {
  buildToHeaders,
  type BuildDependencies,
  type RequestOptions,
} from './node-utils';

/**
 * HTTP/2 pseudo-headers (e.g. `:method`, `:path`) are valid on Node
 * IncomingMessage but invalid for Fetch API Headers.
 */
function isHttp2PseudoHeader(name: string): boolean {
  return name.startsWith(':');
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Strips HTTP/2 pseudo-headers and maps `:authority` to `host` when needed.
 */
export function sanitizeIncomingHttpHeaders(
  headers: IncomingHttpHeaders
): IncomingHttpHeaders {
  const sanitized: IncomingHttpHeaders = {};

  for (const [key, value] of Object.entries(headers)) {
    if (!isHttp2PseudoHeader(key)) {
      sanitized[key] = value;
    }
  }

  if (!sanitized.host) {
    const authority = headerValue(headers[':authority']);
    if (authority) {
      sanitized.host = authority;
    }
  }

  return sanitized;
}

/**
 * Resolves the request origin for URL construction.
 * Handles HTTP/2 where authority may only appear as `:authority`.
 */
export function computeRequestOrigin(
  headers: IncomingHttpHeaders,
  defaultOrigin: string
): string {
  const authority =
    headerValue(headers.host) ?? headerValue(headers[':authority']);

  if (!authority) {
    return defaultOrigin;
  }

  let protocol = 'http';
  if (defaultOrigin) {
    try {
      protocol = new URL(defaultOrigin).protocol.replace(':', '') || 'http';
    } catch {
      // keep default protocol
    }
  }

  const scheme = headerValue(headers[':scheme']);
  if (scheme === 'http' || scheme === 'https') {
    protocol = scheme;
  }

  const [, port] = authority.split(':');
  if (port === '443') {
    protocol = 'https';
  }

  return `${protocol}://${authority}`;
}

/**
 * Wraps a Node.js Readable as a WHATWG ReadableStream.
 *
 * This replaces the upstream `buildToReadableStream`, which copies every chunk
 * via `new Uint8Array([...new Uint8Array(chunk)])` — spreading each byte into a
 * plain JS array first. That is both slow and allocates a large intermediate
 * array. Here we use `new Uint8Array(chunk)` (an efficient element copy) and
 * apply backpressure by pausing the source stream when the queue fills up, and
 * cancelling/destroying it when the consumer aborts.
 */
export function buildToReadableStream(
  dependencies: BuildDependencies
): (stream: Readable) => ReadableStream {
  const { ReadableStream: ReadableStreamCtor, Uint8Array: Uint8ArrayCtor } =
    dependencies;
  return function toReadableStream(stream: Readable): ReadableStream {
    return new ReadableStreamCtor({
      start(controller: ReadableStreamDefaultController<Uint8Array>) {
        const onData = (chunk: Uint8Array) => {
          // Node Buffers may be backed by a shared pool and reused across
          // 'data' events, so copy defensively before enqueueing.
          controller.enqueue(new Uint8ArrayCtor(chunk));
          // Apply backpressure: pause the source when the internal queue
          // is full to avoid buffering an entire upload in memory.
          if (controller.desiredSize !== null && controller.desiredSize <= 0) {
            stream.pause();
          }
        };
        const onEnd = () => controller.close();
        const onError = (err: Error) => controller.error(err);

        stream.on('data', onData);
        stream.on('end', onEnd);
        stream.on('error', onError);
      },
      pull() {
        // Consumer drained some data; resume the paused source stream.
        stream.resume();
      },
      cancel() {
        // Consumer aborted (e.g. request body discarded); tear down the
        // underlying Node stream to release file descriptors / sockets.
        stream.destroy();
      },
    });
  };
}

/**
 * Converts Node IncomingMessage to Fetch Request with HTTP/2 compatibility.
 * @see https://github.com/web-widget/web-widget/issues/754
 * @see https://github.com/vercel/edge-runtime/issues/1152
 */
export function buildToRequest(dependencies: BuildDependencies) {
  const toHeaders = buildToHeaders(dependencies);
  const toReadableStream = buildToReadableStream(dependencies);
  const { Request } = dependencies;

  const getRequestHeaders = (
    incomingHeaders: IncomingHttpHeaders
  ): HeadersInit => {
    const headers = incomingHeaders[':authority']
      ? sanitizeIncomingHttpHeaders(incomingHeaders)
      : incomingHeaders;

    if (incomingHeaders[':authority'] || Array.isArray(headers['set-cookie'])) {
      return toHeaders(headers);
    }

    // The Request constructor snapshots a header record. Passing the common
    // HTTP/1 shape directly avoids constructing and then copying Headers.
    return headers as Record<string, string>;
  };

  let cachedDefaultOrigin = '';
  let cachedDefaultProtocol = 'http';

  const getDefaultProtocol = (defaultOrigin: string): string => {
    if (defaultOrigin === cachedDefaultOrigin) {
      return cachedDefaultProtocol;
    }

    cachedDefaultOrigin = defaultOrigin;
    try {
      cachedDefaultProtocol =
        new URL(defaultOrigin).protocol.replace(':', '') || 'http';
    } catch {
      cachedDefaultProtocol = 'http';
    }
    return cachedDefaultProtocol;
  };

  return function toRequest(
    request: IncomingMessage,
    options: RequestOptions
  ): Request {
    const requestHeaders = request.headers;
    const authority =
      headerValue(requestHeaders.host) ??
      headerValue(requestHeaders[':authority']);
    let protocol = getDefaultProtocol(options.defaultOrigin);
    const scheme = headerValue(requestHeaders[':scheme']);

    if (scheme === 'http' || scheme === 'https') {
      protocol = scheme;
    } else if (authority?.endsWith(':443')) {
      protocol = 'https';
    }

    const base = authority
      ? `${protocol}://${authority}`
      : options.defaultOrigin;
    const rawUrl = request.url || '/';
    // Incoming origin-form targets can be appended to an authority safely.
    // Request performs the single canonical URL parse and paths beginning with
    // // remain paths instead of being interpreted as protocol-relative URLs.
    const url =
      authority && rawUrl.startsWith('/')
        ? base + rawUrl
        : String(new URL(rawUrl, base));
    const method = request.method || 'GET';

    const headers = getRequestHeaders(requestHeaders);
    if (method === 'GET') {
      return new Request(url, { headers });
    }
    if (method === 'HEAD') {
      return new Request(url, { method, headers });
    }
    return new Request(url, {
      method,
      headers,
      body: toReadableStream(request),
      duplex: 'half',
    } as RequestInit);
  };
}

export const buildToRequestWithHttp2Compat = buildToRequest;

export interface NodeRequestSource {
  readonly method: string;
  readonly url: string;
  cancel(): void;
  toRequest(): Request;
}

/** @internal Builds the request source consumed by web-router's lazy host path. */
export function buildToRequestSource(
  dependencies: BuildDependencies,
  options: RequestOptions
) {
  const toRequest = buildToRequest(dependencies);
  const incomingKey = Symbol('incomingMessage');
  const nativeKey = Symbol('nativeRequest');

  type InternalRequestSource = NodeRequestSource & {
    [incomingKey]: IncomingMessage;
    [nativeKey]?: Request;
  };

  const sourcePrototype: NodeRequestSource = {
    method: 'GET',
    url: '',
    toRequest(this: InternalRequestSource) {
      return (this[nativeKey] ??= toRequest(this[incomingKey], options));
    },
    cancel(this: InternalRequestSource) {
      const request = this[nativeKey];
      if (request) {
        const body = request.body;
        if (body && !body.locked) body.cancel().catch(() => {});
      } else if (this.method !== 'GET' && this.method !== 'HEAD') {
        this[incomingKey].destroy();
      }
    },
  };

  let cachedDefaultOrigin = '';
  let cachedDefaultProtocol = 'http';

  const getDefaultProtocol = (defaultOrigin: string): string => {
    if (defaultOrigin === cachedDefaultOrigin) return cachedDefaultProtocol;

    cachedDefaultOrigin = defaultOrigin;
    try {
      cachedDefaultProtocol =
        new URL(defaultOrigin).protocol.replace(':', '') || 'http';
    } catch {
      cachedDefaultProtocol = 'http';
    }
    return cachedDefaultProtocol;
  };

  return function toRequestSource(
    incomingMessage: IncomingMessage
  ): NodeRequestSource {
    const headers = incomingMessage.headers;
    const authority =
      headerValue(headers.host) ?? headerValue(headers[':authority']);
    let protocol = getDefaultProtocol(options.defaultOrigin);
    const scheme = headerValue(headers[':scheme']);

    if (scheme === 'http' || scheme === 'https') protocol = scheme;
    else if (authority?.endsWith(':443')) protocol = 'https';

    const base = authority
      ? `${protocol}://${authority}`
      : options.defaultOrigin;
    const rawUrl = incomingMessage.url || '/';
    const source = Object.create(sourcePrototype) as InternalRequestSource & {
      method: string;
      url: string;
    };
    source.method = incomingMessage.method || 'GET';
    source.url =
      authority && rawUrl.startsWith('/')
        ? base + rawUrl
        : String(new URL(rawUrl, base));
    source[incomingKey] = incomingMessage;
    return source;
  };
}
