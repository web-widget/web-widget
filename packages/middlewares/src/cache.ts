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
  checkPresence?: string[];
};

type PartDefiner = (req: Request, options?: FilterOptions) => Promise<string>;

type KeyRules = {
  /** Use cookie as part of cache key. */
  cookie?: FilterOptions | boolean | undefined;
  /** Use device type as part of cache key. */
  device?: FilterOptions | boolean | undefined;
  /** Use header as part of cache key. */
  header?: FilterOptions | boolean | undefined;
  /** Use host as part of cache key. */
  host?: FilterOptions | boolean | undefined;
  /** Use method as part of cache key. */
  method?: FilterOptions | boolean | undefined;
  /** Use search as part of cache key. */
  search?: FilterOptions | boolean | undefined;
  /** Use custom variables as part of cache key. */
  [customKey: string]: FilterOptions | boolean | undefined;
};

type PartDefiners = {
  [customKey: string]: PartDefiner | undefined;
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
   * If `true`, then the response is evaluated from a perspective of a
   * shared cache (i.e. `private` is not cacheable and `s-maxage` is respected).
   * If `false`, then the response is evaluated from a perspective of a
   * single-user cache (i.e. `private` is cacheable and `s-maxage` is ignored).
   */
  shared?: boolean;

  /**
   * Create custom cache keys.
   * @default
   * ```json
   * {
   *   pathname: true,
   *   host: true,
   *   search: true,
   *   method: {
   *     include: ['GET', 'HEAD']
   *   }
   * }
   * ```
   */
  key?: KeyRules | ((req: Request) => Promise<string>);

  /**
   * Define custom parts for cache keys.
   */
  parts?: PartDefiners;

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
  key: Object.freeze({
    pathname: true,
    host: true,
    search: true,
    method: {
      include: ['GET', 'HEAD'],
    },
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
    parts: {},
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

    const shared = !!resolveOptions.shared;
    const vary = resolveOptions.vary ? resolveOptions.vary(req) : undefined;
    const createKey =
      typeof resolveOptions.key === 'function'
        ? resolveOptions.key
        : createKeyGenerator(resolveOptions.key, resolveOptions.parts);
    const key = await createKey(req);

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

export function createKeyGenerator(keyRules: KeyRules, parts?: PartDefiners) {
  const excludeAll: FilterOptions = {
    exclude: ['*'],
  };
  const includeAll = undefined;
  const toOptions = (options: any) =>
    typeof options === 'object' ? options : options ? includeAll : excludeAll;

  const { host, pathname, search, ...fragmentRules } = keyRules;
  const urlRules: KeyRules = { host, pathname, search };

  return async function keyDefiner(request: Request): Promise<string> {
    const url = new URL(request.url);
    const urlPart: string[] = ['host', 'pathname', 'search']
      .filter((name) => urlRules[name])
      .map((name) => {
        const urlPartDefiner = BUILT_IN_URL_PART_DEFINERS[name];
        return urlPartDefiner(url, toOptions(keyRules[name]));
      });

    const fragmentPart: string[] = await Promise.all(
      Object.keys(fragmentRules)
        .sort()
        .map((name) => {
          const expandedPartDefiners =
            BUILT_IN_EXPANDED_PART_DEFINERS[name] ?? parts?.[name];

          if (expandedPartDefiners) {
            return expandedPartDefiners(request, toOptions(keyRules[name]));
          }

          throw TypeError(
            `Unknown key rule: "${name}": "${name}" needs to be defined in "options.parts".`
          );
        })
    );

    return fragmentPart.length
      ? `${urlPart.join('')}#${fragmentPart.join(':')}`
      : urlPart.join('');
  };
}

function filter(
  array: [key: string, value: string][],
  options?: FilterOptions
) {
  let result = array;
  const exclude = options?.exclude;
  const include = options?.include;
  const checkPresence = options?.checkPresence;

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

  if (checkPresence?.length) {
    result = result.map((item) =>
      checkPresence.includes(item[0]) ? [item[0], ''] : item
    );
  }

  return result;
}

function search(url: URL, options?: FilterOptions) {
  const { searchParams } = url;
  searchParams.sort();

  const entries = Array.from(searchParams.entries());
  const search = filter(entries, options)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return search ? `?${search}` : '';
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
  const hasBody =
    request.body && ['POST', 'PATCH', 'PUT'].includes(request.method);
  return (
    await Promise.all(
      filter([[request.method, '']], options).map(async ([key]) => {
        if (hasBody) {
          const hash = await shortHash(request.body);
          return `${key}=${hash}`;
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
        async ([key, value]) => `${key}=${await shortHash(value)}`
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
        async ([key, value]) => `${key}=${await shortHash(value)}`
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

const BUILT_IN_EXPANDED_PART_DEFINERS: PartDefiners = {
  cookie,
  device,
  header,
  method,
};
