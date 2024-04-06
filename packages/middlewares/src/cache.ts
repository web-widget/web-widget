import { defineMiddlewareHandler } from '@web-widget/helpers';
import { sha1 } from '@web-widget/helpers/crypto';
import {
  cacheControl as setCacheControl,
  vary as setVary,
  deviceType as getDeviceType,
} from '@web-widget/helpers/headers';
import type { CachePolicyObject } from '@web-widget/http-cache-semantics';
import CachePolicy from '@web-widget/http-cache-semantics';

declare module '@web-widget/schema' {
  interface RouteConfig {
    cache?: Partial<CacheOptions> | boolean;
  }
}

export interface CacheOptions {
  /**
   * Override HTTP `Cache-Control` header.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
   */
  control?: (req: Request) => string;

  /**
   * Override HTTP `Vary` header.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
   */
  vary?: (req: Request) => string;

  /**
   * A boolean value that specifies whether to ignore the query string
   * in the URL. For example, if set to true the ?value=bar part of
   * http://foo.com/?value=bar would be ignored when performing a match.
   * It defaults to false.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Cache/match#ignoresearch
   */
  ignoreSearch?: boolean;

  /**
   * A boolean value that, when set to true, prevents matching operations
   * from validating the Request http method (normally only GET and HEAD
   * are allowed.) It defaults to false.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Cache/match#ignoremethod
   */
  ignoreMethod?: boolean;

  /**
   * A boolean value that when set to true tells the matching operation
   * not to perform VARY header matching — i.e. if the URL matches you
   * will get a match regardless of whether the Response object has a
   * VARY header. It defaults to false.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Cache/match#ignorevary
   */
  ignoreVary?: boolean;

  /**
   * A boolean value that specifies whether to ignore the device type.
   * It defaults to false.
   *
   * Cache middleware evaluates the User-Agent header in the HTTP request to
   * identify the device type and identifies each device type with a case
   * insensitive match to the regex below:
   *
   * - Mobile: `(?:phone|windows\s+phone|ipod|blackberry|(?:android|bb\d+|meego|silk|googlebot) .+? mobile|palm|windows\s+ce|opera\ mini|avantgo|mobilesafari|docomo|KAIOS)`
   * - Tablet: `(?:ipad|playbook|(?:android|bb\d+|meego|silk)(?! .+? mobile))`
   * - Desktop: Everything else not matched above.
   */
  ignoreDevice?: boolean;

  /**
   * If `true`, then the response is evaluated from a perspective of a
   * shared cache (i.e. `private` is not cacheable and `s-maxage` is respected).
   * If `false`, then the response is evaluated from a perspective of a
   * single-user cache (i.e. `private` is cacheable and `s-maxage` is ignored).
   * `true` is recommended for HTTP clients.
   */
  shared?: (req: Request) => boolean;

  /**
   * Create custom cache keys.
   */
  key?: typeof getKey;

  /**
   * A method to get the device type from the User-Agent header.
   */
  deviceType?: typeof getDeviceType;

  /**
   * This is a method for unit testing.
   *
   * If the value is `true`, then the cache will be updated in the background
   * after the response is sent.
   *
   * If the value is `false`, then the cache will be updated before the
   * response is sent.
   */
  _backgroundUpdate?: boolean;

  /**
   * A method to get a cache value by key.
   */
  get: (key: string) => Promise<any>;

  /**
   * A method to set a cache value by key.
   * If `ttl` is provided, then it's the time-to-live in milliseconds.
   */
  set: (key: string, value: any, ttl?: number) => Promise<void>;
}

export type CacheValue = {
  response: {
    body: string;
    status: number;
    statusText: string;
  };
  policy: CachePolicyObject;
};

export default function cache(options: CacheOptions) {
  const { get, set } = options;

  if (!get) throw new Error('.get not defined');
  if (!set) throw new Error('.set not defined');

  const defaultOptions = {
    _backgroundUpdate: true,
    ignoreMethod: false,
    ignoreSearch: false,
    ignoreVary: false,
    key: getKey,
    deviceType: getDeviceType,
    shared: () => true,
    ...options,
  };

  return defineMiddlewareHandler(async function cacheMiddleware(ctx, next) {
    if (!ctx.module?.config?.cache) {
      return next();
    }

    const rawConfig = ctx.module.config.cache;
    const routeConfig: Partial<CacheOptions> =
      rawConfig === true ? {} : rawConfig;
    const resolveOptions = {
      ...defaultOptions,
      ...routeConfig,
    };

    const req = ctx.request;
    const control = resolveOptions.control
      ? resolveOptions.control(req)
      : undefined;

    if (control?.includes('no-store')) {
      return next();
    }

    // NOTE: Error: Failed to get the 'cache' property on 'Request': the property is not implemented.
    // @see https://github.com/cloudflare/miniflare/blob/c2ed3afdc1fed9f78d5cb6c50edc793a9a43a850/packages/core/src/standards/http.ts#L532
    // if (req.cache === 'no-store') {
    //   return next();
    // }

    if (
      req.method !== 'GET' &&
      req.method !== 'HEAD' &&
      !resolveOptions.ignoreMethod
    ) {
      return next();
    }

    const { ignoreSearch, ignoreMethod, ignoreVary, ignoreDevice } =
      resolveOptions;
    const vary = resolveOptions.vary ? resolveOptions.vary(req) : undefined;
    const deviceType = ignoreDevice
      ? undefined
      : resolveOptions.deviceType(req.headers);

    const shared = resolveOptions.shared(req);
    const key = await resolveOptions.key(req, {
      vary,
      deviceType,
      ignoreSearch,
      ignoreMethod,
      ignoreVary,
      ignoreDevice,
    });

    if (!key) {
      throw new Error('Cache key is not defined.');
    }

    const backgroundUpdate = resolveOptions._backgroundUpdate;
    const getResponse = async (req: Request) => {
      ctx.request = req;
      const res = await next();

      if (control) {
        setCacheControl(res.headers, control);
      }

      if (vary) {
        setVary(res.headers, vary);
      }

      if (!ignoreDevice) {
        res.headers.set(
          'X-Device-Type',
          resolveOptions.deviceType(req.headers)
        );
      }

      return res;
    };

    let cache = await getCache(get, key);
    if (cache) {
      const policy = cache.policy;
      let response = cache.response;

      if (!policy.satisfiesWithoutRevalidation(req)) {
        // Cache does not satisfy request. Need to revalidate.
        if (policy.useStaleWhileRevalidate()) {
          // Well actually, in this case it's fine to return the stale response.
          // But we'll update the cache in the background.
          // TODO: Use waitUntil
          if (backgroundUpdate) {
            revalidate(getResponse, req, set, key, cache).then(() => {});
          } else {
            await revalidate(getResponse, req, set, key, cache);
          }
        } else {
          response = await revalidate(getResponse, req, set, key, cache);
        }
      }

      return response;
    }

    const res = await getResponse(req);

    await setCache(set, key, {
      response: res,
      policy: new CachePolicy(req, res, {
        shared,
      }),
    });

    return res;
  });
}

async function getCache(
  get: (key: string) => Promise<CacheValue | undefined>,
  key: string
) {
  const cacheValue = await get(key);

  if (cacheValue) {
    const { body, status, statusText } = cacheValue.response;
    const policy = CachePolicy.fromObject(cacheValue.policy);
    const headers = policy.responseHeaders();

    headers.set('X-Cached-Response', 'HIT');
    const response = new Response(body, {
      status,
      statusText,
      headers,
    });
    return {
      response,
      policy,
    };
  }

  return cacheValue;
}

async function setCache(
  set: (key: string, value: any, ttl?: number) => Promise<void>,
  key: string,
  value: {
    response: Response;
    policy: CachePolicy;
  }
) {
  const ttl = value.policy.timeToLive();

  if (value.response.status === 206) {
    throw new TypeError(
      'Cannot cache response to a range request (206 Partial Content).'
    );
  }

  if (value.response.headers.get('Vary') === '*') {
    throw new TypeError("Cannot cache response with 'Vary: *' header.");
  }

  if (value.policy.storable() && ttl > 0) {
    const newCacheValue: CacheValue = {
      policy: value.policy.toObject(),
      response: {
        body: await value.response.clone().text(),
        status: value.response.status,
        statusText: value.response.statusText,
      },
    };
    await set(key, newCacheValue, ttl);
    return true;
  }
  return false;
}

async function revalidate(
  fetch: (request: Request) => Promise<Response>,
  request: Request,
  set: (key: string, value: any, ttl?: number) => Promise<void>,
  key: string,
  cache: {
    response: Response;
    policy: CachePolicy;
  }
): Promise<Response> {
  const revalidationRequest = new Request(request, {
    headers: cache.policy.revalidationHeaders(request),
  });
  let revalidationResponse: Response;

  try {
    revalidationResponse = await fetch(revalidationRequest);
  } catch (error) {
    if (cache.policy.useStaleIfError()) {
      return cache.response;
    } else {
      throw error;
    }
  }

  const { modified, policy: revalidatedPolicy } =
    cache.policy.revalidatedPolicy(revalidationRequest, revalidationResponse);
  const res = modified ? revalidationResponse : cache.response;

  await setCache(set, key, {
    response: res,
    policy: revalidatedPolicy,
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: revalidatedPolicy.responseHeaders(),
  });
}

async function shortHash(data: Parameters<typeof sha1>[0]) {
  return (await sha1(data))?.slice(0, 6);
}

/**
 * Generate a cache key for a request.
 */
export async function getKey(
  request: Request,
  options?: {
    vary?: string;
    deviceType?: string;
    ignoreSearch?: CacheOptions['ignoreSearch'];
    ignoreMethod?: CacheOptions['ignoreMethod'];
    ignoreVary?: CacheOptions['ignoreVary'];
    ignoreDevice?: CacheOptions['ignoreDevice'];
  }
): Promise<string> {
  const url = new URL(request.url);
  let key = url.origin + url.pathname;

  if (!options?.ignoreSearch) {
    url.searchParams.sort();
    key += url.search;
  }

  if (!options?.ignoreMethod) {
    key += `:${request.method}`;
    if (['POST', 'PATCH', 'PUT'].includes(request.method)) {
      const contentType = request.headers.get('Content-Type')?.toLowerCase();

      if (contentType?.includes('multipart/form-data')) {
        const hash = await shortHash(
          JSON.stringify(Array.from((await request.formData()).entries()))
        );
        key += `:${hash}`;
      } else if (request.body) {
        const hash = await shortHash(request.body);
        key += `:${hash}`;
      }
    }
  }

  if (!options?.ignoreDevice && options?.deviceType) {
    key += `:${options.deviceType}`;
  }

  if (!options?.ignoreVary && options?.vary) {
    const headers = Object.fromEntries(request.headers.entries());
    if (options?.vary === '*') {
      key += `:${await sha1(JSON.stringify(headers))}`;
    } else {
      let varies: Record<string, string> = {};
      for (const varyKey of options.vary
        .split(',')
        .map((v: string) => v.trim().toLowerCase())) {
        if (headers[varyKey]) {
          varies[varyKey] = headers[varyKey];
        }
      }
      if (Object.keys(varies).length > 0) {
        key += `:${await sha1(JSON.stringify(varies))}`;
      }
    }
  }

  return key;
}
