import { LRUCache } from 'lru-cache';
import type { Manifest } from '@web-widget/web-router';
import WebRouter from '@web-widget/web-router';
import cache, { type CacheOptions } from './cache';

type CacheValue = {
  body: string | null;
  contentType: string | null;
  lastModified: string | null;
  etag: string | null;
};

const createApp = function (
  store: LRUCache<any, any>,
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

test('should pass the maxAge through config.cache.maxAge', async () => {
  let set = false;

  const store = new LRUCache<string, CacheValue>({ max: 1024 });
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
  const cached = store.get('http://localhost/');

  expect(set).toBe(true);
  expect(res.status).toBe(200);
  expect(cached?.body).toBe('lol');
});

test('when body is a string it should cache the response', async () => {
  const store = new LRUCache<string, CacheValue>({ max: 1024 });
  const app = createApp(store);
  const res = await app.request('http://localhost/');
  const cached = store.get('http://localhost/');

  expect(res.status).toBe(200);
  expect(cached?.body).toBe('lol');
});

test('when the method is HEAD it should cache the response', async () => {
  const store = new LRUCache<string, CacheValue>({ max: 1024 });
  const app = createApp(store);
  const res = await app.request('http://localhost/', {
    method: 'HEAD',
  });
  const cached = store.get('http://localhost/');

  expect(res.status).toBe(200);
  expect(cached?.body).toBe('lol');
  expect(cached?.contentType).toBe('text/plain;charset=UTF-8');
});

test('when the method is POST it should not cache the response', async () => {
  const store = new LRUCache({ max: 1024 });
  const app = createApp(store);
  const res = await app.request('http://localhost/', {
    method: 'POST',
  });
  const cached = store.get('http://localhost/');

  expect(res.status).toBe(200);
  expect(await res.text()).toBe('lol');
  expect(cached).toBeUndefined();
});

test('when the response code is not 200 it should not cache the response', async () => {
  const store = new LRUCache({ max: 1024 });
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
  const cached = store.get('http://localhost/');

  expect(res.status).toBe(201);
  expect(await res.text()).toBe('lol');
  expect(cached).toBeUndefined();
});

test('when etag and last-modified headers are set it should cache those values', async () => {
  const store = new LRUCache<string, CacheValue>({ max: 1024 });
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
  const cached = store.get('http://localhost/');

  expect(res.status).toBe(200);
  expect(cached).toBeTruthy();
  expect(cached?.body).toBe('lol');
  expect(cached?.etag).toBe('lol');
  expect(cached?.contentType).toBe('text/lol; charset=utf-8');
  expect(cached?.lastModified).toBe(new Date(date * 1000).toUTCString());
});

test('when the response is fresh it should return a 304 and cache the response', async () => {
  const store = new LRUCache<string, CacheValue>({ max: 1024 });
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
  const cached = store.get('http://localhost/');

  expect(await res.text()).toBe('');
  expect(res.status).toBe(304);
  expect(cached).toBeTruthy();
  expect(cached?.body).toBe('lol');
  expect(cached?.etag).toBe('lol');
  expect(cached?.contentType).toBe('text/lol; charset=utf-8');
  expect(cached?.lastModified).toBe(new Date(date * 1000).toUTCString());
});
