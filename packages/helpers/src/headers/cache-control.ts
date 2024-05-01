export type ResponseCacheControlOptions = {
  /**
   * The `immutable` response directive.
   * It indicates that the response will not be updated
   * while it's fresh.
   */
  immutable?: boolean;

  /**
   * The `max-age=N` response directive.
   * It indicates that the response remains fresh until N seconds
   * after the response is generated.
   */
  maxAge?: number;

  /**
   * The `must-revalidate` response directive.
   * It indicates that the response can be stored in caches
   * and can be reused while fresh. If the response becomes stale,
   * it must be validated with the origin server before reuse.
   */
  mustRevalidate?: boolean;

  /**
   * The `must-understand` response directive.
   * It indicates that a cache should store the response only
   * if it understands the requirements for caching based on status code.
   */
  mustUnderstand?: boolean;

  /**
   * The `no-cache` response directive.
   * It indicates that the response can be stored in caches,
   * but the response must be validated with the origin server
   * before each reuse, even when the cache is disconnected from the origin server.
   */
  noCache?: boolean;

  /**
   * The `no-store` response directive.
   * It indicates that any caches of any kind (private or shared)
   * should not store this response.
   */
  noStore?: boolean;

  /**
   * `no-transform` directive.
   * It indicates that any intermediary (regardless of whether
   * it implements a cache) shouldn't transform the response contents.
   */
  noTransform?: boolean;

  /**
   * The `proxy-revalidate` response directive.
   * It is the equivalent of `must-revalidate`,
   * but specifically for shared caches only.
   */
  proxyRevalidate?: boolean;

  /**
   * Configures the resource to be public.
   * It means it can be shared even if
   * the request carries an authentication header.
   */
  public?: boolean;

  /**
   * The `s-maxage` response directive.
   * It indicates how long the response remains fresh in a shared cache.
   * The `s-maxage` directive is ignored by private caches,
   * and overrides the value specified by the `max-age` directive
   * or the Expires header for shared caches, if they are present.
   */
  sharedMaxAge?: number;

  /**
   * The `stale-if-error` response directive.
   * It indicates that the cache can reuse a stale response
   * when an upstream server generates an error,
   * or when the error is generated locally.
   * Here, an error is considered any response with a status code of 500, 502, 503, or 504.
   */
  staleIfError?: number;

  /**
   * The `stale-while-revalidate` response directive.
   * It indicates that the cache could reuse a stale response
   * while it revalidates it to a cache.
   */
  staleWhileRevalidate?: number;
};

export type RequestCacheControlOptions = {
  /**
   * The `max-age=N` request directive.
   * It indicates that the client allows a stored response
   * that is generated on the origin server within N seconds.
   * Here, N may be any non-negative integer (including 0).
   */
  maxAge?: number;

  /**
   * The `max-stale=N` request directive.
   * It indicates that the client allows a stored response
   * that is stale within N seconds.
   */
  maxStale?: number;

  /**
   * The `min-fresh=N` request directive.
   * It indicates that the client allows a stored response
   * that is fresh for at least N seconds.
   */
  minFresh?: number;

  /**
   * The `no-cache` request directive.
   * It asks caches to validate the response with the origin server before reuse.
   */
  noCache?: boolean;

  /**
   * The `no-store` request directive.
   * It allows a client to request that caches refrain from storing
   * the request and corresponding response.
   * This is even if the origin server's response could be stored.
   */
  noStore?: boolean;

  /**
   * Same meaning that `no-transform` has for a response,
   * but for a request instead.
   */
  noTransform?: boolean;

  /**
   * The client indicates that an already-cached response should be returned.
   * If a cache has a stored response, even a stale one, it will be returned.
   * If no cached response is available, a 504 Gateway Timeout response will be returned.
   */
  onlyIfCached?: boolean;
};

const responseMappings: {
  [key in keyof ResponseCacheControlOptions]: string | ((value: any) => string);
} = {
  immutable: 'immutable',
  maxAge: (value: number) => `max-age=${value}`,
  mustRevalidate: 'must-revalidate',
  mustUnderstand: 'must-understand',
  noCache: 'no-cache',
  noStore: 'no-store',
  noTransform: 'no-transform',
  proxyRevalidate: 'proxy-revalidate',
  public: (value: boolean) => (value ? 'public' : 'private'),
  sharedMaxAge: (value: number) => `s-maxage=${value}`,
  staleIfError: (value: number) => `stale-if-error=${value}`,
  staleWhileRevalidate: (value: number) => `stale-while-revalidate=${value}`,
};

function arrayifyResponseCacheControl(
  options: ResponseCacheControlOptions
): string[] {
  return Object.entries(responseMappings).reduce((config, [key, transform]) => {
    const value = options[key as keyof typeof options];
    if (value !== undefined) {
      config.push(
        typeof transform === 'function' ? transform(value as never) : transform
      );
    }
    return config;
  }, [] as string[]);
}

const requestMappings: {
  [key in keyof RequestCacheControlOptions]: string | ((value: any) => string);
} = {
  maxAge: (value: number) => `max-age=${value}`,
  maxStale: (value: number) => `max-stale=${value}`,
  minFresh: (value: number) => `min-fresh=${value}`,
  noCache: 'no-cache',
  noStore: 'no-store',
  noTransform: 'no-transform',
  onlyIfCached: 'only-if-cached',
};

function arrayifyRequestCacheControl(
  options: RequestCacheControlOptions
): string[] {
  return Object.entries(requestMappings).reduce((config, [key, transform]) => {
    const value = options[key as keyof typeof options];
    if (value !== undefined) {
      config.push(
        typeof transform === 'function' ? transform(value as never) : transform
      );
    }
    return config;
  }, [] as string[]);
}

export function stringifyResponseCacheControl(
  options: ResponseCacheControlOptions
): string {
  return arrayifyResponseCacheControl(options).join(', ');
}

export function stringifyRequestCacheControl(
  options: RequestCacheControlOptions
): string {
  return arrayifyRequestCacheControl(options).join(', ');
}

/**
 * Append `cache-control` headers.
 */
export function cacheControl(
  headers: Headers,
  cacheControl: string | string[]
) {
  const directives = Array.isArray(cacheControl)
    ? cacheControl
    : cacheControl.split(',');

  append(headers, directives);
}

function append(headers: Headers, directives: string[]) {
  const existingDirectives =
    headers
      .get('cache-control')
      ?.split(',')
      .map((d) => d.trim().split('=', 1)[0]) ?? [];
  for (const directive of directives) {
    let [name, value] = directive.trim().split('=', 2);
    name = name.toLowerCase();
    if (!existingDirectives.includes(name)) {
      headers.append('cache-control', `${name}${value ? `=${value}` : ''}`);
    }
  }
}

/**
 * Append `cache-control` headers to a response.
 */
export function responseCacheControl(
  headers: Headers,
  options: ResponseCacheControlOptions
) {
  append(headers, arrayifyResponseCacheControl(options));
}

/**
 * Append `cache-control` headers to a request.
 */
export function requestCacheControl(
  headers: Headers,
  options: RequestCacheControlOptions
) {
  append(headers, arrayifyRequestCacheControl(options));
}
