import type { MiddlewareHandlers } from '@web-widget/schema';
import { methodsToHandler, composeMiddleware } from './compose';

describe('methodsToHandler', () => {
  const handler = methodsToHandler<MiddlewareHandlers>({
    async GET(context, next) {
      expect(context.pathname).toBe('/');
      const res = await next();
      res.headers.set('Test', '1');
      return res;
    },
  });

  const createRequest = (method: string) => {
    return handler(
      {
        params: {},
        pathname: '/',
        request: new Request('http://localhost', {
          method,
        }),
        state: {},
      },
      () => {
        return new Response('Hello', {
          status: 200,
          statusText: 'OK',
        });
      }
    );
  };

  test('Basic', async () => {
    const res = await createRequest('GET');
    expect(await res.text()).toBe('Hello');
    expect(res.status).toBe(200);
    expect(res.headers.get('Test')).toBe('1');
  });

  test('Access non-existent method', async () => {
    const res = await createRequest('PUT');
    expect(res.status).toBe(405);
    expect(res.statusText).toBe('Method Not Allowed');
    expect(res.headers.get('Accept')).toBe('GET, HEAD');
  });

  test('Add default HEAD method', async () => {
    const res = await createRequest('HEAD');
    expect(res.body).toBe(null);
    expect(res.status).toBe(200);
    expect(res.statusText).toBe('OK');
    expect(res.headers.get('Test')).toBe('1');
  });
});

describe('composeMiddleware', () => {
  const handler = composeMiddleware([
    async (context, next) => {
      expect(context.pathname).toBe('/');
      const res = await next();
      // @ts-ignore
      context.state.history.push('MiddlewareA');
      // @ts-ignore
      res.headers.set('Test', context.state.history.join(', '));
      return res;
    },
    async (context, next) => {
      expect(context.pathname).toBe('/');
      const res = await next();
      res.headers.set('MiddlewareB', '1');
      // @ts-ignore
      context.state.history.push('MiddlewareB');
      return res;
    },
    async (context) => {
      // @ts-ignore
      context.state.history.push('MiddlewareC');
      return new Response('Hello', {
        status: 200,
        statusText: 'OK',
        headers: {
          MiddlewareC: '1',
        },
      });
    },
  ]);

  const createRequest = (method: string) => {
    return handler(
      {
        params: {},
        pathname: '/',
        request: new Request('http://localhost/', {
          method,
        }),
        state: {
          history: [],
        },
      },
      () => {
        return new Response(null, {
          status: 404,
        });
      }
    );
  };

  test('Combine multiple middlewares into one', async () => {
    const res = await createRequest('GET');
    expect(await res.text()).toBe('Hello');
    expect(res.status).toBe(200);
    expect(res.headers.get('Test')).toBe(
      'MiddlewareC, MiddlewareB, MiddlewareA'
    );
  });
});
