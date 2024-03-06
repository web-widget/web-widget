import { LRUCache } from 'lru-cache';
import type { Manifest } from '@web-widget/web-router';
import WebRouter from '@web-widget/web-router';
import { cache, type CacheOptions } from './cache';

type CacheValue = {
  body: string | null;
  contentType: string | null;
  lastModified: string | null;
  etag: string | null;
};

const store = new LRUCache<string, CacheValue>({
  max: 1024,
});
const date = Math.round(Date.now() / 1000);

const createApp = function (
  store: LRUCache<string, CacheValue>,
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
        $cache: {},
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

test('when setCachedHeader is true, serve from cache should set appropriate header', async () => {
  const app = createApp(store, { setCachedHeader: true });
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
