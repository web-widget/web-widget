import { LRUCache } from 'lru-cache';
import type { Manifest } from '@web-widget/web-router';
import WebRouter from '@web-widget/web-router';
import conditional from './conditional-get';
import cache, {
  CACHE_FIRST,
  CACHE_ONLY,
  isStale,
  NETWORK_FIRST,
  NETWORK_ONLY,
  setCache,
  STALE_WHILE_REVALIDATE,
  type CacheOptions,
  type CacheValue,
} from './cache';

type Store = {
  get: (key: string, maxAge?: number) => Promise<any>;
  set: (key: string, value: any, maxAge?: number) => Promise<void>;
};

const createStore = (): Store => {
  const store = new LRUCache<string, CacheValue>({ max: 1024 });

  return {
    async get(key: string, _maxAge?: number) {
      return store.get(key);
    },
    async set(key: string, value: CacheValue, maxAge?: number) {
      store.set(key, value, { ttl: maxAge ? maxAge * 1000 : undefined });
    },
  };
};

const timeout = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const createApp = function (
  store: Store,
  opts: Partial<CacheOptions> = {},
  routes: Manifest['routes'] = [
    {
      pathname: '*',
      module: {
        handler: async () => {
          return new Response('lol');
        },
        config: { cache: true },
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
            async get(key) {
              return store.get(key);
            },
            async set(key, value, maxAge) {
              store.set(key, value, maxAge);
            },
            ...opts,
          }),
        },
      },
    ],
  });

  return app;
};

describe('basic', () => {
  const store = createStore();
  const date = Math.round(Date.now() / 1000);

  const createApp = function (
    store: Store,
    opts: Partial<CacheOptions> = {},
    routes: Manifest['routes'] = [
      {
        pathname: '*',
        module: {
          handler: async () => {
            return new Response('lol', {
              headers: {
                ETag: 'lol',
                'Content-Type': 'text/lol; charset=utf-8',
                'Last-Modified': new Date(date * 1000).toUTCString(),
              },
            });
          },
          config: { cache: true },
        },
      },
    ]
  ) {
    const app = WebRouter.fromManifest({
      routes,
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
              async get(key) {
                return store.get(key);
              },
              async set(key, value) {
                store.set(key, value);
              },
              ...opts,
            }),
          },
        },
      ],
    });

    return app;
  };

  test('when cached when the method is GET it should serve from cache', async () => {
    const app = createApp(store);
    const res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('ETag')).toBe('lol');
    expect(await res.text()).toBe('lol');
  });

  test('when setCachedResponseHeader is true, serve from cache should set appropriate header', async () => {
    const app = createApp(store, { setCachedResponseHeader: true });
    const res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');
    expect(res.headers.get('ETag')).toBe('lol');
    expect(await res.text()).toBe('lol');
  });

  test('when cached when the method is POST it should not serve from cache', async () => {
    const app = createApp(store);
    const res = await app.request('http://localhost/', {
      method: 'POST',
    });

    expect(res.status).toBe(200);
  });

  test('when cached and the method is POST and POST is enabled it should serve from cache', async () => {
    const app = createApp(store, { methods: { POST: true } });
    const res = await app.request('http://localhost/', {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('ETag')).toBe('lol');
    expect(await res.text()).toBe('lol');
  });

  test('when cached when the response is fresh it should 304', async () => {
    const app = createApp(store);
    const res = await app.request('http://localhost/', {
      headers: {
        'If-None-Match': 'lol',
      },
    });

    expect(res.status).toBe(304);
  });

  test('when cached when the method is GET it should serve from cache until cleared', async () => {
    let isCache = false;
    const app = createApp(store, {}, [
      {
        pathname: '*',
        module: {
          handler: async () => {
            if (!isCache) {
              isCache = true;
              return new Response('lol', {
                headers: {
                  ETag: 'lol',
                  'Content-Type': 'text/lol; charset=utf-8',
                  'Last-Modified': new Date(date * 1000).toUTCString(),
                },
              });
            } else {
              return new Response('no lols', {
                headers: {
                  'Content-Type': 'text/plain',
                },
              });
            }
          },
        },
      },
    ]);

    const res1 = await app.request('http://localhost/');
    expect(res1.status).toBe(200);
    expect(res1.headers.get('Content-Type')).toBe('text/lol; charset=utf-8');
    expect(res1.headers.get('ETag')).toBe('lol');
    expect(await res1.text()).toBe('lol');

    store.set('http://localhost/', null as unknown as CacheValue);

    const res2 = await app.request('http://localhost/');
    expect(res2.status).toBe(200);
    expect(res2.headers.get('Content-Type')).toBe('text/plain');
    expect(await res2.text()).toBe('no lols');
  });
});

test('should pass the maxAge through config.cache.maxAge', async () => {
  let set = false;

  const store = createStore();
  const app = createApp(
    store,
    {
      async get(key, maxAge) {
        return store.get(key, maxAge);
      },
      async set(key, value, maxAge) {
        set = true;
        expect(maxAge).toBe(3);
        store.set(key, value, maxAge);
      },
    },
    [
      {
        pathname: '*',
        module: {
          config: {
            cache: {
              maxAge: 3,
            },
          },
          handler: async () => {
            return new Response('lol');
          },
        },
      },
    ]
  );
  const res = await app.request('http://localhost/');
  const cached = await store.get('http://localhost/');

  expect(set).toBe(true);
  expect(res.status).toBe(200);
  expect(cached?.body).toBe('lol');
  expect(
    await isStale('http://localhost/', {
      ...store,
    })
  ).toBe(false);
});

test('disabling caching middleware should be allowed', async () => {
  let set = false;

  const store = createStore();
  const app = createApp(
    store,
    {
      async get(key) {
        return store.get(key);
      },
      async set(key, value, maxAge) {
        set = true;
        expect(maxAge).toBe(300);
        store.set(key, value);
      },
    },
    [
      {
        pathname: '*',
        module: {
          config: {
            cache: {
              maxAge: 300,
              strategies: () => NETWORK_ONLY,
            },
          },
          handler: async () => {
            return new Response('lol');
          },
        },
      },
    ]
  );
  const res = await app.request('http://localhost/');

  expect(set).toBe(false);
  expect(res.status).toBe(200);
});

test('when body is a string it should cache the response', async () => {
  const store = createStore();
  const app = createApp(store);
  const res = await app.request('http://localhost/');
  const cached = await store.get('http://localhost/');

  expect(res.status).toBe(200);
  expect(cached?.body).toBe('lol');
});

test('when the method is HEAD it should cache the response', async () => {
  const store = createStore();
  const app = createApp(store);
  const res = await app.request('http://localhost/', {
    method: 'HEAD',
  });
  const cached = await store.get('http://localhost/');

  expect(res.status).toBe(200);
  expect(cached?.body).toBe('lol');
  expect(cached?.contentType).toBe('text/plain;charset=UTF-8');
});

test('when the method is POST it should not cache the response', async () => {
  const store = createStore();
  const app = createApp(store);
  const res = await app.request('http://localhost/', {
    method: 'POST',
  });
  const cached = await store.get('http://localhost/');

  expect(res.status).toBe(200);
  expect(await res.text()).toBe('lol');
  expect(cached).toBeUndefined();
});

test('when the response code is not 200 it should not cache the response', async () => {
  const store = createStore();
  const app = createApp(store, {}, [
    {
      pathname: '*',
      module: {
        handler: async () => {
          return new Response('lol', { status: 201 });
        },
      },
    },
  ]);
  const res = await app.request('http://localhost/', {
    method: 'POST',
  });
  const cached = await store.get('http://localhost/');

  expect(res.status).toBe(201);
  expect(await res.text()).toBe('lol');
  expect(cached).toBeUndefined();
});

test('when etag and last-modified headers are set it should cache those values', async () => {
  const store = createStore();
  const date = Math.round(Date.now() / 1000);
  const app = createApp(store, {}, [
    {
      pathname: '*',
      module: {
        handler: async () => {
          return new Response('lol', {
            headers: {
              ETag: 'lol',
              'Content-Type': 'text/lol; charset=utf-8',
              'Last-Modified': new Date(date * 1000).toUTCString(),
            },
          });
        },
        config: { cache: true },
      },
    },
  ]);
  const res = await app.request('http://localhost/');
  const cached = await store.get('http://localhost/');

  expect(res.status).toBe(200);
  expect(cached).toBeTruthy();
  expect(cached?.body).toBe('lol');
  expect(cached?.etag).toBe('lol');
  expect(cached?.contentType).toBe('text/lol; charset=utf-8');
  expect(cached?.lastModified).toBe(new Date(date * 1000).toUTCString());
});

test('when the response is fresh it should return a 304 and cache the response', async () => {
  const store = createStore();
  const date = Math.round(Date.now() / 1000);
  const app = createApp(store, {}, [
    {
      pathname: '*',
      module: {
        handler: async () => {
          return new Response('lol', {
            headers: {
              ETag: 'lol',
              'Content-Type': 'text/lol; charset=utf-8',
              'Last-Modified': new Date(date * 1000).toUTCString(),
            },
          });
        },
        config: { cache: true },
      },
    },
  ]);
  const res = await app.request('http://localhost/', {
    headers: {
      'If-None-Match': 'lol',
    },
  });
  const cached = await store.get('http://localhost/');

  expect(await res.text()).toBe('');
  expect(res.status).toBe(304);
  expect(cached).toBeTruthy();
  expect(cached?.body).toBe('lol');
  expect(cached?.etag).toBe('lol');
  expect(cached?.contentType).toBe('text/lol; charset=utf-8');
  expect(cached?.lastModified).toBe(new Date(date * 1000).toUTCString());
});

test('determine whether the content has expired', async () => {
  const store = createStore();
  await setCache('http://localhost/', new Response('lol'), {
    maxAge: 1,
    sMaxAge: 1,
    staleIfError: 0,
    staleWhileRevalidate: 3,
    status: { 200: true },
    ...store,
  });

  expect(
    await isStale('http://localhost/', {
      ...store,
    })
  ).toBe(false);

  await timeout(1000);

  expect(
    await isStale('http://localhost/', {
      ...store,
    })
  ).toBe(true);
});

test('cache control should be added', async () => {
  const store = createStore();
  const app = createApp(store, {
    setCacheControlHeader: true,
    maxAge: 2,
    sMaxAge: 3,
    staleIfError: 4,
    staleWhileRevalidate: 5,
  });
  const res = await app.request('http://localhost/');
  const cached = await store.get('http://localhost/');

  expect(res.status).toBe(200);
  expect(res.headers.get('Cache-Control')).toBe(
    'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5'
  );
  expect(cached?.body).toBe('lol');
});

test('should be able to set the cache control header with a custom max-age and refresh and the cache should be updated', async () => {
  const store = createStore();
  const app = createApp(store, {
    setCacheControlHeader: true,
    maxAge: 2,
    staleWhileRevalidate: 1,
  });
  const res = await app.request('http://localhost/');
  const cached = await store.get('http://localhost/');

  expect(res.status).toBe(200);
  expect(res.headers.get('Cache-Control')).toBe(
    'max-age=2, s-maxage=2, stale-if-error=0, stale-while-revalidate=1'
  );
  expect(cached?.body).toBe('lol');

  expect(
    await isStale('http://localhost/', {
      ...store,
    })
  ).toBe(false);
  expect(cached?.body).toBe('lol');

  await timeout(1000);

  expect(
    await isStale('http://localhost/', {
      ...store,
    })
  ).toBe(false);
  expect(cached?.body).toBe('lol');

  await timeout(1000);

  expect(
    await isStale('http://localhost/', {
      ...store,
    })
  ).toBe(true);
  expect(cached?.body).toBe('lol');
});

test('`Age` should change based on cache time', async () => {
  const store = createStore();
  const app = createApp(store, {
    setCacheControlHeader: true,
    setCachedResponseHeader: true,
    backgroundRefresh: false,
    maxAge: 3,
    sMaxAge: 2,
    staleWhileRevalidate: 2,
  });
  let res = await app.request('http://localhost/');
  expect(res.headers.get('X-Cached-Response')).toBe(null);
  expect(res.headers.get('Cache-Control')).toBe(
    'max-age=3, s-maxage=2, stale-if-error=0, stale-while-revalidate=2'
  );
  expect(res.headers.get('Age')).toBe(null);

  res = await app.request('http://localhost/');
  expect(res.headers.get('X-Cached-Response')).toBe('HIT');
  expect(res.headers.get('Cache-Control')).toBe(
    'max-age=3, s-maxage=2, stale-if-error=0, stale-while-revalidate=2'
  );
  expect(res.headers.get('Age')).toBe('0');

  await timeout(1000);
  res = await app.request('http://localhost/');
  expect(res.headers.get('X-Cached-Response')).toBe('HIT');
  expect(res.headers.get('Cache-Control')).toBe(
    'max-age=3, s-maxage=2, stale-if-error=0, stale-while-revalidate=2'
  );
  expect(res.headers.get('Age')).toBe('1');

  await timeout(999);
  res = await app.request('http://localhost/');
  expect(res.headers.get('X-Cached-Response')).toBe('HIT');
  expect(res.headers.get('Cache-Control')).toBe(
    'max-age=3, s-maxage=2, stale-if-error=0, stale-while-revalidate=2'
  );
  expect(res.headers.get('Age')).toBe('2');

  await timeout(1000);
  res = await app.request('http://localhost/');
  expect(res.headers.get('X-Cached-Response')).toBe('HIT');
  expect(res.headers.get('Cache-Control')).toBe(
    'max-age=3, s-maxage=2, stale-if-error=0, stale-while-revalidate=2'
  );
  expect(res.headers.get('Age')).toBe('1');

  await timeout(1000);
  res = await app.request('http://localhost/');
  expect(res.headers.get('X-Cached-Response')).toBe('HIT');
  expect(res.headers.get('Cache-Control')).toBe(
    'max-age=3, s-maxage=2, stale-if-error=0, stale-while-revalidate=2'
  );
  expect(res.headers.get('Age')).toBe('2');
});

describe('stale-while-revalidate', () => {
  let count = 0;
  const store = createStore();
  const app = createApp(
    store,
    {
      strategies: () => STALE_WHILE_REVALIDATE,
      setCachedResponseHeader: true,
      maxAge: 0,
      staleWhileRevalidate: 10,
    },
    [
      {
        pathname: '*',
        module: {
          handler: async () => {
            return new Response(`Hello ${count++}`);
          },
          config: { cache: true },
        },
      },
    ]
  );

  test('on the first request for an asset, fetch it from the network, place it in the cache, and return the network response', async () => {
    const res = await app.request('http://localhost/');
    const cached = await store.get('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello 0');
    expect(cached?.body).toBe('Hello 0');
    expect(res.headers.get('X-Cached-Response')).toBe(null);
  });

  test('on subsequent requests, serve the asset from the cache first, then "in the background," re-request it from the network and update the asset\'s cache entry', async () => {
    const res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello 0');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');

    await timeout(8);

    const cached = await store.get('http://localhost/');
    expect(cached?.body).toBe('Hello 1');
  });

  test("for requests after that, you'll receive the latest version fetched from the network that was placed in the cache in the prior step", async () => {
    let res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello 1');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');

    await timeout(8);
    res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello 2');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');
  });
});

describe('network-only', () => {
  test('network-only policy should be followed even if the cache is set', async () => {
    const store = createStore();
    const app = createApp(store, {
      maxAge: 3,
      setCachedResponseHeader: true,
      strategies: () => NETWORK_ONLY,
    });
    await setCache('http://localhost/', new Response('cached'), {
      maxAge: 1,
      sMaxAge: 1,
      staleIfError: 0,
      staleWhileRevalidate: 1,
      status: { 200: true },
      ...store,
    });
    const res = await app.request('http://localhost/');
    const cached = await store.get('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('lol');
    expect(cached?.body).toBe('cached');
    expect(res.headers.get('X-Cached-Response')).toBe(null);
  });
});

describe('cache-only', () => {
  test('cache-only policy should be followed even if the network is available', async () => {
    const store = createStore();
    const app = createApp(store, {
      maxAge: 3,
      setCachedResponseHeader: true,
      strategies: () => CACHE_ONLY,
    });
    await setCache('http://localhost/', new Response('cached'), {
      maxAge: 1,
      sMaxAge: 1,
      staleIfError: 0,
      staleWhileRevalidate: 1,
      status: { 200: true },
      ...store,
    });
    const res = await app.request('http://localhost/');
    const cached = await store.get('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('cached');
    expect(cached?.body).toBe('cached');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');
  });
});

describe('cache-first', () => {
  test('the request hits the cache. If the asset is in the cache, serve it from there', async () => {
    const store = createStore();
    const app = createApp(store, {
      strategies: () => CACHE_FIRST,
      setCachedResponseHeader: true,
    });
    await setCache('http://localhost/', new Response('cached'), {
      maxAge: 1,
      sMaxAge: 1,
      staleIfError: 0,
      staleWhileRevalidate: 1,
      status: { 200: true },
      ...store,
    });

    expect((await store.get('http://localhost/'))?.body).toBe('cached');

    const res = await app.request('http://localhost/');
    const cached = await store.get('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('cached');
    expect(cached?.body).toBe('cached');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');
  });

  test('if the request is not in the cache, go to the network', async () => {
    const store = createStore();
    const app = createApp(store, {
      strategies: () => CACHE_FIRST,
      setCachedResponseHeader: true,
    });

    expect(await store.get('http://localhost/')).toBeUndefined();

    const res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('lol');
    expect(res.headers.get('X-Cached-Response')).toBe(null);
  });

  test('once the network request finishes, add it to the cache, then return the response from the network', async () => {
    const store = createStore();
    const app = createApp(store, {
      strategies: () => CACHE_FIRST,
      setCachedResponseHeader: true,
    });

    expect(await store.get('http://localhost/')).toBeUndefined();

    const res = await app.request('http://localhost/');
    const cached = await store.get('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('lol');
    expect(cached?.body).toBe('lol');
  });
});

describe('network-first', () => {
  test('the network request should be accessed first and the response placed in the cache', async () => {
    const store = createStore();
    const app = createApp(store, {
      strategies: () => NETWORK_FIRST,
      setCachedResponseHeader: true,
    });
    await setCache('http://localhost/', new Response('cached'), {
      maxAge: 1,
      sMaxAge: 1,
      staleIfError: 0,
      staleWhileRevalidate: 1,
      status: { 200: true },
      ...store,
    });
    expect((await store.get('http://localhost/'))?.body).toBe('cached');

    const res = await app.request('http://localhost/');
    const cached = await store.get('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('lol');
    expect(cached?.body).toBe('lol');
    expect(res.headers.get('X-Cached-Response')).toBe(null);
  });

  test('if the network is unavailable, fallback to the latest version of the response in cache', async () => {
    const store = createStore();
    const app = createApp(
      store,
      {
        strategies: () => NETWORK_FIRST,
        setCachedResponseHeader: true,
      },
      [
        {
          pathname: '*',
          module: {
            handler: async () => {
              throw new Error('Network error');
            },
            config: { cache: true },
          },
        },
      ]
    );
    await setCache('http://localhost/', new Response('lol'), {
      maxAge: 1,
      sMaxAge: 1,
      staleIfError: 0,
      staleWhileRevalidate: 1,
      status: { 200: true },
      ...store,
    });
    const res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('lol');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');
  });
});
