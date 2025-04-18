function splitCommaSeparatedValues(value: string, limit: number): string[] {
  return value.split(',', limit).map((v) => v.trim());
}

// https://datatracker.ietf.org/doc/html/rfc2616#section-13.5.1
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
];

function createRequestInitFromRequest(
  request: Request | undefined
): RequestInit & { duplex?: 'half' } {
  if (!request) {
    return {};
  }

  const headers = new Headers(request.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));

  return {
    method: request.method,
    body: request.body,
    duplex: request.body ? 'half' : undefined,
    headers,
    signal: request.signal,
  };
}

function normalizeRequestInit(init: RequestInit): RequestInit {
  if (
    !init.headers ||
    Array.isArray(init.headers) ||
    init.headers instanceof Headers
  ) {
    return init;
  }

  const headers = new Headers();
  Object.entries(init.headers).forEach(([key, value]) => {
    if (value == null) {
      headers.delete(key);
    } else {
      headers.set(key, value);
    }
  });
  init.headers = headers;
  return init;
}

/**
 * Resolves the forwarded URL from the request headers.
 * @param request - The original Request object.
 * @returns A new URL object with the resolved host and protocol.
 */
export function resolveForwardedUrl(request: Request): URL {
  const url = new URL(request.url);
  const headers = request.headers;
  const { host, proto } = parseForwardedHeaders(headers);

  if (host) {
    url.host = host;
  }

  if (proto) {
    url.protocol = proto;
  }

  return url;
}

/**
 * Normalizes a forwarded request by resolving its URL.
 * @param request - The original Request object.
 * @returns A new Request object with the resolved URL, or the original request if no changes are needed.
 */
export function normalizeForwardedRequest(request: Request): Request {
  const resolvedUrl = resolveForwardedUrl(request);
  return request.url === resolvedUrl.href
    ? request
    : new Request(resolvedUrl, request);
}

/**
 * Parses the forwarded headers to extract the host and protocol.
 * @param headers - The Headers object from the request.
 * @returns An object containing the parsed host and protocol, if available.
 */
export function parseForwardedHeaders(headers: Headers): {
  host?: string;
  proto?: string;
} {
  const forwardedHost = headers.get('x-forwarded-host');
  const forwardedProto = headers.get('x-forwarded-proto');

  return {
    host: forwardedHost
      ? splitCommaSeparatedValues(forwardedHost, 1)[0]
      : undefined,
    proto: forwardedProto
      ? splitCommaSeparatedValues(forwardedProto, 1)[0]
      : undefined,
  };
}

/**
 * Fetches a resource using a proxy, normalizing the request and response.
 * @param input - The resource to fetch, either a URL or a Request object.
 * @param init - Optional RequestInit object to customize the request.
 * @param originRequest - Optional original Request object for additional context.
 * @returns A Promise that resolves to the Response object.
 */
export async function fetchWithProxy(
  input: RequestInfo | URL,
  init?: RequestInit,
  originRequest?: Request
): Promise<Response> {
  const request = buildProxyRequest(input, init, originRequest);
  const response = await fetch(request);
  return buildProxyResponse(response);
}

/**
 * Builds a proxy request by combining the input, init, and origin request.
 * @param input - The resource to fetch, either a URL or a Request object.
 * @param init - Optional RequestInit object to customize the request.
 * @param originRequest - Optional original Request object for additional context.
 * @returns A new Request object configured for proxying.
 */
export function buildProxyRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
  originRequest?: Request
): Request {
  const requestInit = {
    ...createRequestInitFromRequest(originRequest),
    ...normalizeRequestInit(init || {}),
  };
  const request = new Request(input, requestInit);
  request.headers.delete('accept-encoding');
  return request;
}

/**
 * Builds a proxy response by removing hop-by-hop headers and handling content encoding.
 * @param response - The original Response object.
 * @returns A new Response object with normalized headers.
 */
export function buildProxyResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));

  if (headers.has('content-encoding')) {
    headers.delete('content-encoding');
    headers.delete('content-length');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
