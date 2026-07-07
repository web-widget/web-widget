import { afterEach, beforeEach, jest } from '@jest/globals';
import { LRUCache } from 'lru-cache';
import type { Manifest } from '@web-widget/web-router';
import WebRouter from '@web-widget/web-router';
import type { KVStorage, CacheStatus } from '@web-widget/shared-cache';
import { CacheStorage } from '@web-widget/shared-cache';
import conditional from './conditional-get';
import type { CacheOptions } from './cache';
import cache from './cache';

const HIT: CacheStatus = 'HIT';
const MISS: CacheStatus = 'MISS';
const EXPIRED: CacheStatus = 'EXPIRED';
const BYPASS: CacheStatus = 'BYPASS';
const UPDATING: CacheStatus = 'UPDATING';
const DYNAMIC: CacheStatus = 'DYNAMIC';
const TEST_URL = 'http://localhost/';

const timeout = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const createLRUCache = (): KVStorage => {
  const store = new LRUCache<string, any>({ max: 1024 });

  return {
    async get(cacheKey: string) {
      return store.get(cacheKey);
    },
    async set(cacheKey: string, value: any, ttl?: number) {
      store.set(cacheKey, value, { ttl });
    },
    async delete(cacheKey: string) {
      return store.delete(cacheKey);
    },
  };
};

const createCaches = () => {
  return new CacheStorage(createLRUCache());
};

const createApp = function (
  caches: CacheStorage,
  opts: Partial<CacheOptions> = {},
  routes: Manifest['routes'] = [
    {
      pathname: '*',
      module: {
        handler: async () => {
          return new Response('lol');
        },
      },
    },
  ]
) {
  const app = WebRouter.fromManifest({
    routes: routes,
    middlewares: [
      {
        pathname: '*',
        module: {
          handler: cache({
            cacheControl: { maxAge: 10 },
            caches,
            ...opts,
          }),
        },
      },
    ],
  });

  return app;
};

describe('cache control should be added', () => {
  test('should support `object` type configuration', async () => {
    const app = createApp(createCaches(), {
      cacheControl: {
        maxAge: 2,
        sharedMaxAge: 3,
        staleIfError: 4,
        staleWhileRevalidate: 5,
      },
    });
    const req = new Request(TEST_URL);
    const res = await app.dispatch(req);

    expect(res.headers.get('cache-control')).toBe(
      'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5'
    );
  });

  test('should support `string` type configuration', async () => {
    const app = createApp(createCaches(), {
      cacheControl:
        'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5',
    });
    const req = new Request(TEST_URL);
    const res = await app.dispatch(req);

    expect(res.headers.get('cache-control')).toBe(
      'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5'
    );
  });

  test('do not set HTTP headers when status code is greater than or equal to 500', async () => {
    const app = createApp(
      createCaches(),
      {
        cacheControl:
          'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5',
      },
      [
        {
          pathname: '*',
          module: {
            handler: async () => {
              return new Response(null, {
                status: 500,
              });
            },
          },
        },
      ]
    );
    const req = new Request(TEST_URL);
    const res = await app.dispatch(req);

    expect(res.headers.get('cache-control')).toBe(null);
  });
});

describe('vary should be added', () => {
  test('should support `array[]` type configuration', async () => {
    const app = createApp(createCaches(), {
      vary: ['accept-language'],
    });
    const req = new Request(TEST_URL);
    const res = await app.dispatch(req);

    expect(res.headers.get('vary')).toBe('accept-language');
  });

  test('should support `string` type configuration', async () => {
    const app = createApp(createCaches(), {
      vary: 'accept-language',
    });
    const req = new Request(TEST_URL);
    const res = await app.dispatch(req);

    expect(res.headers.get('vary')).toBe('accept-language');
  });

  test('do not set HTTP headers when status code is greater than or equal to 500', async () => {
    const app = createApp(
      createCaches(),
      {
        vary: 'accept-language',
      },
      [
        {
          pathname: '*',
          module: {
            handler: async () => {
              return new Response(null, {
                status: 500,
              });
            },
          },
        },
      ]
    );
    const req = new Request(TEST_URL);
    const res = await app.dispatch(req);

    expect(res.headers.get('vary')).toBe(null);
  });
});

describe('debug cache key header', () => {
  test('should not expose cache key by default', async () => {
    const app = createApp(createCaches());
    const res = await app.dispatch(TEST_URL);

    expect(res.headers.get('x-cache-key')).toBe(null);
  });

  test('should expose cache key when debugCacheKey is enabled', async () => {
    const app = createApp(createCaches(), {
      debugCacheKey: true,
    });
    const res = await app.dispatch(TEST_URL);

    expect(res.headers.get('x-cache-key')).toBe('http://localhost/');
  });

  test('should apply vary to debug cache key', async () => {
    const app = createApp(createCaches(), {
      debugCacheKey: true,
      vary: 'accept-language',
    });
    const res = await app.dispatch(TEST_URL, {
      headers: {
        'accept-language': 'en-US',
      },
    });

    expect(res.headers.get('x-cache-key')).toMatch(
      /^http:\/\/localhost\/\|v\|accept-language@[a-f0-9]+$/
    );
  });
});

test('disabling caching middleware should be allowed', async () => {
  const app = createApp(createCaches(), {}, [
    {
      pathname: '*',
      module: {
        config: {
          cache: false,
        },
        handler: async () => {
          return new Response('lol');
        },
      },
    },
  ]);
  const res = await app.dispatch(TEST_URL);

  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(BYPASS);
});

test('caching should be allowed to be dynamic', async () => {
  const app = createApp(createCaches(), {}, [
    {
      pathname: '*',
      module: {
        config: {
          cache: {
            cacheControl: null,
          },
        },
        handler: async () => {
          return new Response('lol');
        },
      },
    },
  ]);
  const res = await app.dispatch(TEST_URL);

  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(DYNAMIC);
});

describe('request cache control directives', () => {
  test('when a request contains a cache control header it should be ignored', async () => {
    const caches = createCaches();
    const app = createApp(caches, {
      cacheControl: { maxAge: 300 },
    });
    let res = await app.dispatch(TEST_URL, {
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(MISS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('max-age=300');
    expect(await res.text()).toBe('lol');

    res = await app.dispatch(TEST_URL, {
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(HIT);
    expect(res.headers.get('age')).toBe('0');
    expect(res.headers.get('cache-control')).toBe('max-age=300');
    expect(await res.text()).toBe('lol');
  });

  test('ability to respect request cache controls through configuration', async () => {
    const caches = createCaches();
    const app = createApp(caches, {
      cacheControl: { maxAge: 300 },
      ignoreRequestCacheControl: false,
    });
    let res = await app.dispatch(TEST_URL, {
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(MISS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('max-age=300');
    expect(await res.text()).toBe('lol');

    res = await app.dispatch(TEST_URL, {
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(EXPIRED);
    expect(res.headers.get('age')).toBe('0');
    expect(res.headers.get('cache-control')).toBe('max-age=300');
    expect(await res.text()).toBe('lol');
  });
});

test('`age` should change based on cache time', async () => {
  const caches = createCaches();
  const app = createApp(caches, {
    cacheControl: { maxAge: 2 },
  });
  let res = await app.dispatch(TEST_URL);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe(null);

  res = await app.dispatch(TEST_URL);
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe('0');

  await timeout(1000);
  res = await app.dispatch(TEST_URL);
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe('1');

  await timeout(1000);
  res = await app.dispatch(TEST_URL);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe(null);

  await timeout(1000);
  res = await app.dispatch(TEST_URL);
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe('1');
});

test('it should be possible to terminate cache revalidate', async () => {
  let view = 0;
  const caches = createCaches();
  const app = WebRouter.fromManifest({
    routes: [
      {
        pathname: '*',
        module: {
          handler: async (ctx) => {
            if (ctx.request.headers.has('x-test-timeout')) {
              const value = Number(
                ctx.request.headers.get('x-test-timeout') || 0
              );
              await timeout(value);
            }
            return new Response(`View: ${view++}`);
          },
        },
      },
    ],
    middlewares: [
      {
        pathname: '*',
        module: {
          handler: cache({
            cacheControl: {
              sharedMaxAge: 1,
              staleIfError: 5,
              staleWhileRevalidate: 5,
            },
            caches,
            signal() {
              return AbortSignal.timeout(500);
            },
          }),
        },
      },
    ],
  });
  let res = await app.dispatch(TEST_URL);
  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(await res.text()).toBe('View: 0');

  await timeout(1024);

  res = await app.dispatch(TEST_URL, {
    headers: {
      'x-test-timeout': '1000',
    },
  });
  expect(res.status).toBe(200);
  // NOTE: With stale-while-revalidate enabled, the foreground response is served
  // immediately as UPDATING while revalidation runs in the background.
  expect(res.headers.get('x-cache-status')).toBe(UPDATING);
  expect(await res.text()).toBe('View: 0');
});

test('waitUntil revalidate keeps context.meta during stale-while-revalidate', async () => {
  let generation = 0;
  let revalidateMetaAvailable: boolean | undefined;
  const caches = createCaches();
  const app = WebRouter.fromManifest({
    routes: [
      {
        pathname: '*',
        module: {
          render: () => 'Page',
          handler: {
            GET(context) {
              const hadMeta = context.meta != null;
              // Same failure mode as mergeMeta(context.meta, …) when meta is cleared.
              Object.entries(context.meta!);
              if (generation > 0) {
                revalidateMetaAvailable = hadMeta;
              }
              return new Response(`Gen ${generation++}`);
            },
          },
        },
      },
    ],
    middlewares: [
      {
        pathname: '*',
        module: {
          handler: cache({
            cacheControl: {
              sharedMaxAge: 1,
              staleWhileRevalidate: 5,
            },
            caches,
          }),
        },
      },
    ],
  });

  const waitUntilTasks: Promise<unknown>[] = [];
  const executionContext = {
    waitUntil: (promise: Promise<unknown>) => {
      waitUntilTasks.push(promise);
    },
    passThroughOnException: () => {},
  };

  let res = await app.dispatch(
    TEST_URL,
    undefined,
    undefined,
    executionContext
  );
  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(await res.text()).toBe('Gen 0');
  expect(revalidateMetaAvailable).toBeUndefined();

  await timeout(1024);

  res = await app.dispatch(TEST_URL, undefined, undefined, executionContext);
  expect(res.status).toBe(200);
  // NOTE: Foreground stale-while-revalidate serves cached content as UPDATING.
  expect(res.headers.get('x-cache-status')).toBe(UPDATING);
  expect(await res.text()).toBe('Gen 0');

  await Promise.allSettled(waitUntilTasks);
  expect(revalidateMetaAvailable).toBe(true);
  expect(generation).toBe(2);
});

describe('cache middleware error boundaries', () => {
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('async route that throws yields a 500-style error response', async () => {
    const app = createApp(createCaches(), { cacheControl: { maxAge: 10 } }, [
      {
        pathname: '*',
        module: {
          handler: async () => {
            throw new Error('async route error');
          },
        },
      },
    ]);
    const res = await app.dispatch(TEST_URL);

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toMatch(/async route error|Internal Server Error|Error/i);
  });

  test('async route that returns a rejected promise yields a 500-style error response', async () => {
    const app = createApp(createCaches(), { cacheControl: { maxAge: 10 } }, [
      {
        pathname: '*',
        module: {
          handler: async () => {
            return Promise.reject(new Error('rejected route promise'));
          },
        },
      },
    ]);
    const res = await app.dispatch(TEST_URL);

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toMatch(/rejected route promise|Internal Server Error|Error/i);
  });

  test('sync route that throws yields a 500-style error response', async () => {
    const app = createApp(createCaches(), { cacheControl: { maxAge: 10 } }, [
      {
        pathname: '*',
        module: {
          handler: () => {
            throw new Error('sync route error');
          },
        },
      },
    ]);
    const res = await app.dispatch(TEST_URL);

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toMatch(/sync route error|Internal Server Error|Error/i);
  });

  test('when route throws, error propagates through framework error handling', async () => {
    const app = createApp(createCaches(), { cacheControl: { maxAge: 10 } }, [
      {
        pathname: '*',
        module: {
          handler: async () => {
            throw new Error('original route error');
          },
        },
      },
    ]);
    const res = await app.dispatch(TEST_URL);

    expect(res.status).toBe(500);
    // NOTE: Miss-phase throws now reach Web Router fallback instead of being
    // converted to synthetic JSON error responses inside the cache middleware.
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  test('when reading error fields throws, error handling falls back to plain text', async () => {
    const app = createApp(createCaches(), { cacheControl: { maxAge: 10 } }, [
      {
        pathname: '*',
        module: {
          handler: async () => {
            throw Object.defineProperties(new Error('base'), {
              status: {
                enumerable: true,
                get() {
                  throw new Error('status accessor throws');
                },
              },
            });
          },
        },
      },
    ]);
    const res = await app.dispatch(TEST_URL);

    expect(res.status).toBe(500);
    expect(res.headers.get('content-type')).toContain('text/plain');
  });

  test('rejection after fulfillment runs the outer catch and still resolves to an error response', async () => {
    const app = createApp(createCaches(), { cacheControl: { maxAge: 10 } }, [
      {
        pathname: '*',
        module: {
          handler: () =>
            Promise.resolve(new Response('ok', { status: 200 })).then(() => {
              throw new Error('throw after fulfill');
            }),
        },
      },
    ]);
    const res = await app.dispatch(TEST_URL);

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toMatch(/throw after fulfill|Internal Server Error|Error/i);
  });
});

describe('conditional-get middleware', () => {
  test('when the response is fresh it should return a 304 and cache the response', async () => {
    const caches = createCaches();
    const date = Math.round(Date.now() / 1000);

    const app = WebRouter.fromManifest({
      routes: [
        {
          pathname: '*',
          module: {
            handler: async () => {
              return new Response('lol', {
                headers: {
                  etag: '"v1"',
                  'content-type': 'text/lol; charset=utf-8',
                  'last-modified': new Date(date * 1000).toUTCString(),
                },
              });
            },
            config: {
              cache: {
                cacheControl: { maxAge: 1 },
              },
            },
          },
        },
      ],
      middlewares: [
        {
          pathname: '*',
          module: {
            handler: conditional(),
          },
        },
        {
          pathname: '*',
          module: {
            handler: cache({
              cacheControl: { maxAge: 10 },
              caches,
            }),
          },
        },
      ],
    });

    let req = new Request(TEST_URL);
    let res = await app.dispatch(req);
    const c = await caches.open('default');
    const cacheItem = await c.match(req);
    expect(await res.text()).toBe('lol');
    expect(res.status).toBe(200);
    expect(cacheItem).toBeTruthy();
    expect(await cacheItem?.text()).toBe('lol');
    expect(cacheItem?.headers.get('etag')).toBe('"v1"');
    expect(cacheItem?.headers.get('content-type')).toBe(
      'text/lol; charset=utf-8'
    );
    expect(cacheItem?.headers.get('last-modified')).toBe(
      new Date(date * 1000).toUTCString()
    );

    req = new Request(TEST_URL, {
      headers: {
        'if-none-match': '"v1"',
      },
    });
    res = await app.dispatch(req);
    expect(res.status).toBe(304);

    req = new Request(TEST_URL);
    res = await app.dispatch(req);
    expect(await res.text()).toBe('lol');
    expect(res.status).toBe(200);
  });
});

describe('non-cacheable (no-store) responses', () => {
  test('should bypass cache and not buffer the body', async () => {
    const caches = createCaches();
    const app = createApp(caches, { cacheControl: { maxAge: 10 } }, [
      {
        pathname: '*',
        module: {
          handler: async () => {
            return new Response('streamed', {
              headers: { 'cache-control': 'no-store' },
            });
          },
        },
      },
    ]);

    const res1 = await app.dispatch(TEST_URL);
    expect(res1.status).toBe(200);
    expect(res1.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res1.headers.get('cache-control')).toBe('no-store');
    expect(await res1.text()).toBe('streamed');

    // no-store responses are never cached — second request also bypasses.
    const res2 = await app.dispatch(TEST_URL);
    expect(res2.headers.get('x-cache-status')).toBe(BYPASS);
    expect(await res2.text()).toBe('streamed');

    // Nothing should have been written to the cache store.
    const cache = await caches.open('default');
    const cached = await cache.match(new Request(TEST_URL));
    expect(cached).toBeUndefined();
  });

  test('cacheable responses should still be cached normally', async () => {
    const caches = createCaches();
    const app = createApp(caches, { cacheControl: { maxAge: 10 } }, [
      {
        pathname: '*',
        module: {
          handler: async () => new Response('buffered'),
        },
      },
    ]);

    const res1 = await app.dispatch(TEST_URL);
    expect(res1.headers.get('x-cache-status')).toBe(MISS);
    expect(await res1.text()).toBe('buffered');

    const res2 = await app.dispatch(TEST_URL);
    expect(res2.headers.get('x-cache-status')).toBe(HIT);
    expect(await res2.text()).toBe('buffered');
  });
});
