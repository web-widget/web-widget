import type { MiddlewareNext } from '@web-widget/helpers';
import { defineMiddlewareHandler } from '@web-widget/helpers';
import {
  cacheControl as setCacheControl,
  vary as setVary,
} from '@web-widget/helpers/headers';
import type { CachePolicyObject } from '@web-widget/http-cache-semantics';
import CachePolicy from '@web-widget/http-cache-semantics';
import { createKeyGenerator } from './key';
import type { KeyRules, PartDefiners } from './key';

declare module '@web-widget/schema' {
  interface RouteConfig {
    cache?: Partial<CacheOptions> | boolean;
  }
}

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
   *   host: true,
   *   method: { include: ['GET', 'HEAD'] },
   *   pathname: true,
   *   search: true,
   *   very: true
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
    host: true,
    method: { include: ['GET', 'HEAD'] },
    pathname: true,
    search: true,
    very: true,
  }),
  shared: true,
});

export { DEFAULT_OPTIONS as defaultOptions };

export type CacheStatus =
  | 'HIT'
  | 'MISS'
  | 'EXPIRED'
  | 'STALE'
  | 'BYPASS'
  | 'REVALIDATED';

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
    const rawConfig = ctx?.module?.config?.cache;
    if (rawConfig === false) {
      return bypassCache(next);
    }

    const routeConfig: Partial<CacheOptions> =
      rawConfig === true ? {} : rawConfig ?? {};
    const resolveOptions = {
      ...defaultOptions,
      ...routeConfig,
    };

    const req = ctx.request;
    const control = resolveOptions.control
      ? resolveOptions.control(req)
      : undefined;

    if (control?.includes('no-store')) {
      return bypassCache(next);
    }

    const shared = !!resolveOptions.shared;
    const vary = resolveOptions.vary ? resolveOptions.vary(req) : undefined;
    const createKey =
      typeof resolveOptions.key === 'function'
        ? resolveOptions.key
        : createKeyGenerator(
            resolveOptions.key,
            resolveOptions.parts,
            vary?.split(',').map((field) => field.trim())
          );
    const key = await createKey(req);

    if (!key) {
      throw new Error('Missing cache key.');
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
          setCacheStatus(response.headers, 'STALE');
        } else {
          // NOTE: This will take effect when caching TTL is not working.
          response = await revalidate(getResponse, req, set, key, cache);
          setCacheStatus(response.headers, 'EXPIRED');
        }
      } else {
        setCacheStatus(response.headers, 'HIT');
      }

      return response;
    }

    const res = await getResponse(req);
    setCacheStatus(res.headers, 'MISS');

    if (res.status === 304) {
      let etag = formatETag(res.headers.get('etag'));
      let ifNoneMatch = req.headers.get('if-none-match');
      if (etag) {
        if (ifNoneMatch && ifNoneMatch === etag) {
          setCacheStatus(res.headers, 'REVALIDATED');
        } else {
          setCacheStatus(res.headers, 'EXPIRED');
        }
        res.headers.set('etag', formatETag(etag, 'weak'));
      }
    }

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

async function bypassCache(next: MiddlewareNext) {
  const res = await next();
  setCacheStatus(res.headers, 'BYPASS');
  return res;
}

function setCacheStatus(headers: Headers, status: CacheStatus) {
  headers.set('x-cache-status', status);
}

// formats the etag depending on the response context. if the entityId
// is invalid, returns an empty string (instead of null) to prevent the
// the potentially disastrous scenario where the value of the Etag resp
// header is "null". Could be modified in future to base64 encode etc
const formatETag = (
  entityId: string | null,
  validatorType: string = 'strong'
) => {
  if (!entityId) {
    return '';
  }
  switch (validatorType) {
    case 'weak':
      if (!entityId.startsWith('W/')) {
        if (entityId.startsWith(`"`) && entityId.endsWith(`"`)) {
          return `W/${entityId}`;
        }
        return `W/"${entityId}"`;
      }
      return entityId;
    case 'strong':
      if (entityId.startsWith(`W/"`)) {
        entityId = entityId.replace('W/', '');
      }
      if (!entityId.endsWith(`"`)) {
        entityId = `"${entityId}"`;
      }
      return entityId;
    default:
      return '';
  }
};

export { createKeyGenerator };
