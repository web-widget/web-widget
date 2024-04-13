import { sha1 } from '@web-widget/helpers/crypto';
import {
  deviceType as getDeviceType,
  RequestCookies,
} from '@web-widget/helpers/headers';

export type FilterOptions =
  | {
      include?: string[];
      exclude?: string[];
      checkPresence?: string[];
    }
  | boolean;

export type CacheKeyRules = {
  /** Use cookie as part of cache key. */
  cookie?: FilterOptions;
  /** Use device type as part of cache key. */
  device?: FilterOptions;
  /** Use header as part of cache key. */
  header?: FilterOptions;
  /** Use host as part of cache key. */
  host?: FilterOptions;
  /** Use method as part of cache key. */
  method?: FilterOptions;
  /** Use pathname as part of cache key. */
  pathname?: FilterOptions;
  /** Use search as part of cache key. */
  search?: FilterOptions;
  /** Use custom part of cache key. */
  [customPart: string]: FilterOptions | undefined;
};

export type PartDefiner = (
  request: Request,
  options?: FilterOptions
) => Promise<string>;

export type BuiltInExpandedPartDefiner = (
  request: Request,
  options?: FilterOptions
) => Promise<string>;

export type CacheKeyPartDefiners = {
  [customPart: string]: PartDefiner | undefined;
};

export type BuiltInExpandedCacheKeyPartDefiners = {
  [customPart: string]: BuiltInExpandedPartDefiner | undefined;
};

export async function shortHash(data: Parameters<typeof sha1>[0]) {
  return (await sha1(data))?.slice(0, 6);
}

export function filter(
  array: [key: string, value: string][],
  options?: FilterOptions | boolean
) {
  if (typeof options === 'boolean') {
    return options ? array : [];
  }

  let result = array;
  const exclude = options?.exclude;
  const include = options?.include;
  const checkPresence = options?.checkPresence;

  if (exclude?.length) {
    result = result.filter(([key]) => !exclude.includes(key));
  }

  if (include?.length) {
    result = result.filter(([key]) => include.includes(key));
  }

  if (checkPresence?.length) {
    result = result.map((item) =>
      checkPresence.includes(item[0]) ? [item[0], ''] : item
    );
  }

  return result;
}

function sort(array: [key: string, value: string][]) {
  return array.sort((a, b) => a[0].localeCompare(b[0]));
}

export async function cookie(request: Request, options?: FilterOptions) {
  const cookie = new RequestCookies(request.headers);
  const entries: [string, string][] = cookie
    .getAll()
    .map(({ name, value }) => [name, value]);

  return (
    await Promise.all(
      sort(filter(entries, options)).map(async ([key, value]) =>
        value ? `${key}=${await shortHash(value)}` : key
      )
    )
  ).join('&');
}

export async function device(request: Request, options?: FilterOptions) {
  const device = getDeviceType(request.headers);
  return filter([[device, '']], options)
    .map(([key]) => key)
    .join('');
}

export function host(url: URL, options?: FilterOptions) {
  const host = url.host;
  return filter([[host, '']], options)
    .map(([key]) => key)
    .join('');
}

export async function method(request: Request, options?: FilterOptions) {
  const hasBody =
    request.body && ['POST', 'PATCH', 'PUT'].includes(request.method);
  return (
    await Promise.all(
      filter([[request.method, '']], options).map(async ([key]) =>
        hasBody ? `${key}=${await shortHash(request.body)}` : key
      )
    )
  ).join('');
}

export function pathname(url: URL, options?: FilterOptions) {
  const pathname = url.pathname;
  return filter([[pathname, '']], options)
    .map(([key]) => key)
    .join('');
}

export function search(url: URL, options?: FilterOptions) {
  const { searchParams } = url;
  searchParams.sort();

  const entries = Array.from(searchParams.entries());
  const search = filter(entries, options)
    .map(([key, value]) => {
      return value ? `${key}=${value}` : key;
    })
    .join('&');
  return search ? `?${search}` : '';
}

export async function vary(request: Request, options?: FilterOptions) {
  const entries = Array.from(request.headers.entries());
  return (
    await Promise.all(
      sort(filter(entries, options)).map(
        async ([key, value]) => `${key}=${await shortHash(value)}`
      )
    )
  ).join('&');
}

export const CANNOT_INCLUDE_HEADERS = [
  // Headers that have high cardinality and risk sharding the cache
  'accept',
  'accept-charset',
  'accept-encoding',
  'accept-datetime',
  'accept-language',
  'referer',
  'user-agent',
  // Headers that re-implement cache or proxy features
  'connection',
  'content-length',
  'cache-control',
  'if-match',
  'if-modified-since',
  'if-none-match',
  'if-unmodified-since',
  'range',
  'upgrade',
  // Headers that are covered by other cache Key features
  'cookie',
  'host',
  'vary',
  // Headers that cache middleware status
  'x-cache-status',
];

export async function header(request: Request, options?: FilterOptions) {
  const entries = Array.from(request.headers.entries());
  return (
    await Promise.all(
      sort(filter(entries, options)).map(async ([key, value]) => {
        if (CANNOT_INCLUDE_HEADERS.includes(key)) {
          throw new TypeError(`Cannot include header: ${key}`);
        }
        return value ? `${key}=${await shortHash(value)}` : key;
      })
    )
  ).join('&');
}

const BUILT_IN_URL_PART_DEFINERS: {
  [key: string]: (url: URL, options?: FilterOptions) => string;
} = {
  host,
  pathname,
  search,
};

const BUILT_IN_EXPANDED_PART_DEFINERS: BuiltInExpandedCacheKeyPartDefiners = {
  cookie,
  device,
  header,
  method,
};

export function createCacheKeyGenerator(
  keyRules: CacheKeyRules,
  cacheKeyPartDefiners?: CacheKeyPartDefiners
) {
  const { host, pathname, search, ...fragmentRules } = keyRules;
  const urlRules: CacheKeyRules = { host, pathname, search };

  return async function cacheKeyDefiner(request: Request): Promise<string> {
    const url = new URL(request.url);
    const urlPart: string[] = ['host', 'pathname', 'search']
      .filter((name) => urlRules[name])
      .map((name) => {
        const urlPartDefiner = BUILT_IN_URL_PART_DEFINERS[name];
        return urlPartDefiner(url, keyRules[name]);
      });

    const fragmentPart: string[] = await Promise.all(
      Object.keys(fragmentRules)
        .sort()
        .map((name) => {
          const expandedCacheKeyPartDefiners =
            BUILT_IN_EXPANDED_PART_DEFINERS[name] ??
            cacheKeyPartDefiners?.[name];

          if (expandedCacheKeyPartDefiners) {
            return expandedCacheKeyPartDefiners(request, keyRules[name]);
          }

          throw TypeError(`Unknown custom part: "${name}".`);
        })
    );

    return fragmentPart.length
      ? `${urlPart.join('')}#${fragmentPart.join(':')}`
      : urlPart.join('');
  };
}
