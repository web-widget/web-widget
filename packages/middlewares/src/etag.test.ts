import WebRouter from '@web-widget/web-router';
import etag from './etag';

describe('etag()', function () {
  describe('when body is missing', function () {
    test('should not add ETag', async function () {
      const app = WebRouter.fromManifest({
        routes: [
          {
            pathname: '/',
            module: {
              async handler() {
                return new Response('Hello World');
              },
            },
          },
        ],
        middlewares: [
          {
            pathname: '*',
            module: {
              handler: etag(),
            },
          },
        ],
      });
      await app.dispatch('http://localhost/');
    });
  });

  describe('when ETag is exists', function () {
    test('should not add ETag', async function () {
      const app = WebRouter.fromManifest({
        routes: [
          {
            pathname: '/',
            module: {
              async handler() {
                return new Response('etag', {
                  headers: {
                    ETag: 'etaghaha',
                  },
                });
              },
            },
          },
        ],
        middlewares: [
          {
            pathname: '*',
            module: {
              handler: etag(),
            },
          },
        ],
      });
      const res = await app.dispatch('http://localhost/');

      expect(res.headers.get('ETag')).toBe('etaghaha');
      expect(await res.text()).toBe('etag');
      expect(res.status).toBe(200);
    });
  });

  describe('when body is a string', function () {
    test('should add ETag', async function () {
      const app = WebRouter.fromManifest({
        routes: [
          {
            pathname: '/',
            module: {
              async handler() {
                return new Response('Hello World');
              },
            },
          },
        ],
        middlewares: [
          {
            pathname: '*',
            module: {
              handler: etag(),
            },
          },
        ],
      });
      const res = await app.dispatch('http://localhost/');

      expect(res.headers.get('ETag')).toBe(
        '"0a4d55a8d778e5022fab701977c5d840bbc486d0"'
      );
    });
  });

  describe('when with options', function () {
    test('should add weak ETag', async function () {
      const options = { weak: true };
      const app = WebRouter.fromManifest({
        routes: [
          {
            pathname: '/',
            module: {
              async handler() {
                return new Response('Hello World');
              },
            },
          },
        ],
        middlewares: [
          {
            pathname: '*',
            module: {
              handler: etag(options),
            },
          },
        ],
      });
      const res = await app.dispatch('http://localhost/');

      expect(res.headers.get('ETag')).toBe(
        'W/"0a4d55a8d778e5022fab701977c5d840bbc486d0"'
      );
    });
  });
});
