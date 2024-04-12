import { defineMiddlewareHandler } from '@web-widget/helpers';
import {
  cacheControl as setCacheControl,
  vary as setVary,
} from '@web-widget/helpers/headers';
import type { CachePolicyObject } from '@web-widget/http-cache-semantics';
import CachePolicy from '@web-widget/http-cache-semantics';
import { createCacheKeyGenerator } from './cache-key';
import type { CacheKeyRules, PartDefiners } from './cache-key';

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
  cacheControl?: (request: Request) => string;

  /**
   * Override HTTP `Vary` header.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
   */
  vary?: (request: Request) => string;

  /**
   * Ignore the `Cache-Control` header in the request.
   * @default true
   */
  ignoreRequestCacheControl?: boolean;

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
  cacheKey?: CacheKeyRules | ((request: Request) => Promise<string>);

  /**
   * Define custom parts for cache keys.
   */
  parts?: PartDefiners;

  /**
   * A method to get a cache value by cacheKey.
   */
  get: (cacheKey: string) => Promise<any>;

  /**
   * A method to set a cache value by cacheKey.
   * If `ttl` is provided, then it's the time-to-live in milliseconds.
   */
  set: (cacheKey: string, value: any, ttl?: number) => Promise<void>;
};

export type CacheItem = {
  response: {
    body: string;
    status: number;
    statusText: string;
  };
  policy: CachePolicyObject;
};

const DEFAULT_OPTIONS = Object.freeze({
  ignoreRequestCacheControl: true,
  cacheKey: Object.freeze({
    host: true,
    method: { include: ['GET', 'HEAD'] },
    pathname: true,
    search: true,
    very: true,
  }),
});

export { DEFAULT_OPTIONS as defaultOptions };

export type CacheStatus =
  | 'HIT'
  | 'MISS'
  | 'EXPIRED'
  | 'STALE'
  | 'BYPASS'
  | 'REVALIDATED'
  | 'DYNAMIC';

export const HIT: CacheStatus = 'HIT';
export const MISS: CacheStatus = 'MISS';
export const EXPIRED: CacheStatus = 'EXPIRED';
export const STALE: CacheStatus = 'STALE';
export const BYPASS: CacheStatus = 'BYPASS';
export const REVALIDATED: CacheStatus = 'REVALIDATED';
export const DYNAMIC: CacheStatus = 'DYNAMIC';

export default function cache(options: CacheOptions) {
  const { get, set } = options;

  if (!get) throw new Error('.get not defined');
  if (!set) throw new Error('.set not defined');

  const defaultOptions = {
    parts: {},
    ...DEFAULT_OPTIONS,
    ...options,
  };

  return defineMiddlewareHandler(async function cacheMiddleware(context, next) {
    const rawConfig = context?.module?.config?.cache;
    if (rawConfig === false) {
      const response = await next();
      setCacheStatus(response.headers, BYPASS);
      return response;
    }

    const routeConfig: Partial<CacheOptions> =
      rawConfig === true ? {} : rawConfig ?? {};
    const resolveOptions = {
      ...defaultOptions,
      ...routeConfig,
    };

    const request = context.request;
    const vary = resolveOptions.vary ? resolveOptions.vary(request) : undefined;
    const ignoreRequestCacheControl = resolveOptions.ignoreRequestCacheControl;
    const cacheControl = resolveOptions.cacheControl
      ? resolveOptions.cacheControl(request)
      : undefined;

    if (cacheControl) {
      if (
        cacheControl.includes('no-store') ||
        cacheControl.includes('no-cache') ||
        cacheControl.includes('private') ||
        cacheControl.includes('s-maxage=0') ||
        (!cacheControl.includes('s-maxage') &&
          cacheControl.includes('max-age=0'))
      ) {
        const response = await next();
        setCacheStatus(response.headers, BYPASS);
        setCacheControl(response.headers, cacheControl);
        if (vary) {
          setVary(response.headers, vary);
        }
        return response;
      }
    }

    const createCacheKey =
      typeof resolveOptions.cacheKey === 'function'
        ? resolveOptions.cacheKey
        : createCacheKeyGenerator(
            resolveOptions.cacheKey,
            resolveOptions.parts,
            vary?.split(',').map((field) => field.trim())
          );
    const cacheKey = await createCacheKey(request);

    if (!cacheKey) {
      throw new Error('Missing cache key.');
    }

    const getResponse = async (request: Request) => {
      context.request = request;
      const response = await next();

      if (cacheControl) {
        setCacheControl(response.headers, cacheControl);
      }

      if (vary) {
        setVary(response.headers, vary);
      }

      return response;
    };

    const cache = await getCache(get, cacheKey);
    if (cache) {
      const policy = cache.policy;
      let response = cache.response;
      const stale = ignoreRequestCacheControl
        ? policy.stale()
        : !policy.satisfiesWithoutRevalidation(request);

      if (stale) {
        if (policy.useStaleWhileRevalidate()) {
          // Well actually, in this case it's fine to return the stale response.
          // But we'll update the cache in the background.
          // TODO: Use waitUntil
          revalidate(getResponse, request, set, cacheKey, cache).then(() => {});
          setCacheStatus(response.headers, STALE);
        } else {
          // NOTE: This will take effect when caching TTL is not working.
          response = await revalidate(
            getResponse,
            request,
            set,
            cacheKey,
            cache
          );
          setCacheStatus(response.headers, EXPIRED);
        }
      } else {
        setCacheStatus(response.headers, HIT);
      }

      return response;
    }

    const response = await getResponse(request);

    if (cacheControl) {
      setCacheStatus(response.headers, MISS);
    } else {
      setCacheStatus(response.headers, DYNAMIC);
    }

    if (response.status === 304) {
      const etag = formatETag(response.headers.get('etag'));
      const ifNoneMatch = request.headers.get('if-none-match');
      if (etag) {
        if (ifNoneMatch && ifNoneMatch === etag) {
          setCacheStatus(response.headers, REVALIDATED);
        } else {
          setCacheStatus(response.headers, EXPIRED);
        }
        response.headers.set('etag', formatETag(etag, 'weak'));
      }
    }

    await setCache(set, cacheKey, {
      response: response,
      policy: new CachePolicy(request, response),
    });

    return response;
  });
}

async function getCache(
  get: (cacheKey: string) => Promise<CacheItem | undefined>,
  cacheKey: string
) {
  const cacheValue = await get(cacheKey);

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
  set: (cacheKey: string, value: any, ttl?: number) => Promise<void>,
  cacheKey: string,
  value: {
    response: Response;
    policy: CachePolicy;
  }
) {
  const ttl = value.policy.timeToLive();

  if (value.policy.storable() && ttl > 0) {
    const newCacheValue: CacheItem = {
      policy: value.policy.toObject(),
      response: {
        body: await value.response.clone().text(),
        status: value.response.status,
        statusText: value.response.statusText,
      },
    };
    await set(cacheKey, newCacheValue, ttl);
    return true;
  }
  return false;
}

async function revalidate(
  fetch: (request: Request) => Promise<Response>,
  request: Request,
  set: (cacheKey: string, value: any, ttl?: number) => Promise<void>,
  cacheKey: string,
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
  const response = modified ? revalidationResponse : cache.response;

  await setCache(set, cacheKey, {
    response: response,
    policy: revalidatedPolicy,
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: revalidatedPolicy.responseHeaders(),
  });
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

export { createCacheKeyGenerator };
