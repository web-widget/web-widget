import { LRUCache } from 'lru-cache';
import type { Manifest } from '@web-widget/web-router';
import WebRouter from '@web-widget/web-router';
import { buildCacheControl } from '@web-widget/helpers/headers';
import conditional from '../conditional-get';
import cache, {
  createKeyGenerator,
  defaultOptions,
  HIT,
  MISS,
  STALE,
  BYPASS,
  type CacheOptions,
  type CacheValue,
  DYNAMIC,
} from './index';

const defaultKeyGenerator = createKeyGenerator(defaultOptions.key);

type Store = {
  get: (key: string) => Promise<CacheValue | undefined>;
  set: (key: string, value: CacheValue, maxAge?: number) => Promise<void>;
};

const createStore = (): Store => {
  const store = new LRUCache<string, CacheValue>({ max: 1024 });

  return {
    async get(key: string) {
      return store.get(key) as CacheValue | undefined;
    },
    async set(key: string, value: CacheValue, maxAge?: number) {
      store.set(key, value, { ttl: maxAge });
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
            control() {
              return buildCacheControl({ maxAge: 10 });
            },
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

describe('multiple duplicate requests', () => {
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
                ETag: '"v1"',
                'content-type': 'text/lol; charset=utf-8',
                'last-modified': new Date(date * 1000).toUTCString(),
              },
            });
          },
          config: {
            cache: {
              control() {
                return buildCacheControl({ maxAge: 300 });
              },
            },
          },
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
    expect(res.headers.get('content-type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('etag')).toBe('"v1"');
    expect(res.headers.get('x-cache-status')).toBe(MISS);
    expect(await res.text()).toBe('lol');
  });

  test('serve from cache should set appropriate header', async () => {
    const app = createApp(store);
    const res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('x-cache-status')).toBe(HIT);
    expect(res.headers.get('etag')).toBe('"v1"');
    expect(await res.text()).toBe('lol');
  });

  test('POST method should not be cached', async () => {
    const app = createApp(store);
    const res = await app.request('http://localhost/', {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('x-cache-status')).toBe(MISS);
    expect(res.headers.get('etag')).toBe('"v1"');
    expect(await res.text()).toBe('lol');
  });

  test('when cached when the response is fresh it should 304', async () => {
    const app = createApp(store);
    const res = await app.request('http://localhost/', {
      headers: {
        'if-None-Match': '"v1"',
      },
    });

    expect(res.status).toBe(304);
    expect(res.headers.get('x-cache-status')).toBe(HIT);
  });

  test('when cached when the method is GET it should serve from cache until cleared', async () => {
    const app = createApp(store, {}, [
      {
        pathname: '*',
        module: {
          handler: async () => {
            return new Response('new content', {
              headers: {
                ETag: '"v2"',
                'content-type': 'text/lol; charset=utf-8',
                'last-modified': new Date(date * 1000).toUTCString(),
              },
            });
          },
          config: {
            cache: {
              control() {
                return buildCacheControl({ maxAge: 300 });
              },
            },
          },
        },
      },
    ]);

    const req = new Request('http://localhost/');
    const key = await defaultKeyGenerator(req);

    const res = await app.request(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('x-cache-status')).toBe(HIT);
    expect(res.headers.get('etag')).toBe('"v1"');
    expect(await res.text()).toBe('lol');

    // clear cache
    await store.set(key, null as unknown as CacheValue);

    const newRes = await app.request(req);
    expect(newRes.status).toBe(200);
    expect(newRes.headers.get('content-type')).toBe('text/lol; charset=utf-8');
    expect(newRes.headers.get('x-cache-status')).toBe(MISS);
    expect(await newRes.text()).toBe('new content');
  });
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
            cache: false,
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

test('when no cache control is set the latest content should be loaded', async () => {
  const store = createStore();
  const app = createApp(store, {
    control() {
      return '';
    },
  });
  const res = await app.request('http://localhost/');

  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(DYNAMIC);
  expect(res.headers.get('age')).toBe(null);
  expect(res.headers.get('cache-control')).toBe(null);
  expect(await res.text()).toBe('lol');
});

test('when body is a string it should cache the response', async () => {
  const store = createStore();
  const app = createApp(store);
  const req = new Request('http://localhost/');
  const res = await app.request(req);
  const key = await defaultKeyGenerator(req);
  const cached = await store.get(key);

  expect(res.status).toBe(200);
  expect(cached?.response.body).toBe('lol');
});

test('when the method is HEAD it should cache the response', async () => {
  const store = createStore();
  const app = createApp(store);
  const req = new Request('http://localhost/', {
    method: 'HEAD',
  });
  const res = await app.request(req);
  const key = await defaultKeyGenerator(req);
  const cached = await store.get(key);

  expect(res.status).toBe(200);
  expect(cached?.response.body).toBe('lol');
  expect(cached?.policy.resh['content-type']).toBe('text/plain;charset=UTF-8');
});

test('when the method is POST it should not cache the response', async () => {
  const store = createStore();
  const app = createApp(store);
  await app.request('http://localhost/', {
    method: 'GET',
  });
  const res = await app.request('http://localhost/', {
    method: 'POST',
  });

  expect(res.status).toBe(200);
  expect(await res.text()).toBe('lol');
  expect(res.headers.get('x-cache-status')).toBe(MISS);
});

test('when the `vary` header is present, different versions should be cached', async () => {
  const store = createStore();
  const app = createApp(
    store,
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
  let req = new Request('http://localhost/', {
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

  req = new Request('http://localhost/', {
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

  req = new Request('http://localhost/', {
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
              'content-type': 'text/lol; charset=utf-8',
              'last-modified': new Date(date * 1000).toUTCString(),
            },
          });
        },
        config: {
          cache: {
            control() {
              return buildCacheControl({ maxAge: 1 });
            },
          },
        },
      },
    },
  ]);
  const req = new Request('http://localhost/');
  const key = await defaultKeyGenerator(req);
  const res = await app.request(req);
  const cached = await store.get(key);

  expect(res.status).toBe(200);
  expect(cached).toBeTruthy();
  expect(cached?.response.body).toBe('lol');
  expect(cached?.policy.resh.etag).toBe('lol');
  expect(cached?.policy.resh['content-type']).toBe('text/lol; charset=utf-8');
  expect(cached?.policy.resh['last-modified']).toBe(
    new Date(date * 1000).toUTCString()
  );
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
              'content-type': 'text/lol; charset=utf-8',
              'last-modified': new Date(date * 1000).toUTCString(),
            },
          });
        },
        config: {
          cache: {
            control() {
              return buildCacheControl({ maxAge: 1 });
            },
          },
        },
      },
    },
  ]);
  const req = new Request('http://localhost/', {
    headers: {
      'if-none-match': 'lol',
    },
  });
  const key = await defaultKeyGenerator(req);
  const res = await app.request(req);
  const cached = await store.get(key);

  expect(await res.text()).toBe('');
  expect(res.status).toBe(304);
  expect(cached).toBeTruthy();
  expect(cached?.response.body).toBe('lol');
  expect(cached?.policy.resh.etag).toBe('lol');
  expect(cached?.policy.resh['content-type']).toBe('text/lol; charset=utf-8');
  expect(cached?.policy.resh['last-modified']).toBe(
    new Date(date * 1000).toUTCString()
  );
});

test('cache control should be added', async () => {
  const store = createStore();
  const app = createApp(store, {
    control() {
      return buildCacheControl({
        maxAge: 2,
        sharedMaxAge: 3,
        staleIfError: 4,
        staleWhileRevalidate: 5,
      });
    },
  });
  const req = new Request('http://localhost/');
  const res = await app.request(req);
  const key = await defaultKeyGenerator(req);
  const cached = await store.get(key);

  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toBe(
    'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5'
  );
  expect(cached?.response.body).toBe('lol');
});

test('`s-maxage` should be used first as cache expiration time', async () => {
  const store = createStore();
  const app = createApp(store, {
    control() {
      return buildCacheControl({
        maxAge: 3,
        sharedMaxAge: 1,
      });
    },
  });
  const req = new Request('http://localhost/');
  let res = await app.request(req);
  const key = await defaultKeyGenerator(req);
  const cached = await store.get(key);

  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('cache-control')).toBe('max-age=3, s-maxage=1');
  expect(res.headers.get('age')).toBe(null);
  expect(cached?.response.body).toBe('lol');

  res = await app.request(req);
  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=3, s-maxage=1');
  expect(res.headers.get('age')).toBe('0');
  expect(cached?.response.body).toBe('lol');

  await timeout(1000);

  res = await app.request(req);
  expect(res.status).toBe(200);
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('cache-control')).toBe('max-age=3, s-maxage=1');
  expect(res.headers.get('age')).toBe(null);
  expect(cached?.response.body).toBe('lol');
});

test('`age` should change based on cache time', async () => {
  const store = createStore();
  const app = createApp(store, {
    control() {
      return buildCacheControl({
        maxAge: 2,
      });
    },
  });
  let res = await app.request('http://localhost/');
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe(null);

  res = await app.request('http://localhost/');
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe('0');

  await timeout(1000);
  res = await app.request('http://localhost/');
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe('1');

  await timeout(1000);
  res = await app.request('http://localhost/');
  expect(res.headers.get('x-cache-status')).toBe(MISS);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe(null);

  await timeout(1000);
  res = await app.request('http://localhost/');
  expect(res.headers.get('x-cache-status')).toBe(HIT);
  expect(res.headers.get('cache-control')).toBe('max-age=2');
  expect(res.headers.get('age')).toBe('1');
});

describe('caching should be allowed to be bypassed', () => {
  test('it should be possible to disable caching middleware', async () => {
    const store = createStore();
    const app = createApp(
      store,
      {
        control() {
          return buildCacheControl({
            maxAge: 2,
          });
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
    let res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe(null);

    res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe(null);
  });

  test('`private` should bypass caching', async () => {
    const store = createStore();
    const app = createApp(store, {
      control() {
        return buildCacheControl({
          public: false,
        });
      },
    });
    let res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('private');

    res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('private');
  });

  test('`no-store` should bypass caching', async () => {
    const store = createStore();
    const app = createApp(store, {
      control() {
        return buildCacheControl({
          noStore: true,
        });
      },
    });
    let res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('no-store');

    res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  test('`no-cache` should bypass caching', async () => {
    const store = createStore();
    const app = createApp(store, {
      control() {
        return buildCacheControl({
          noCache: true,
        });
      },
    });
    let res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('no-cache');

    res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  test('`max-age=0` should bypass caching', async () => {
    const store = createStore();
    const app = createApp(store, {
      control() {
        return buildCacheControl({
          maxAge: 0,
        });
      },
    });
    let res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('max-age=0');

    res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('max-age=0');
  });

  test('`s-maxage=0` should bypass caching', async () => {
    const store = createStore();
    const app = createApp(store, {
      control() {
        return buildCacheControl({
          sharedMaxAge: 0,
        });
      },
    });
    let res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('s-maxage=0');

    res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(BYPASS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('s-maxage=0');
  });

  test('`max-age=0, s-maxage=<value>` should not bypass cache', async () => {
    const store = createStore();
    const app = createApp(store, {
      control() {
        return buildCacheControl({
          maxAge: 0,
          sharedMaxAge: 1,
        });
      },
    });
    let res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(MISS);
    expect(res.headers.get('age')).toBe(null);
    expect(res.headers.get('cache-control')).toBe('max-age=0, s-maxage=1');

    res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache-status')).toBe(HIT);
    expect(res.headers.get('age')).toBe('0');
    expect(res.headers.get('cache-control')).toBe('max-age=0, s-maxage=1');
  });
});

describe('stale while revalidate', () => {
  describe('when the cache is stale', () => {
    let count = 0;
    const store = createStore();
    const app = createApp(
      store,
      {
        control: () =>
          buildCacheControl({ maxAge: 1, staleWhileRevalidate: 2 }),
      },
      [
        {
          pathname: '*',
          module: {
            handler: async () => {
              return new Response(`Hello ${count++}`);
            },
          },
        },
      ]
    );

    test('step 1: the first request should load the latest response and cache it', async () => {
      const req = new Request('http://localhost/');
      const res = await app.request(req);
      const key = await defaultKeyGenerator(req);
      const cached = await store.get(key);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(MISS);
      expect(res.headers.get('age')).toBe(null);
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-while-revalidate=2'
      );
      expect(await res.text()).toBe('Hello 0');
      expect(cached?.response.body).toBe('Hello 0');
    });

    test('step 2: content should be fetched from cache', async () => {
      const req = new Request('http://localhost/');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(HIT);
      expect(res.headers.get('age')).toBe('0');
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-while-revalidate=2'
      );
      expect(await res.text()).toBe('Hello 0');
    });

    test('step 3: use stale content and update cache in the background', async () => {
      // NOTE: Simulation exceeds max age
      await timeout(1001);

      const req = new Request('http://localhost/');
      const res = await app.request(req);
      const key = await defaultKeyGenerator(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(STALE);
      expect(res.headers.get('age')).toBe('1');
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-while-revalidate=2'
      );
      expect(await res.text()).toBe('Hello 0');

      // NOTE: Wait for background update
      await timeout(16);

      const cached = await store.get(key);
      expect(cached?.response.body).toBe('Hello 1');
    });

    test('step 4: the updated cache should be used', async () => {
      const req = new Request('http://localhost/');
      let res = await app.request(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(HIT);
      expect(res.headers.get('age')).toBe('0');
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-while-revalidate=2'
      );
      expect(await res.text()).toBe('Hello 1');
    });
  });

  describe('when the cache is expired', () => {
    let count = 0;
    const store = createStore();
    const app = createApp(
      store,
      {
        control: () =>
          buildCacheControl({ maxAge: 1, staleWhileRevalidate: 1 }),
      },
      [
        {
          pathname: '*',
          module: {
            handler: async () => {
              return new Response(`Hello ${count++}`);
            },
          },
        },
      ]
    );

    test('step 1: the first request should load the latest response and cache it', async () => {
      const req = new Request('http://localhost/');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(MISS);
      expect(res.headers.get('age')).toBe(null);
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-while-revalidate=1'
      );
      expect(await res.text()).toBe('Hello 0');
    });

    test('step 2: content should be fetched from cache', async () => {
      const req = new Request('http://localhost/');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(HIT);
      expect(res.headers.get('age')).toBe('0');
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-while-revalidate=1'
      );
      expect(await res.text()).toBe('Hello 0');
    });

    test('step 3: reload the latest content and cache it after the cache expires', async () => {
      // NOTE: Simulation exceeds max age
      await timeout(2001);

      const req = new Request('http://localhost/');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(MISS);
      expect(res.headers.get('age')).toBe(null);
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-while-revalidate=1'
      );
      expect(await res.text()).toBe('Hello 1');
    });

    test('step 4: the updated cache should be used', async () => {
      const req = new Request('http://localhost/');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(HIT);
      expect(res.headers.get('age')).toBe('0');
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-while-revalidate=1'
      );
      expect(await res.text()).toBe('Hello 1');
    });
  });

  describe('stale if error', () => {
    let count = 0;
    const store = createStore();
    const app = createApp(
      store,
      {
        control: () =>
          buildCacheControl({
            maxAge: 1,
            staleWhileRevalidate: 1,
            staleIfError: 1,
          }),
      },
      [
        {
          pathname: '*',
          module: {
            handler: async (ctx) => {
              if (ctx.request.headers.has('throw-error')) {
                throw new Error('This is a simulated error.');
              }
              return new Response(`Hello ${count++}`);
            },
          },
        },
      ]
    );

    test('step 1: the first request should load the latest response and cache it', async () => {
      const req = new Request('http://localhost/');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(MISS);
      expect(res.headers.get('age')).toBe(null);
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-if-error=1, stale-while-revalidate=1'
      );
      expect(await res.text()).toBe('Hello 0');
    });

    test('step 2: content should be fetched from cache', async () => {
      const req = new Request('http://localhost/');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(HIT);
      expect(res.headers.get('age')).toBe('0');
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-if-error=1, stale-while-revalidate=1'
      );
      expect(await res.text()).toBe('Hello 0');
    });

    test('step 3: reloading encounters errors and should use caching', async () => {
      // NOTE: Simulation exceeds max age
      await timeout(1001);

      const req = new Request('http://localhost/');
      const res = await app.request(req, {
        headers: {
          'throw-error': 'true',
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('x-cache-status')).toBe(STALE);
      expect(res.headers.get('age')).toBe('1');
      expect(res.headers.get('cache-control')).toBe(
        'max-age=1, stale-if-error=1, stale-while-revalidate=1'
      );
      expect(await res.text()).toBe('Hello 0');
    });

    test('step 4: errors that last too long should bypass caching', async () => {
      // NOTE: Simulation exceeds max age
      await timeout(1001);

      const req = new Request('http://localhost/');
      const res = await app.request(req, {
        headers: {
          'throw-error': 'true',
        },
      });

      expect(res.status).toBe(500);
      expect(res.headers.get('x-cache-status')).toBe(null);
      expect(res.headers.get('age')).toBe(null);
      expect(res.headers.get('cache-control')).toBe(null);
    });
  });
});
