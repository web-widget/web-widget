import { LRUCache } from 'lru-cache';
import type { Manifest } from '@web-widget/web-router';
import WebRouter from '@web-widget/web-router';
import type { CacheStatus, KVStorage } from '@web-widget/shared-cache';
import { CacheStorage } from '@web-widget/shared-cache';
import conditional from '../conditional-get';
import type { CacheOptions } from '.';
import cache from './';

export const HIT: CacheStatus = 'HIT';
export const MISS: CacheStatus = 'MISS';
export const EXPIRED: CacheStatus = 'EXPIRED';
export const STALE: CacheStatus = 'STALE';
export const BYPASS: CacheStatus = 'BYPASS';
export const REVALIDATED: CacheStatus = 'REVALIDATED';
export const DYNAMIC: CacheStatus = 'DYNAMIC';

const TEST_URL = 'http://localhost/';

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

const timeout = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
          handler: conditional(),
        },
      },
      {
        pathname: '*',
        module: {
          handler: cache({
            cacheControl() {
              return { maxAge: 10 };
            },
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
      cacheControl() {
        return {
          maxAge: 2,
          sharedMaxAge: 3,
          staleIfError: 4,
          staleWhileRevalidate: 5,
        };
      },
    });
    const req = new Request(TEST_URL);
    const res = await app.request(req);

    expect(res.headers.get('cache-control')).toBe(
      'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5'
    );
  });

  test('should support `string` type configuration', async () => {
    const app = createApp(createCaches(), {
      cacheControl() {
        return 'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5';
      },
    });
    const req = new Request(TEST_URL);
    const res = await app.request(req);

    expect(res.headers.get('cache-control')).toBe(
      'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5'
    );
  });

  test('do not set HTTP headers when status code is greater than or equal to 500', async () => {
    const app = createApp(
      createCaches(),
      {
        cacheControl() {
          return 'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5';
        },
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
    const res = await app.request(req);

    expect(res.headers.get('cache-control')).toBe(null);
  });
});

describe('vary should be added', () => {
  test('should support `array[]` type configuration', async () => {
    const app = createApp(createCaches(), {
      vary() {
        return ['accept-language'];
      },
    });
    const req = new Request(TEST_URL);
    const res = await app.request(req);

    expect(res.headers.get('vary')).toBe('accept-language');
  });

  test('should support `string` type configuration', async () => {
    const app = createApp(createCaches(), {
      vary() {
        return 'accept-language';
      },
    });
    const req = new Request(TEST_URL);
    const res = await app.request(req);

    expect(res.headers.get('vary')).toBe('accept-language');
  });

  test('do not set HTTP headers when status code is greater than or equal to 500', async () => {
    const app = createApp(
      createCaches(),
      {
        vary() {
          return 'accept-language';
        },
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
    const res = await app.request(req);

    expect(res.headers.get('vary')).toBe(null);
  });
});

test('disabling caching middleware should be allowed', async () => {
  let set = false;

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
  const res = await app.request(TEST_URL);

  expect(set).toBe(false);
  expect(res.status).toBe(200);
});

test('when no cache control is set the latest content should be loaded', async () => {
  const caches = createCaches();
  const app = createApp(caches, {
    cacheControl() {
      return '';
    },
  });
  const req = new Request(TEST_URL);
  const res = await app.request(req);
  const cache = await caches.open('default');
  const cacheItem = await cache.match(req);

  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(DYNAMIC);
  expect(res.headers.get('age')).toBe(null);
  expect(res.headers.get('cache-control')).toBe(null);
  expect(cacheItem).toBeUndefined();
  expect(await res.text()).toBe('lol');
});

test('when a request contains a cache control header it should be ignored', async () => {
  const caches = createCaches();
  const app = createApp(caches, {
    cacheControl() {
      return { maxAge: 300 };
    },
  });
  let res = await app.request(TEST_URL, {
    headers: {
      'cache-control': 'no-cache',
    },
  });

  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('age')).toBe(null);
  expect(res.headers.get('cache-control')).toBe('max-age=300');
  expect(await res.text()).toBe('lol');

  res = await app.request(TEST_URL, {
    headers: {
      'cache-control': 'no-cache',
    },
  });

  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('age')).toBe('0');
  expect(res.headers.get('cache-control')).toBe('max-age=300');
  expect(await res.text()).toBe('lol');
});

test('when body is a string it should cache the response', async () => {
  const caches = createCaches();
  const app = createApp(caches);
  const req = new Request(TEST_URL);
  const res = await app.request(req);
  const cache = await caches.open('default');
  const cacheItem = await cache.match(req);

  expect(res.status).toBe(200);
  expect(await cacheItem?.text()).toBe('lol');
});

describe('when the `vary` header is present, different versions should be cached', () => {
  test('multiple versions should be cached', async () => {
    const caches = createCaches();
    const app = createApp(
      caches,
      {
        vary() {
          return 'accept-language';
        },
      },
      [
        {
          pathname: '*',
          module: {
            handler: async (ctx) => {
              return new Response(ctx.request.headers.get('accept-language'));
            },
          },
        },
      ]
    );
    let req = new Request(TEST_URL, {
      headers: {
        'accept-language': 'en-us',
      },
    });
    let res = await app.request(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(MISS);
    expect(res.headers.get('vary')).toBe('accept-language');
    expect(await res.text()).toBe('en-us');

    res = await app.request(req);
    expect(res.headers.get('x-cache-status')).toBe(HIT);

    req = new Request(TEST_URL, {
      headers: {
        'accept-language': 'tr-tr',
      },
    });
    res = await app.request(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(MISS);
    expect(res.headers.get('vary')).toBe('accept-language');
    expect(await res.text()).toBe('tr-tr');

    res = await app.request(req);
    expect(res.headers.get('x-cache-status')).toBe(HIT);

    req = new Request(TEST_URL, {
      headers: {
        'accept-language': 'en-us',
      },
    });
    res = await app.request(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(HIT);
    expect(res.headers.get('vary')).toBe('accept-language');
    expect(await res.text()).toBe('en-us');
  });

  test('case should be ignored', async () => {
    const caches = createCaches();
    const app = createApp(
      caches,
      {
        vary() {
          return 'Accept-Language';
        },
      },
      [
        {
          pathname: '*',
          module: {
            handler: async (ctx) => {
              return new Response(ctx.request.headers.get('accept-language'));
            },
          },
        },
      ]
    );
    let req = new Request(TEST_URL, {
      headers: {
        'accept-language': 'en-us',
      },
    });
    let res = await app.request(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(MISS);
    expect(res.headers.get('vary')).toBe('Accept-Language');
    expect(await res.text()).toBe('en-us');

    res = await app.request(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(HIT);
    expect(res.headers.get('vary')).toBe('Accept-Language');
    expect(await res.text()).toBe('en-us');
  });
});

test('when the response code is not 200 it should not cache the response', async () => {
  const caches = createCaches();
  const app = createApp(caches, {}, [
    {
      pathname: '*',
      module: {
        handler: async () => {
          return new Response('lol', { status: 201 });
        },
      },
    },
  ]);
  const res = await app.request(TEST_URL, {
    method: 'POST',
  });
  const cache = await caches.open('default');
  const cacheItem = await cache.match(TEST_URL);

  expect(res.status).toBe(201);
  expect(await res.text()).toBe('lol');
  expect(cacheItem).toBeUndefined();
});

test('when etag and last-modified headers are set it should cache those values', async () => {
  const caches = createCaches();
  const date = Math.round(Date.now() / 1000);
  const app = createApp(caches, {}, [
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
            cacheControl() {
              return { maxAge: 1 };
            },
          },
        },
      },
    },
  ]);
  const req = new Request(TEST_URL);
  const res = await app.request(req);
  const cache = await caches.open('default');
  const cacheItem = await cache.match(req);

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
});

test('`s-maxage` should be used first as cache expiration time', async () => {
  const caches = createCaches();
  const app = createApp(caches, {
    cacheControl() {
      return {
        maxAge: 3,
        sharedMaxAge: 1,
      };
    },
  });
  const req = new Request(TEST_URL);
  let res = await app.request(req);
  const cache = await caches.open('default');
  let cacheItem = await cache.match(req);

  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('cache-control')).toBe('max-age=3, s-maxage=1');
  expect(res.headers.get('age')).toBe(null);
  expect(await cacheItem?.text()).toBe('lol');

  res = await app.request(req);
  cacheItem = await cache.match(req);
  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=3, s-maxage=1');
  expect(res.headers.get('age')).toBe('0');
  expect(await cacheItem?.text()).toBe('lol');

  await timeout(1000);

  res = await app.request(req);
  cacheItem = await cache.match(req);
  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('cache-control')).toBe('max-age=3, s-maxage=1');
  expect(res.headers.get('age')).toBe(null);
  expect(await cacheItem?.text()).toBe('lol');
});

test('`age` should change based on cache time', async () => {
  const caches = createCaches();
  const app = createApp(caches, {
    cacheControl() {
      return {
        maxAge: 2,
      };
    },
  });
  let res = await app.request(TEST_URL);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe(null);

  res = await app.request(TEST_URL);
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe('0');

  await timeout(1000);
  res = await app.request(TEST_URL);
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe('1');

  await timeout(1000);
  res = await app.request(TEST_URL);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe(null);

  await timeout(1000);
  res = await app.request(TEST_URL);
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe('1');
});

describe('caching should be allowed to be bypassed', () => {
  test('it should be possible to disable caching middleware', async () => {
    const caches = createCaches();
    const app = createApp(
      caches,
      {
        cacheControl() {
          return {
            maxAge: 2,
          };
        },
      },
      [
        {
          pathname: '*',
          module: {
            handler: async () => {
              return new Response(`Hello`);
            },
            config: {
              cache: false,
            },
          },
        },
      ]
    );
    let res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe(null);

    res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe(null);
  });

  test('`private` should bypass caching', async () => {
    const caches = createCaches();
    const app = createApp(caches, {
      cacheControl() {
        return {
          public: false,
        };
      },
    });
    let res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('private');

    res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('private');
  });

  test('`no-store` should bypass caching', async () => {
    const caches = createCaches();
    const app = createApp(caches, {
      cacheControl() {
        return {
          noStore: true,
        };
      },
    });
    let res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('no-store');

    res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  test('`no-cache` should bypass caching', async () => {
    const caches = createCaches();
    const app = createApp(caches, {
      cacheControl() {
        return {
          noCache: true,
        };
      },
    });
    let res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('no-cache');

    res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  test('`max-age=0` should bypass caching', async () => {
    const caches = createCaches();
    const app = createApp(caches, {
      cacheControl() {
        return {
          maxAge: 0,
        };
      },
    });
    let res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('max-age=0');

    res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('max-age=0');
  });

  test('`s-maxage=0` should bypass caching', async () => {
    const caches = createCaches();
    const app = createApp(caches, {
      cacheControl() {
        return {
          sharedMaxAge: 0,
        };
      },
    });
    let res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('s-maxage=0');

    res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('s-maxage=0');
  });

  test('`max-age=0, s-maxage=<value>` should not bypass cache', async () => {
    const caches = createCaches();
    const app = createApp(caches, {
      cacheControl() {
        return {
          maxAge: 0,
          sharedMaxAge: 1,
        };
      },
    });
    let res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(MISS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('max-age=0, s-maxage=1');

    res = await app.request(TEST_URL);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(HIT);
    expect(res.headers.get('age')).toBe('0');
    expect(res.headers.get('cache-control')).toBe('max-age=0, s-maxage=1');
  });
});

test('when the response is fresh it should return a 304 and cache the response', async () => {
  const caches = createCaches();
  const date = Math.round(Date.now() / 1000);
  const app = createApp(caches, {}, [
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
            cacheControl() {
              return { maxAge: 1 };
            },
          },
        },
      },
    },
  ]);
  const req = new Request(TEST_URL, {
    headers: {
      'if-none-match': '"v1"',
    },
  });
  const res = await app.request(req);
  const cache = await caches.open('default');
  const cacheItem = await cache.match(req);

  expect(await res.text()).toBe('');
  expect(res.status).toBe(304);
  expect(cacheItem).toBeTruthy();
  expect(await cacheItem?.text()).toBe('lol');
  expect(cacheItem?.headers.get('etag')).toBe('"v1"');
  expect(cacheItem?.headers.get('content-type')).toBe(
    'text/lol; charset=utf-8'
  );
  expect(cacheItem?.headers.get('last-modified')).toBe(
    new Date(date * 1000).toUTCString()
  );
});
