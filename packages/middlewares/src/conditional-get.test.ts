import WebRouter from '@web-widget/web-router';
import { etag as calculate } from '@web-widget/helpers/headers';
import conditional from './conditional-get';
import etag from './etag';

const body = {
  name: 'tobi',
  species: 'ferret',
  age: 2,
};

describe('conditional()', function () {
  describe('when cache is fresh', function () {
    it('should respond with 304', async function () {
      const app = WebRouter.fromManifest({
        routes: [
          {
            pathname: '/',
            module: {
              async handler() {
                return new Response(JSON.stringify(body), {
                  headers: {
                    'Content-Type': 'application/json',
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
              handler: conditional(),
            },
          },
          {
            pathname: '*',
            module: {
              handler: etag(),
            },
          },
        ],
      });
      const res = await app.request('http://localhost/', {
        headers: {
          'If-None-Match': await calculate(JSON.stringify(body)),
        },
      });

      expect(res.status).toBe(304);
    });
  });

  describe('when cache is stale', function () {
    it('should do nothing', async function () {
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
              handler: conditional(),
            },
          },
          {
            pathname: '*',
            module: {
              handler: etag(),
            },
          },
        ],
      });
      const res = await app.request('http://localhost/', {
        headers: {
          'If-None-Match': 'tobi',
        },
      });

      expect(res.status).toBe(200);
    });
  });
});
