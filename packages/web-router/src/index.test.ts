import type {
  HTTPException,
  RouteContext,
  RouteModule,
  RouteRenderOptions,
} from './';
import WebRouter from './';

describe('basic', () => {
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
    const res = await app.dispatch('http://localhost/hello');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('get hello');
  });

  test('POST http://localhost/hello is ok', async () => {
    const res = await app.dispatch('http://localhost/hello', {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('post hello');
  });
});

describe('multiple identical routes', () => {
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
    const res = await app.dispatch('http://localhost/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Home');
  });

  test('POST http://localhost/a/ is ok', async () => {
    const res = await app.dispatch('http://localhost/a/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Home');
  });

  test('POST http://localhost/b/ is ok', async () => {
    const res = await app.dispatch('http://localhost/b/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Home');
  });
});

describe('create route context', () => {
  test('generate default context', async () => {
    const createTestRoute = (): Promise<RouteContext> => {
      return new Promise((resolve) => {
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
                  resolve(context as RouteContext);
                  return next();
                },
              },
            },
          ],
        });

        app.dispatch('http://localhost/test');
      });
    };

    const context = await createTestRoute();

    expect(context.data).toBeUndefined();
    expect(context.error).toBeUndefined();
    expect(context.meta).toBeDefined();
    expect(context.module).toBeDefined();
    expect(context.params).toEqual({});
    expect(context.pathname).toBe('/test');
    expect(context.render).toBeDefined();
    expect(context.renderOptions).toBeDefined();
    expect(context.request).toBeDefined();
    expect(context.state).toBeDefined();
  });

  test('modules that do not export `render` should not generate full context', async () => {
    const createTestRoute = (): Promise<RouteContext> => {
      return new Promise((resolve) => {
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
                  resolve(context as RouteContext);
                  return next();
                },
              },
            },
          ],
        });

        app.dispatch('http://localhost/test');
      });
    };

    const context = await createTestRoute();

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
  });
});

describe('error handling', () => {
  const createTestRoute = async (
    routeModule: RouteModule
  ): Promise<{ response: Response; error?: HTTPException }> => {
    let capturedError: HTTPException | undefined;

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
        onFallback: (e, context) => {
          capturedError = e;
        },
      }
    );

    const response = await app.dispatch('http://localhost/test');
    return { response, error: capturedError };
  };

  test('exceptions should be caught', async () => {
    const message = `Error:500`;
    const status = 500;
    const statusText = 'Internal Server Error';

    const { response: res, error } = await createTestRoute({
      handler() {
        throw new Error(message);
      },
    });

    if (!error) {
      throw new Error(`Error handler not working.`);
    }

    expect(error.message).toBe(message);
    expect(res.status).toBe(status);
    expect(res.statusText).toBe(statusText);
  });

  test('throws a `Response` as an HTTP error', async () => {
    const message = `Error:404`;
    const status = 404;
    const statusText = 'Not Found';

    const { response: res, error } = await createTestRoute({
      handler() {
        throw new Response(message, {
          status,
          statusText,
        });
      },
    });

    if (!error) {
      throw new Error(`Error handler not working.`);
    }

    const text = await res.text();
    expect(error.message).toBe(message);
    expect(error.status).toBe(status);
    expect(error.statusText).toBe(statusText);
    expect(res.status).toBe(status);
    expect(res.statusText).toBe(statusText);
    expect(text).toEqual(expect.stringContaining(message));
  });

  test('malformed errors converted to strings as HTTP error messages', async () => {
    const message = `Error:500`;
    const status = 500;
    const statusText = 'Internal Server Error';

    const { response: res, error } = await createTestRoute({
      handler() {
        throw message;
      },
    });

    if (!error) {
      throw new Error(`Error handler not working.`);
    }

    const text = await res.text();
    expect(error.message).toBe('Unknown error: ' + message);
    expect(error.status).toBe(status);
    expect(res.status).toBe(status);
    expect(res.statusText).toBe(statusText);
    expect(text).toEqual(expect.stringContaining(message));
  });
});

describe('change members of context', () => {
  test('default options should be read-only', async () => {
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

    const res = await app.dispatch('http://localhost/test');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello');
    expect(defaultMeta.meta[0].content).toBe('defaultMeta');
    expect(defaultRenderOptions.react?.allReady).toBe(false);
  });
});

describe('background tasks', () => {
  let backgroundTaskRunning = false;
  const backgroundTask = () =>
    new Promise((resolve) =>
      setTimeout(() => {
        backgroundTaskRunning = true;
        resolve(undefined);
      }, 100)
    );
  const app = WebRouter.fromManifest({
    routes: [
      {
        pathname: '/hello',
        module: {
          handler: {
            GET(context) {
              context.waitUntil(backgroundTask());
              return new Response('get hello');
            },
          },
        },
      },
    ],
  });

  test('background tasks should be performed', async () => {
    const res = await app.dispatch(
      'http://localhost/hello',
      undefined,
      undefined,
      {
        waitUntil: () => {},
        passThroughOnException: () => {},
      }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('get hello');
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(backgroundTaskRunning).toBe(true);
  });
});

describe('html method', () => {
  test('html should work with simple data', async () => {
    const testData = { message: 'Hello, World!' };

    const app = WebRouter.fromManifest({
      routes: [
        {
          pathname: '/test',
          module: {
            handler: {
              async GET(ctx: RouteContext) {
                return ctx.html(testData);
              },
            },
            render: async (_component: unknown, props: unknown) => {
              return `<div>Data: ${JSON.stringify((props as { data: unknown }).data)}</div>`;
            },
            default: () => null,
          },
        },
      ],
    });

    const response = await app.dispatch('http://localhost/test');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain(JSON.stringify(testData));
  });

  test('html should work with meta options', async () => {
    const testData = { message: 'Hello, World!' };
    const customTitle = 'Custom Page Title';

    const app = WebRouter.fromManifest({
      routes: [
        {
          pathname: '/test',
          module: {
            handler: {
              async GET(ctx: RouteContext) {
                return ctx.html(testData, {
                  meta: {
                    title: customTitle,
                  },
                });
              },
            },
            render: async (_component: unknown, props: unknown) => {
              return `<div>Title: ${(props as { meta?: { title?: string } }).meta?.title}</div>`;
            },
            default: () => null,
          },
        },
      ],
    });

    const response = await app.dispatch('http://localhost/test');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain(customTitle);
  });

  test('html should work with response options', async () => {
    const testData = { message: 'Hello, World!' };

    const app = WebRouter.fromManifest({
      routes: [
        {
          pathname: '/test',
          module: {
            handler: {
              async GET(ctx: RouteContext) {
                return ctx.html(testData, {
                  status: 201,
                  headers: {
                    'X-Custom-Header': 'test-value',
                  },
                });
              },
            },
            render: async (_component: unknown, props: unknown) => {
              return `<div>Data: ${JSON.stringify((props as { data: unknown }).data)}</div>`;
            },
            default: () => null,
          },
        },
      ],
    });

    const response = await app.dispatch('http://localhost/test');

    expect(response.status).toBe(201);
    expect(response.headers.get('X-Custom-Header')).toBe('test-value');
  });

  test('html should support progressive rendering', async () => {
    const testData = { message: 'Hello, World!' };

    const app = WebRouter.fromManifest({
      routes: [
        {
          pathname: '/test',
          module: {
            handler: {
              async GET(ctx: RouteContext) {
                return ctx.html(testData, {
                  renderer: {
                    progressive: true,
                  },
                });
              },
            },
            render: async (_component: unknown, props: unknown) => {
              return `<div>Progressive: ${JSON.stringify((props as { data: unknown }).data)}</div>`;
            },
            default: () => null,
          },
        },
      ],
    });

    const response = await app.dispatch('http://localhost/test');

    expect(response.status).toBe(200);
    expect(response.headers.get('x-accel-buffering')).toBe('no');
  });
});
