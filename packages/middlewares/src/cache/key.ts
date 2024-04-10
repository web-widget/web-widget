import { sha1 } from '@web-widget/helpers/crypto';
import {
  deviceType as getDeviceType,
  RequestCookies,
} from '@web-widget/helpers/headers';

export type FilterOptions = {
  include?: string[];
  exclude?: string[];
  checkPresence?: string[];
};

export type KeyRules = {
  /** Use cookie as part of cache key. */
  cookie?: FilterOptions | boolean;
  /** Use device type as part of cache key. */
  device?: FilterOptions | boolean;
  /** Use header as part of cache key. */
  header?: FilterOptions | boolean;
  /** Use host as part of cache key. */
  host?: FilterOptions | boolean;
  /** Use method as part of cache key. */
  method?: FilterOptions | boolean;
  /** Use pathname as part of cache key. */
  pathname?: FilterOptions | boolean;
  /** Use search as part of cache key. */
  search?: FilterOptions | boolean;
  /** Use vary as part of cache key. */
  very?: FilterOptions | boolean;
  /** Use custom variables as part of cache key. */
  [customKey: string]: FilterOptions | boolean | undefined;
};

export type PartDefiner = (
  req: Request,
  options?: FilterOptions
) => Promise<string>;
type BuiltInExpandedPartDefiner = (
  req: Request,
  options?: FilterOptions,
  very?: string[]
) => Promise<string>;

export type PartDefiners = {
  [customKey: string]: PartDefiner | undefined;
};

export type BuiltInExpandedPartDefiners = {
  [customKey: string]: BuiltInExpandedPartDefiner | undefined;
};

export async function shortHash(data: Parameters<typeof sha1>[0]) {
  return (await sha1(data))?.slice(0, 6);
}

export function filter(
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

export async function very(
  request: Request,
  options?: FilterOptions,
  vary?: string[]
) {
  if (!vary?.length) {
    return '';
  }
  const include = vary;
  const entries = Array.from(request.headers.entries()).filter(([key]) =>
    include.includes(key)
  );
  return (
    await Promise.all(
      sort(filter(entries, options)).map(async ([key, value]) =>
        value ? `${key}=${await shortHash(value)}` : key
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
  // Headers that are covered by other Cache Key features
  'cookie',
  'host',
  'vary',
  // Headers that cache middleware status
  'x-cached-response',
];

export async function header(
  request: Request,
  options?: FilterOptions,
  very?: string[]
) {
  const entries = Array.from(request.headers.entries());
  return (
    await Promise.all(
      sort(filter(entries, options)).map(async ([key, value]) => {
        if (CANNOT_INCLUDE_HEADERS.includes(key)) {
          throw new TypeError(`Cannot include header: ${key}`);
        }
        if (very?.includes(key)) {
          throw new TypeError(
            `Cannot include header: ${key}. Use \`very: { include: [${JSON.stringify(key)}] }\` instead.`
          );
        }
        return value ? `${key}=${await shortHash(value)}` : key;
      })
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

const BUILT_IN_EXPANDED_PART_DEFINERS: BuiltInExpandedPartDefiners = {
  cookie,
  device,
  header,
  method,
  very,
};

export function createKeyGenerator(
  keyRules: KeyRules,
  parts?: PartDefiners,
  vary?: string[]
) {
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
            return expandedPartDefiners(
              request,
              toOptions(keyRules[name]),
              vary
            );
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
