import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import type { Readable } from 'node:stream';
import type {
  BuildDependencies,
  RequestOptions,
} from '@edge-runtime/node-utils';
import { buildToHeaders } from '@edge-runtime/node-utils';

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
function buildToReadableStream(
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
 * Workaround for @edge-runtime/node-utils until upstream fixes land.
 *
 * @see https://github.com/web-widget/web-widget/issues/754
 * @see https://github.com/vercel/edge-runtime/issues/1152
 */
export function buildToRequestWithHttp2Compat(dependencies: BuildDependencies) {
  const toHeaders = buildToHeaders(dependencies);
  const toReadableStream = buildToReadableStream(dependencies);
  const { Request } = dependencies;

  return function toRequest(
    request: IncomingMessage,
    options: RequestOptions
  ): Request {
    const base = computeRequestOrigin(request.headers, options.defaultOrigin);
    const headers = sanitizeIncomingHttpHeaders(request.headers);

    return new Request(
      String(
        request.url?.startsWith('//')
          ? new URL(base + request.url)
          : new URL(request.url || '/', base)
      ),
      {
        method: request.method,
        headers: toHeaders(headers),
        body: !['HEAD', 'GET'].includes(request.method ?? '')
          ? toReadableStream(request)
          : null,
      }
    );
  };
}
