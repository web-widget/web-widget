import { LRUCache } from 'lru-cache';
import type { Manifest } from '@web-widget/web-router';
import WebRouter from '@web-widget/web-router';
import { buildCacheControl } from '@web-widget/helpers/headers';
import conditional from '../conditional-get';
import cache, {
  createKeyGenerator,
  defaultOptions,
  type CacheOptions,
  type CacheValue,
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
                'Content-Type': 'text/lol; charset=utf-8',
                'Last-Modified': new Date(date * 1000).toUTCString(),
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
    expect(res.headers.get('Content-Type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('ETag')).toBe('"v1"');
    expect(res.headers.get('X-Cached-Response')).toBe(null);
    expect(await res.text()).toBe('lol');
  });

  test('serve from cache should set appropriate header', async () => {
    const app = createApp(store);
    const res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');
    expect(res.headers.get('ETag')).toBe('"v1"');
    expect(await res.text()).toBe('lol');
  });

  test('POST method should not be cached', async () => {
    const app = createApp(store);
    const res = await app.request('http://localhost/', {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('X-Cached-Response')).toBe(null);
    expect(res.headers.get('ETag')).toBe('"v1"');
    expect(await res.text()).toBe('lol');
  });

  test('when cached when the response is fresh it should 304', async () => {
    const app = createApp(store);
    const res = await app.request('http://localhost/', {
      headers: {
        'If-None-Match': '"v1"',
      },
    });

    expect(res.status).toBe(304);
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');
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
                'Content-Type': 'text/lol; charset=utf-8',
                'Last-Modified': new Date(date * 1000).toUTCString(),
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
    expect(res.headers.get('Content-Type')).toBe('text/lol; charset=utf-8');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');
    expect(res.headers.get('ETag')).toBe('"v1"');
    expect(await res.text()).toBe('lol');

    // clear cache
    await store.set(key, null as unknown as CacheValue);

    const newRes = await app.request(req);
    expect(newRes.status).toBe(200);
    expect(newRes.headers.get('Content-Type')).toBe('text/lol; charset=utf-8');
    expect(newRes.headers.get('X-Cached-Response')).toBe(null);
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
  expect(res.headers.get('X-Cached-Response')).toBe(null);
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
              'Content-Type': 'text/lol; charset=utf-8',
              'Last-Modified': new Date(date * 1000).toUTCString(),
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
      'If-None-Match': 'lol',
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
  expect(res.headers.get('Cache-Control')).toBe(
    'max-age=2, s-maxage=3, stale-if-error=4, stale-while-revalidate=5'
  );
  expect(cached?.response.body).toBe('lol');
});

test('`Age` should change based on cache time', async () => {
  const store = createStore();
  const app = createApp(store, {
    _backgroundUpdate: false,
    control() {
      return buildCacheControl({
        maxAge: 3,
        sharedMaxAge: 2,
        staleIfError: 0,
        staleWhileRevalidate: 2,
      });
    },
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
  const STALE_WHILE_REVALIDATE = () =>
    buildCacheControl({ maxAge: 0, staleWhileRevalidate: 2 });

  let count = 0;
  const store = createStore();
  const app = createApp(
    store,
    {
      control: STALE_WHILE_REVALIDATE,
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

  test('on the first request for an asset, fetch it from the network, place it in the cache, and return the network response', async () => {
    const req = new Request('http://localhost/');
    const res = await app.request(req);
    const key = await defaultKeyGenerator(req);
    const cached = await store.get(key);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello 0');
    expect(cached?.response.body).toBe('Hello 0');
    expect(res.headers.get('X-Cached-Response')).toBe(null);
  });

  test('on subsequent requests, serve the asset from the cache first, then "in the background," re-request it from the network and update the asset\'s cache entry', async () => {
    const req = new Request('http://localhost/');
    const res = await app.request(req);
    const key = await defaultKeyGenerator(req);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello 0');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');

    await timeout(8);

    const cached = await store.get(key);
    expect(cached?.response.body).toBe('Hello 1');
  });

  test("for requests after that, you'll receive the latest version fetched from the network that was placed in the cache in the prior step", async () => {
    const req = new Request('http://localhost/');
    let res = await app.request(req);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello 1');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');

    await timeout(8);
    res = await app.request(req);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello 2');
    expect(res.headers.get('X-Cached-Response')).toBe('HIT');

    await timeout(2000);
    res = await app.request(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cached-Response')).toBe(null);
  });
});

describe('custom cache key', () => {
  test('base: host + pathname + search', async () => {
    const customKey = createKeyGenerator({
      host: true,
      pathname: true,
      search: true,
    });
    const key = await customKey(new Request('http://localhost/?a=1'));
    expect(key).toBe('localhost/?a=1');
  });

  test('should support built-in rules', async () => {
    const customKey = createKeyGenerator(
      {
        cookie: true,
        device: true,
        header: {
          include: ['x-id'],
        },
        host: true,
        method: true,
        pathname: true,
        search: true,
        very: true,
      },
      {},
      ['x-a', 'x-b']
    );
    const key = await customKey(
      new Request('http://localhost/?a=1', {
        method: 'GET',
        headers: {
          cookie: 'a=1',
          'X-ID': 'abc',
          'x-a': 'a',
          'x-b': 'b',
        },
      })
    );
    expect(key).toBe(
      'localhost/?a=1#a=356a19:desktop:x-id=a9993e:GET:x-a=86f7e4&x-b=e9d71f'
    );
  });

  test('the query should be sorted', async () => {
    const customKey = createKeyGenerator({
      search: true,
    });
    const key = await customKey(new Request('http://localhost/?b=2&a=1'));
    expect(key).toBe('?a=1&b=2');
  });

  test('header key should ignore case', async () => {
    const customKey = createKeyGenerator({
      header: true,
    });
    const key = await customKey(
      new Request('http://localhost/', {
        headers: {
          a: 'application/json',
          'X-ID': 'abc',
        },
      })
    );
    expect(key).toBe('#a=ca9fd0&x-id=a9993e');
  });

  test('should support filtering', async () => {
    const customKey = createKeyGenerator({
      host: {
        include: ['localhost'],
      },
      pathname: true,
      search: { include: ['a'] },
      header: { include: ['x-id'] },
    });
    const key = await customKey(
      new Request('http://localhost/?a=1&b=2', {
        headers: {
          accept: 'application/json',
          'x-id': 'abc',
        },
      })
    );
    expect(key).toBe('localhost/?a=1#x-id=a9993e');
  });

  test('should support presence or absence without including its actual value', async () => {
    const customKey = createKeyGenerator({
      host: true,
      pathname: true,
      search: { include: ['a', 'b'], checkPresence: ['a'] },
    });
    const key = await customKey(new Request('http://localhost/?a=1&b=2'));
    expect(key).toBe('localhost/?a=&b=2');
  });
});
