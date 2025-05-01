import type { MiddlewareHandlers } from '@web-widget/schema';
import { compose, methodsToHandler, composeMiddleware } from './compose';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms || 1));
}

type Handler<
  Content = unknown,
  Next = () => Promise<Response>,
  Result = Response,
> = (context: Content, next: Next) => Promise<Result>;

function createTestContext(method: string, disallowUnknownMethod?: boolean) {
  const scope = new URLPattern({ pathname: '/' });
  const url = new URL('http://localhost/');
  return {
    handler: methodsToHandler<MiddlewareHandlers>(
      {
        async GET(context, next) {
          expect(context.scope.pathname).toBe('/');
          const res = await next();
          res.headers.set('Test', '1');
          return res;
        },
      },
      disallowUnknownMethod
    ),
    context: {
      params: {},
      pathname: scope.pathname,
      url,
      request: new Request(url, { method }),
      state: {},
      scope,
      waitUntil: () => {},
    },
  };
}

describe('compose: Extended functionality on koa-compose', () => {
  test('Reset context for each middleware', async () => {
    interface Context {
      pathname: string;
    }
    const array: number[] = [];
    const stack: [handler: Handler<Context>, pathname: string][] = [];
    const pathnames: string[] = [];

    stack.push([
      async (context, next) => {
        pathnames.push(context.pathname);
        array.push(1);
        await wait(1);
        const res = await next();
        await wait(1);
        array.push(6);
        return res;
      },
      '/a',
    ]);

    stack.push([
      async (context, next) => {
        pathnames.push(context.pathname);
        array.push(2);
        await wait(1);
        const res = await next();
        await wait(1);
        array.push(5);
        return res;
      },
      '/b',
    ]);

    stack.push([
      async (context, next) => {
        pathnames.push(context.pathname);
        array.push(3);
        await wait(1);
        const res = await next();
        await wait(1);
        array.push(4);
        return res;
      },
      '/c',
    ]);

    const ctx = {
      params: {},
      pathname: '/',
    };
    await compose(stack, (item) => {
      ctx.pathname = item[1];
      return item[0];
    })(ctx);

    expect(array).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6]));
    expect(pathnames).toEqual(expect.arrayContaining(['/a', '/b', '/c']));
  });

  test('Response 404', async () => {
    const stack: Handler[] = [];
    const ctx = {};
    const res = await compose(stack)(ctx);
    expect(res.status).toBe(404);
    expect(res.statusText).toBe('Not Found');
  });
});

describe('methodsToHandler', () => {
  const createRequest = (method: string, disallowUnknownMethod?: boolean) => {
    const { handler, context } = createTestContext(
      method,
      disallowUnknownMethod
    );
    return handler(context, () => {
      return new Response('Hello', {
        status: 200,
        statusText: 'OK',
      });
    });
  };

  test('Basic', async () => {
    const res = await createRequest('GET');
    expect(await res.text()).toBe('Hello');
    expect(res.status).toBe(200);
    expect(res.headers.get('Test')).toBe('1');
  });

  test('Access non-existent method', async () => {
    const res = await createRequest('PUT', true);
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
    const scope = new URLPattern({ pathname: '/' });
    const url = new URL('http://localhost/');
    return handler(
      {
        params: {},
        pathname: scope.pathname,
        url,
        request: new Request(url, {
          method,
        }),
        state: {
          history: [],
        },
        scope,
        waitUntil: () => {},
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
