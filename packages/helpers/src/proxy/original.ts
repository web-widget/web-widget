function splitCommaSeparatedValues(value: string, limit: number): string[] {
  return value.split(',', limit).map((v) => v.trim());
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
