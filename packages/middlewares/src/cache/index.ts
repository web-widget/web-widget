import { defineMiddlewareHandler } from '@web-widget/helpers';
import {
  cacheControl as setCacheControl,
  stringifyResponseCacheControl,
  vary as setVary,
  type ResponseCacheControlOptions,
} from '@web-widget/helpers/headers';
import type { CachePolicyObject } from '@web-widget/http-cache-semantics';
import CachePolicy from '@web-widget/http-cache-semantics';
import { createCacheKeyGenerator, vary as getVary } from './cache-key';
import type {
  CacheKeyRules,
  FilterOptions,
  CacheKeyPartDefiners,
} from './cache-key';

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
  cacheControl?:
    | string
    | ResponseCacheControlOptions
    | ((request: Request) => string | ResponseCacheControlOptions);

  /**
   * Override HTTP `Vary` header.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
   */
  vary?: string | string[] | ((request: Request) => string | string[]);

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
   * }
   * ```
   */
  cacheKey?: CacheKeyRules | ((request: Request) => Promise<string>);

  /**
   * Define custom parts for cache keys.
   */
  cacheKeyPartDefiners?: CacheKeyPartDefiners;

  /**
   * A method to get a cache value by cacheKey.
   */
  get: CustomCacheStorage['get'];

  /**
   * A method to set a cache value by cacheKey.
   * If `ttl` is provided, then it's the time-to-live in milliseconds.
   */
  set: CustomCacheStorage['set'];
};

export type CacheItem = {
  response: {
    body: string;
    status: number;
    statusText: string;
  };
  policy: CachePolicyObject;
};

type CacheItemResolved = {
  response: Response;
  policy: CachePolicy;
};

type CustomCacheStorage = {
  get: (cacheKey: string) => Promise<any | undefined>;
  set: (cacheKey: string, value: any, ttl?: number) => Promise<void>;
};

type Refetch = (request: Request) => Promise<Response>;

const DEFAULT_OPTIONS = Object.freeze({
  ignoreRequestCacheControl: true,
  cacheKey: Object.freeze({
    host: true,
    method: { include: ['GET', 'HEAD'] },
    pathname: true,
    search: true,
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
    cacheKeyPartDefiners: {},
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
    const vary =
      typeof resolveOptions.vary === 'function'
        ? resolveOptions.vary(request)
        : resolveOptions.vary;
    const ignoreRequestCacheControl = resolveOptions.ignoreRequestCacheControl;
    const cacheControlRawValue =
      typeof resolveOptions.cacheControl === 'function'
        ? resolveOptions.cacheControl(request)
        : undefined;
    const cacheControl =
      typeof cacheControlRawValue === 'string'
        ? cacheControlRawValue
        : cacheControlRawValue
          ? stringifyResponseCacheControl(cacheControlRawValue)
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

        if (response.status < 500) {
          setCacheControl(response.headers, cacheControl);
          if (vary) {
            setVary(response.headers, vary);
          }
        }

        setCacheStatus(response.headers, BYPASS);
        return response;
      }
    }

    const customCacheStorage: CustomCacheStorage = { get, set };
    const cacheKey =
      typeof resolveOptions.cacheKey === 'function'
        ? resolveOptions.cacheKey
        : createCacheKeyGenerator(
            resolveOptions.cacheKey,
            resolveOptions.cacheKeyPartDefiners
          );
    const customCacheKey = await cacheKey(request);

    if (!customCacheKey) {
      throw new Error('Missing cache key.');
    }

    const refetch: Refetch = async (request: Request) => {
      context.request = request;
      const response = await next();

      if (response.status < 500) {
        if (cacheControl) {
          setCacheControl(response.headers, cacheControl);
        }

        if (vary) {
          setVary(response.headers, vary);
        }
      }

      return response;
    };

    const cache = await matchCache(request, {
      customCacheStorage,
      customCacheKey,
      refetch,
      ignoreRequestCacheControl,
    });

    if (cache) {
      return cache;
    }

    const response = await refetch(request);

    if (response.headers.has('cache-control')) {
      await putCache(request, response, {
        customCacheStorage,
        customCacheKey,
      });
      setCacheStatus(response.headers, MISS);
    } else {
      setCacheStatus(response.headers, DYNAMIC);
    }

    /* istanbul ignore if */
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

    return response;
  });
}

async function matchCache(
  request: Request,
  options: {
    customCacheStorage: CustomCacheStorage;
    customCacheKey: string;
    refetch: Refetch;
    ignoreRequestCacheControl: boolean;
  }
): Promise<Response | null> {
  const cacheItem = await getCacheItem(
    request,
    options.customCacheStorage,
    options.customCacheKey
  );

  if (!cacheItem) {
    return null;
  }

  const { body, status, statusText } = cacheItem.response;
  const policy = CachePolicy.fromObject(cacheItem.policy);
  const headers = policy.responseHeaders();

  const response = new Response(body, {
    status,
    statusText,
    headers,
  });
  const stale = options.ignoreRequestCacheControl
    ? policy.stale()
    : !policy.satisfiesWithoutRevalidation(request);

  if (stale) {
    const resolveCacheItem: CacheItemResolved = {
      response,
      policy,
    };
    /* istanbul ignore else */
    if (policy.useStaleWhileRevalidate()) {
      // Well actually, in this case it's fine to return the stale response.
      // But we'll update the cache in the background.
      // TODO: Use waitUntil
      revalidateCache(request, resolveCacheItem, options).then(() => {});
      setCacheStatus(response.headers, STALE);
      return response;
    } else {
      // NOTE: This will take effect when caching TTL is not working.
      const response = await revalidateCache(
        request,
        resolveCacheItem,
        options
      );
      setCacheStatus(response.headers, EXPIRED);
      return response;
    }
  } else {
    setCacheStatus(response.headers, HIT);
    return response;
  }
}

async function putCache(
  request: Request,
  response: Response,
  options: {
    customCacheStorage: CustomCacheStorage;
    customCacheKey: string;
  }
) {
  const policy = new CachePolicy(request, response);
  const ttl = policy.timeToLive();

  if (!policy.storable() || ttl <= 0) {
    return false;
  }

  const cacheItem: CacheItem = {
    policy: policy.toObject(),
    response: {
      body: await response.clone().text(),
      status: response.status,
      statusText: response.statusText,
    },
  };

  await setCacheItem(
    options.customCacheStorage,
    options.customCacheKey,
    cacheItem,
    ttl,
    request,
    response
  );

  return true;
}

async function getCacheItem(
  request: Request,
  customCacheStorage: CustomCacheStorage,
  customCacheKey: string
): Promise<CacheItem> {
  const varyFilterOptions: FilterOptions | undefined =
    await customCacheStorage.get(getVaryCacheKey(customCacheKey));
  const varyPart = varyFilterOptions
    ? await getVary(request, varyFilterOptions)
    : undefined;
  const cacheItem: CacheItem = await customCacheStorage.get(
    varyPart ? `${customCacheKey}:${varyPart}` : customCacheKey
  );
  return cacheItem;
}

async function setCacheItem(
  customCacheStorage: CustomCacheStorage,
  customCacheKey: string,
  cacheItem: CacheItem,
  ttl: number,
  request: Request,
  response: Response
): Promise<void> {
  const vary = response.headers.get('vary');
  if (vary) {
    const varyFilterOptions: FilterOptions =
      vary === '*'
        ? true
        : { include: vary.split(',').map((field) => field.trim()) };
    const varyPart = await getVary(request, varyFilterOptions);
    await customCacheStorage.set(
      `${customCacheKey}:${varyPart}`,
      cacheItem,
      ttl
    );
    await customCacheStorage.set(
      getVaryCacheKey(customCacheKey),
      varyFilterOptions,
      ttl
    );
  } else {
    await customCacheStorage.set(customCacheKey, cacheItem, ttl);
  }
}

async function revalidateCache(
  request: Request,
  resolveCacheItem: CacheItemResolved,
  options: {
    refetch: Refetch;
    customCacheStorage: CustomCacheStorage;
    customCacheKey: string;
  }
): Promise<Response> {
  const revalidationRequest = new Request(request, {
    headers: resolveCacheItem.policy.revalidationHeaders(request),
  });
  let revalidationResponse: Response;

  try {
    revalidationResponse = await options.refetch(revalidationRequest);
  } catch (error) {
    if (resolveCacheItem.policy.useStaleIfError()) {
      return resolveCacheItem.response;
    } else {
      throw error;
    }
  }

  const { modified, policy: revalidatedPolicy } =
    resolveCacheItem.policy.revalidatedPolicy(
      revalidationRequest,
      revalidationResponse
    );
  const response = modified ? revalidationResponse : resolveCacheItem.response;

  await putCache(request, response, options);

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
/* istanbul ignore next */
function formatETag(entityId: string | null, validatorType: string = 'strong') {
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
}

function getVaryCacheKey(cacheKey: string) {
  return `VARY:${cacheKey}`;
}

export { createCacheKeyGenerator };
