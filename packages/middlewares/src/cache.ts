import { defineMiddlewareHandler } from '@web-widget/helpers';
import { sha1 } from '@web-widget/helpers/crypto';
import {
  cacheControl as setCacheControl,
  vary as setVary,
  deviceType as getDeviceType,
  RequestCookies,
} from '@web-widget/helpers/headers';
import type { CachePolicyObject } from '@web-widget/http-cache-semantics';
import CachePolicy from '@web-widget/http-cache-semantics';

declare module '@web-widget/schema' {
  interface RouteConfig {
    cache?: Partial<CacheOptions> | boolean;
  }
}

type FilterOptions = {
  include?: string[];
  exclude?: string[];
};

type PartDefiner = (req: Request, options?: FilterOptions) => Promise<string>;

type KeyRules = {
  cookie?: FilterOptions | boolean | undefined;
  device?: FilterOptions | boolean | undefined;
  header?: FilterOptions | boolean | undefined;
  host?: FilterOptions | boolean | undefined;
  method?: FilterOptions | boolean | undefined;
  search?: FilterOptions | boolean | undefined;
  [key: string]: FilterOptions | boolean | undefined;
};

type KeyPartDefiners = {
  [key: string]: PartDefiner | undefined;
};

export type CacheOptions = {
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
   * Create custom cache keys.
   */
  keyRules?: KeyRules;

  keyPartDefiners?: KeyPartDefiners;

  /**
   * If `true`, then the response is evaluated from a perspective of a
   * shared cache (i.e. `private` is not cacheable and `s-maxage` is respected).
   * If `false`, then the response is evaluated from a perspective of a
   * single-user cache (i.e. `private` is cacheable and `s-maxage` is ignored).
   * `true` is recommended for HTTP clients.
   */
  shared?: boolean;

  /**
   * Create custom cache keys.
   */
  key?: typeof getKey;

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
};

export type CacheValue = {
  response: {
    body: string;
    status: number;
    statusText: string;
  };
  policy: CachePolicyObject;
};

const DEFAULT_OPTIONS = Object.freeze({
  key: getKey,
  keyRules: Object.freeze({
    method: Object.freeze({
      include: ['GET', 'HEAD'],
    }),
    pathname: true,
    host: true,
    search: true,
  }),
  shared: true,
});

export { DEFAULT_OPTIONS as defaultOptions };

export default function cache(options: CacheOptions) {
  const { get, set } = options;

  if (!get) throw new Error('.get not defined');
  if (!set) throw new Error('.set not defined');

  const defaultOptions = {
    _backgroundUpdate: true,
    keyPartDefiners: {},
    ...DEFAULT_OPTIONS,
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

    const { shared } = resolveOptions;
    const vary = resolveOptions.vary ? resolveOptions.vary(req) : undefined;
    const key = await resolveOptions.key(
      req,
      resolveOptions.keyRules,
      resolveOptions.keyPartDefiners
    );

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
async function getKey(
  request: Request,
  keyRules: KeyRules,
  keyPartDefiners: KeyPartDefiners
): Promise<string> {
  const excludeAll: FilterOptions = {
    exclude: ['*'],
  };
  const includeAll = undefined;
  const url = new URL(request.url);
  const toOptions = (options: any) =>
    typeof options === 'object' ? options : options ? includeAll : excludeAll;

  const keys: string[] = await Promise.all(
    Object.keys(keyRules)
      .sort()
      .map((name) => {
        const urlPartDefiner = BUILT_IN_URL_PART_DEFINERS[name];
        if (urlPartDefiner) {
          return urlPartDefiner(url, toOptions(keyRules[name]));
        }

        const expandedPartDefiners =
          BUILT_IN_EXPANDED_PART_DEFINERS[name] ?? keyPartDefiners[name];

        if (expandedPartDefiners) {
          return expandedPartDefiners(request, toOptions(keyRules[name]));
        }

        throw TypeError(
          `Unknown key rule: ${name}. Please add handler in options.keyPartDefiners.`
        );
      })
  );

  return keys.join('');
}

function filter(
  array: [key: string, value: string][],
  options?: FilterOptions
) {
  let result = array;
  const exclude = options?.exclude;
  const include = options?.include;

  if (exclude?.length) {
    const excludeAll = exclude.includes('*');
    if (excludeAll) {
      return [];
    }

    result = result.filter(([key]) => !exclude.includes(key));
  }

  if (include?.length) {
    const includeAll = include.includes('*');
    if (!includeAll) {
      result = result.filter(([key]) => include.includes(key));
    }
  }

  return result;
}

function search(url: URL, options?: FilterOptions) {
  const { searchParams } = url;
  searchParams.sort();

  if (!options) {
    return searchParams.toString();
  }

  const entries = Array.from(searchParams.entries());
  return filter(entries, options)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function host(url: URL, options?: FilterOptions) {
  const host = url.host;
  return filter([[host, '']], options)
    .map(([key]) => key)
    .join('');
}

function pathname(url: URL, options?: FilterOptions) {
  const pathname = url.pathname;
  return filter([[pathname, '']], options)
    .map(([key]) => key)
    .join('');
}

async function method(request: Request, options?: FilterOptions) {
  if (!options) {
    return request.method;
  }

  const hasBody =
    ['POST', 'PATCH', 'PUT'].includes(request.method) && request.body;
  return (
    await Promise.all(
      filter([[request.method, '']], options).map(async ([key]) => {
        if (hasBody) {
          const hash = await shortHash(request.body);
          return `${key}:${hash}`;
        }
        return key;
      })
    )
  ).join('');
}

async function header(request: Request, options?: FilterOptions) {
  const entries = Array.from(request.headers.entries());
  return (
    await Promise.all(
      filter(entries, options).map(
        async ([key, value]) =>
          `${key}=${await shortHash(value.trim().toLowerCase())}`
      )
    )
  ).join('&');
}

async function device(request: Request, options?: FilterOptions) {
  const device = getDeviceType(request.headers);
  return filter([[device, '']], options)
    .map(([key]) => key)
    .join('');
}

async function cookie(request: Request, options?: FilterOptions) {
  const cookie = new RequestCookies(request.headers);
  const entries: [string, string][] = cookie
    .getAll()
    .map(({ name, value }) => [name, value]);

  return (
    await Promise.all(
      filter(entries, options).map(
        async ([key, value]) =>
          `${key}=${await shortHash(value.trim().toLowerCase())}`
      )
    )
  ).join('&');
}

const BUILT_IN_URL_PART_DEFINERS: {
  [key: string]: (url: URL, options: FilterOptions) => string;
} = {
  host,
  pathname,
  search,
};

const BUILT_IN_EXPANDED_PART_DEFINERS: KeyPartDefiners = {
  cookie,
  device,
  header,
  method,
};
