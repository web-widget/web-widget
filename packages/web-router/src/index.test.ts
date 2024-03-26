import type { OnFallback } from './modules';
import type {
  RouteError,
  RouteModule,
  RouteHandlerContext,
  RouteRenderOptions,
} from '.';
import WebRouter from '.';

describe('Basic', () => {
  const app = WebRouter.fromManifest({
    routes: [
      {
        pathname: '/hello',
        module: {
          handler: {
            GET() {
              return new Response('get hello');
            },
            POST() {
              return new Response('post hello');
            },
          },
        },
      },
    ],
  });

  test('GET http://localhost/hello is ok', async () => {
    const res = await app.request('http://localhost/hello');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('get hello');
  });

  test('POST http://localhost/hello is ok', async () => {
    const res = await app.request('http://localhost/hello', {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('post hello');
  });
});

describe('Multiple identical routes', () => {
  const app = WebRouter.fromManifest({
    routes: [
      {
        pathname: '/:lang?/',
        module: {
          handler: () => new Response('Home'),
        },
      },
      {
        pathname: '/:lang?/a/',
        module: {
          handler: () => new Response('a'),
        },
      },
      {
        pathname: '/:lang?/b/',
        module: {
          handler: () => new Response('b'),
        },
      },
    ],
  });

  test('GET http://localhost/ is ok', async () => {
    const res = await app.request('http://localhost/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Home');
  });

  test('POST http://localhost/a/ is ok', async () => {
    const res = await app.request('http://localhost/a/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Home');
  });

  test('POST http://localhost/b/ is ok', async () => {
    const res = await app.request('http://localhost/b/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Home');
  });
});

describe('Create route context', () => {
  test('Generate default context', (done) => {
    const createTestRoute = (
      callback: (context: RouteHandlerContext) => void
    ) => {
      const app = WebRouter.fromManifest({
        routes: [
          {
            pathname: '/test',
            module: {
              render: () => 'Hello',
            },
          },
        ],
        middlewares: [
          {
            pathname: '/test',
            module: {
              handler(context, next) {
                callback(context as RouteHandlerContext);
                return next();
              },
            },
          },
        ],
      });

      return app.request('http://localhost/test');
    };

    let context: RouteHandlerContext;
    Promise.resolve(
      createTestRoute((ctx) => {
        context = ctx;
      })
    ).then(() => {
      expect(context.data).toEqual({});
      expect(context.error).toBeUndefined();
      expect(context.meta).toBeDefined();
      expect(context.module).toBeDefined();
      expect(context.params).toEqual({});
      expect(context.pathname).toBe('/test');
      expect(context.render).toBeDefined();
      expect(context.renderOptions).toBeDefined();
      expect(context.request).toBeDefined();
      expect(context.state).toBeDefined();
      done();
    });
  });

  test('Modules that do not export `render` should not generate full context', (done) => {
    const createTestRoute = (
      callback: (context: RouteHandlerContext) => void
    ) => {
      const app = WebRouter.fromManifest({
        routes: [
          {
            pathname: '/test',
            module: {
              handler: () => new Response('Hello'),
            },
          },
        ],
        middlewares: [
          {
            pathname: '/test',
            module: {
              handler(context, next) {
                callback(context as RouteHandlerContext);
                return next();
              },
            },
          },
        ],
      });

      return app.request('http://localhost/test');
    };

    let context: RouteHandlerContext;
    Promise.resolve(
      createTestRoute((ctx) => {
        context = ctx;
      })
    ).then(() => {
      expect(context.data).toBeUndefined();
      expect(context.error).toBeUndefined();
      expect(context.meta).toBeUndefined();
      expect(context.render).toBeUndefined();
      expect(context.renderOptions).toBeUndefined();

      expect(context.module).toBeDefined();
      expect(context.params).toEqual({});
      expect(context.pathname).toBe('/test');
      expect(context.request).toBeDefined();
      expect(context.state).toBeDefined();
      done();
    });
  });
});

describe('Error handling', () => {
  const createTestRoute = (
    routeModule: RouteModule,
    onFallback: OnFallback
  ) => {
    const app = WebRouter.fromManifest(
      {
        routes: [
          {
            pathname: '/test',
            module: routeModule,
          },
        ],
      },
      {
        onFallback,
      }
    );

    return app.request('http://localhost/test');
  };

  test('Exceptions should be caught', (done) => {
    let error: RouteError;
    const message = `Error:500`;
    const status = 500;
    const statusText = 'Internal Server Error';
    Promise.resolve(
      createTestRoute(
        {
          handler() {
            throw new Error(message);
          },
        },
        (e, context) => {
          error = e;
        }
      )
    ).then(async (res) => {
      if (!error) {
        done(new Error(`Error handler not working.`));
      }

      expect(error.message).toBe(message);
      expect(res.status).toBe(status);
      expect(res.statusText).toBe(statusText);
      done();
    });
  });

  test('Throws a `Response` as an HTTP error', (done) => {
    let error: RouteError;
    const message = `Error:404`;
    const status = 404;
    const statusText = 'Not Found';
    Promise.resolve(
      createTestRoute(
        {
          handler() {
            throw new Response(message, {
              status,
              statusText,
            });
          },
        },
        (e, context) => {
          error = e;
        }
      )
    ).then(async (res) => {
      if (!error) {
        done(new Error(`Error handler not working.`));
      }

      const text = await res.text();
      expect(error.message).toBe(message);
      expect(error.status).toBe(status);
      expect(error.statusText).toBe(statusText);
      expect(res.status).toBe(status);
      expect(res.statusText).toBe(statusText);
      expect(text).toEqual(expect.stringContaining(message));
      done();
    });
  });

  test('Malformed errors converted to strings as HTTP error messages', (done) => {
    let error: RouteError;
    const message = `Error:500`;
    const status = 500;
    const statusText = 'Internal Server Error';
    Promise.resolve(
      createTestRoute(
        {
          handler() {
            throw message;
          },
        },
        (e, context) => {
          error = e;
        }
      )
    ).then(async (res) => {
      if (!error) {
        done(new Error(`Error handler not working.`));
      }

      const text = await res.text();
      expect(error.message).toBe(message);
      expect(error.status).toBe(status);
      expect(res.status).toBe(status);
      expect(res.statusText).toBe(statusText);
      expect(text).toEqual(expect.stringContaining(message));
      done();
    });
  });
});

describe('Change members of context', () => {
  test('Default options should be read-only', async () => {
    const defaultMeta = {
      lang: 'en',
      meta: [
        {
          name: 'test',
          content: 'defaultMeta',
        },
      ],
    };
    const defaultRenderOptions = {
      react: {
        allReady: false,
      },
    };
    const app = WebRouter.fromManifest(
      {
        routes: [
          {
            pathname: '/test',
            module: {
              async handler(context) {
                if (context.meta?.meta?.[0]) {
                  context.meta.meta[0].content = 'changed';
                }
                // @ts-ignore
                if (context.renderOptions.react) {
                  // @ts-ignore
                  context.renderOptions.react.allReady = true;
                }
                return new Response('Hello');
              },
              async render() {
                return '--/--';
              },
            },
          },
        ],
      },
      {
        defaultMeta,
        defaultRenderOptions: defaultRenderOptions as RouteRenderOptions,
      }
    );

    const res = await app.request('http://localhost/test');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello');
    expect(defaultMeta.meta[0].content).toBe('defaultMeta');
    expect(defaultRenderOptions.react?.allReady).toBe(false);
  });
});
