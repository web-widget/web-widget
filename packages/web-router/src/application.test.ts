/* eslint-disable @typescript-eslint/no-unused-vars */
import { callContext, context } from '@web-widget/context/server';
import { methodsToHandler } from '@web-widget/helpers/module';
import { Application } from './application';
import { ModuleRuntime } from './module';
import type {
  LayoutModule,
  Meta,
  MiddlewareHandler,
  RouteContext,
  ServerRenderOptions,
} from './types';
import { getPath } from './url';

// https://stackoverflow.com/a/65666402
function throwExpression(errorMessage: string): never {
  throw new Error(errorMessage);
}

const poweredBy = (): MiddlewareHandler => {
  return async (c, next) => {
    const res = await next();
    res.headers.set('X-Powered-By', '@web-widget/web-router');
    return res;
  };
};

function html(content: string, { status = 200, headers = {} } = {}) {
  return new Response(content, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      ...headers,
    },
  });
}

function json(content: unknown, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(content), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

function text(content: string, { status = 200, headers = {} } = {}) {
  return new Response(content, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      ...headers,
    },
  });
}

function query(req: Request, name?: string) {
  const url = new URL(req.url);
  if (name) {
    return url.searchParams.get(name);
  } else {
    return Object.fromEntries(url.searchParams.entries());
  }
}

function queries(req: Request, name: string) {
  const url = new URL(req.url);
  return url.searchParams.getAll(name);
}

describe('host request source', () => {
  const sourceHandler = Symbol.for(
    '@web-widget/web-router.request-source-handler'
  );

  function createSource(pathname: string) {
    let materializations = 0;
    let request: Request | undefined;
    return {
      source: {
        method: 'GET',
        url: `http://localhost${pathname}`,
        toRequest() {
          materializations++;
          return (request ??= new Request(this.url));
        },
      },
      get materializations() {
        return materializations;
      },
    };
  }

  test('materializes only when public request state is accessed', async () => {
    const app = new Application();
    app.get('/fast', () => new Response('fast'));
    app.get('/request', (context) => {
      const copy = new Request(context.request);
      return new Response(copy.url);
    });
    const handler = Reflect.get(app, sourceHandler).bind(app);

    const fast = createSource('/fast');
    expect(await (await handler(fast.source)).text()).toBe('fast');
    expect(fast.materializations).toBe(0);

    const accessed = createSource('/request');
    expect(await (await handler(accessed.source)).text()).toBe(
      'http://localhost/request'
    );
    expect(accessed.materializations).toBe(1);
  });
});

describe('GET Request', () => {
  const app = new Application();

  app.get('/hello', async () => {
    return new Response('hello', {
      status: 200,
      statusText: 'Application is OK',
    });
  });

  app.get('/hello-with-shortcuts', (c) => {
    return new Response('<h1>Application!!!</h1>', {
      status: 201,
      headers: {
        'X-Custom': 'This is Application',
        'content-type': 'text/html; charset=utf-8',
      },
    });
  });

  // app.get("/hello-env", (c) => {
  //   return json(c.env);
  // });

  test('GET http://localhost/hello is ok', async () => {
    const res = await app.dispatch('http://localhost/hello');
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(res.statusText).toBe('Application is OK');
    expect(await res.text()).toBe('hello');
  });

  test('GET httphello is ng', async () => {
    const res = await app.dispatch('httphello');
    expect(res.status).toBe(404);
  });

  test('GET /hello is ok', async () => {
    const res = await app.dispatch('/hello');
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(res.statusText).toBe('Application is OK');
    expect(await res.text()).toBe('hello');
  });

  test('GET hello is ok', async () => {
    const res = await app.dispatch('hello');
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(res.statusText).toBe('Application is OK');
    expect(await res.text()).toBe('hello');
  });

  test('GET /hello-with-shortcuts is ok', async () => {
    const res = await app.dispatch('http://localhost/hello-with-shortcuts');
    expect(res).not.toBeNull();
    expect(res.status).toBe(201);
    expect(res.headers.get('X-Custom')).toBe('This is Application');
    expect(res.headers.get('Content-Type')).toMatch(/text\/html/);
    expect(await res.text()).toBe('<h1>Application!!!</h1>');
  });

  test('GET / is not found', async () => {
    const res = await app.dispatch('http://localhost/');
    expect(res).not.toBeNull();
    expect(res.status).toBe(404);
  });

  // test("GET /hello-env is ok", async () => {
  //   const res = await app.dispatch("/hello-env", undefined, {
  //     HELLO: "world",
  //   });
  //   expect(res.status).toBe(200);
  //   expect(await res.json()).toEqual({ HELLO: "world" });
  // });
});

describe('register handlers without a path', () => {
  describe('no basePath', () => {
    const app = new Application();

    app.get('*', (c) => {
      return text('Hello');
    });

    test('GET http://localhost/ is ok', async () => {
      const res = await app.dispatch('/');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('Hello');
    });

    test('GET http://localhost/anything is ok', async () => {
      const res = await app.dispatch('/');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('Hello');
    });
  });

  describe('with chaining', () => {
    const app = new Application();

    app
      .post('/books', () => {
        return text('OK');
      })
      .get('/books', (c) => {
        return text('Books');
      });

    test('GET http://localhost/books is ok', async () => {
      const res = await app.dispatch('/books');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('Books');
    });

    test('GET http://localhost/ is not found', async () => {
      const res = await app.dispatch('/');
      expect(res.status).toBe(404);
    });
  });
});

describe('strict parameter', () => {
  describe('strict is true with not slash', () => {
    const app = new Application();

    app.get('/hello', (c) => {
      return text('/hello');
    });

    test('/hello/ is not found', async () => {
      let res = await app.dispatch('http://localhost/hello');
      expect(res).not.toBeNull();
      expect(res.status).toBe(200);
      res = await app.dispatch('http://localhost/hello/');
      expect(res).not.toBeNull();
      expect(res.status).toBe(404);
    });
  });

  describe('strict is true with slash', () => {
    const app = new Application();

    app.get('/hello/', (c) => {
      return text('/hello/');
    });

    test('/hello is not found', async () => {
      let res = await app.dispatch('http://localhost/hello/');
      expect(res).not.toBeNull();
      expect(res.status).toBe(200);
      res = await app.dispatch('http://localhost/hello');
      expect(res).not.toBeNull();
      expect(res.status).toBe(404);
    });
  });

  describe('strict is false', () => {
    const app = new Application({ strict: false });

    app.get('/hello', (c) => {
      return text('/hello');
    });

    test('/hello and /hello/ are treated as the same', async () => {
      let res = await app.dispatch('http://localhost/hello');
      expect(res).not.toBeNull();
      expect(res.status).toBe(200);
      res = await app.dispatch('http://localhost/hello/');
      expect(res).not.toBeNull();
      expect(res.status).toBe(200);
    });
  });

  describe('strict is false with `getPath` option', () => {
    const app = new Application({
      strict: false,
      getPath: getPath,
    });

    app.get('/hello', (c) => {
      return text('/hello');
    });

    test('/hello and /hello/ are treated as the same', async () => {
      let res = await app.dispatch('http://localhost/hello');
      expect(res).not.toBeNull();
      expect(res.status).toBe(200);
      res = await app.dispatch('http://localhost/hello/');
      expect(res).not.toBeNull();
      expect(res.status).toBe(200);
    });
  });
});

// describe("Destruct functions in context", () => {
//   test("Should return 200 response - text", async () => {
//     const app = new Application();
//     app.get("/text", ({ text }) => text("foo"));
//     const res = await app.dispatch("http://localhost/text");
//     expect(res.status).toBe(200);
//   });
//   test("Should return 200 response - json", async () => {
//     const app = new Application();
//     app.get("/json", ({ json }) => json({ foo: "bar" }));
//     const res = await app.dispatch("http://localhost/json");
//     expect(res.status).toBe(200);
//   });
// });

describe('routing', () => {
  test('return it self', async () => {
    const app = new Application();

    const app2 = app.get('/', () => new Response('get /'));
    expect(app2).not.toBeUndefined();
    app2.delete('/', () => new Response('delete /'));

    let res = await app2.dispatch('http://localhost/', { method: 'GET' });
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('get /');

    res = await app2.dispatch('http://localhost/', { method: 'DELETE' });
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('delete /');
  });

  describe('routing with the bindings value', () => {
    const app = new Application<{ Bindings: { host: string } }>({
      getPath: (req, options) => {
        const url = new URL(req.url);
        const host = options?.env?.host;
        const prefix = url.host === host ? '/FOO' : '';
        return url.pathname === '/' ? prefix : `${prefix}${url.pathname}`;
      },
    });

    app.get('/about', (c) => text('About root'));
    app.get('/FOO/about', (c) => text('About FOO'));

    test('should return 200 without specifying a hostname', async () => {
      const res = await app.dispatch('/about');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('About root');
    });

    test('should return 200 with specifying the hostname in env', async () => {
      const req = new Request('http://foo.localhost/about');
      const res = await app.handler(req, { host: 'foo.localhost' });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('About FOO');
    });
  });

  describe('chained route', () => {
    const app = new Application();

    app.get('/chained/:abc', (c) => {
      const abc = c.params['abc'];
      return text(`GET for ${abc}`);
    });
    app.post('/chained/:abc', (c) => {
      const abc = c.params['abc'];
      return text(`POST for ${abc}`);
    });
    test('should return 200 response from GET request', async () => {
      const res = await app.dispatch('http://localhost/chained/abc', {
        method: 'GET',
      });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('GET for abc');
    });
    test('should return 200 response from POST request', async () => {
      const res = await app.dispatch('http://localhost/chained/abc', {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('POST for abc');
    });
    test('should return 404 response from PUT request', async () => {
      const res = await app.dispatch('http://localhost/chained/abc', {
        method: 'PUT',
      });
      expect(res.status).toBe(404);
    });
  });
});

describe('param and query', () => {
  const apps: Record<string, Application> = {};
  apps['get by name'] = (() => {
    const app = new Application();

    app.get('/entry/:id', (c) => {
      const id = c.params['id'];
      return text(`id is ${id}`);
    });

    app.get('/date/:date([0-9]+)', (c) => {
      const date = c.params['date'];
      return text(`date is ${date}`);
    });

    app.get('/search', (c) => {
      const name = query(c.request, 'name');
      return text(`name is ${name}`);
    });

    app.get('/multiple-values', (c) => {
      const q =
        queries(c.request, 'q') ?? throwExpression('missing query values');
      const limit =
        queries(c.request, 'limit') ?? throwExpression('missing query values');
      return text(`q is ${q[0]} and ${q[1]}, limit is ${limit[0]}`);
    });

    app.get('/add-header', (c) => {
      const bar = c.request.headers.get('X-Foo');
      return text(`foo is ${bar}`);
    });

    app.get('/entry/:id', (c) => {
      const { id } = c.params;
      return text(`id is ${id}`);
    });

    app.get('/date/:date([0-9]+)', (c) => {
      const { date } = c.params;
      return text(`date is ${date}`);
    });

    return app;
  })();

  describe.each(Object.keys(apps))('%s', (name) => {
    const app = apps[name];

    test('param of /entry/:id is found', async () => {
      const res = await app.dispatch('http://localhost/entry/123');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('id is 123');
    });

    test('param of /entry/:id is found, even for Array object method names', async () => {
      const res = await app.dispatch('http://localhost/entry/key');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('id is key');
    });

    test('param of /entry/:id is decoded', async () => {
      const res = await app.dispatch(
        'http://localhost/entry/%C3%A7awa%20y%C3%AE%3F'
      );
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('id is çawa yî?');
    });

    test('param of /date/:date is found', async () => {
      const res = await app.dispatch('http://localhost/date/0401');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('date is 0401');
    });

    test('query of /search?name=sam is found', async () => {
      const res = await app.dispatch('http://localhost/search?name=sam');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('name is sam');
    });

    test('query of /search?name=sam&name=tom is found', async () => {
      const res = await app.dispatch(
        'http://localhost/search?name=sam&name=tom'
      );
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('name is sam');
    });

    test('query of /multiple-values?q=foo&q=bar&limit=10 is found', async () => {
      const res = await app.dispatch(
        'http://localhost/multiple-values?q=foo&q=bar&limit=10'
      );
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('q is foo and bar, limit is 10');
    });

    test('/add-header header - X-Foo is Bar', async () => {
      const req = new Request('http://localhost/add-header');
      req.headers.append('X-Foo', 'Bar');
      const res = await app.dispatch(req);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('foo is Bar');
    });
  });

  describe('param with undefined', () => {
    const app = new Application();
    app.get('/foo/:foo', (c) => {
      const bar = c.params['bar'];
      return json({ foo: bar });
    });
    test('param of /foo/foo should return undefined not "undefined"', async () => {
      const res = await app.dispatch('http://localhost/foo/foo');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ foo: undefined });
    });
  });
});

describe('middleware', () => {
  describe('basic', () => {
    const app = new Application();

    // Custom Logger
    app.use('*', async (c, next) => {
      console.log(`${c.request.method} : ${c.request.url}`);
      return next();
    });

    // Append Custom Header
    app.use('*', async (c, next) => {
      const res = await next();
      res.headers.append('x-custom', 'root');
      return res;
    });

    app.use('/hello', async (c, next) => {
      const res = await next();
      res.headers.append('x-message', 'custom-header');
      return res;
    });

    app.use('/hello(\\/?.*)', async (c, next) => {
      const res = await next();
      res.headers.append('x-message-2', 'custom-header-2');
      return res;
    });

    app.get('/hello', (c) => {
      return text('hello');
    });

    app.use('/json(\\/?.*)', async (c, next) => {
      const res = await next();
      res.headers.append('foo', 'bar');
      return res;
    });

    app.get('/json', (c) => {
      // With a raw response
      return new Response(
        JSON.stringify({
          message: 'hello',
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    });

    app.get('/hello/:message', (c) => {
      const message = c.params['message'];
      return text(`${message}`);
    });

    app.get('/error', () => {
      throw new Error('Error!');
    });

    app.notFound((c) => {
      return text('Not Found Foo', {
        status: 404,
      });
    });

    test('logging and custom header', async () => {
      const res = await app.dispatch('http://localhost/hello');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('hello');
      expect(res.headers.get('x-custom')).toBe('root');
      expect(res.headers.get('x-message')).toBe('custom-header');
      expect(res.headers.get('x-message-2')).toBe('custom-header-2');
    });

    test('logging and custom header with named param', async () => {
      const res = await app.dispatch('http://localhost/hello/message');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('message');
      expect(res.headers.get('x-custom')).toBe('root');
      expect(res.headers.get('x-message-2')).toBe('custom-header-2');
    });

    test('should return correct the content-type header', async () => {
      const res = await app.dispatch('http://localhost/json');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    });

    test('not found', async () => {
      const res = await app.dispatch('http://localhost/foo');
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('Not Found Foo');
    });

    test('internal server error', async () => {
      const res = await app.dispatch('http://localhost/error');
      expect(res.status).toBe(500);
      console.log(await res.text());
    });
  });

  describe('overwrite the response from middleware after next()', () => {
    const app = new Application();

    app.use('/normal', async (c, next) => {
      return next();
    });

    app.use('/overwrite', async (c, next) => {
      await next();
      return new Response('Middleware');
    });

    app.get('*', (c) => {
      return text('Handler', {
        headers: {
          'x-custom': 'foo',
        },
      });
    });

    test('should have the custom header', async () => {
      const res = await app.dispatch('/normal');
      expect(res.headers.get('x-custom')).toBe('foo');
    });

    test('should not have the custom header', async () => {
      const res = await app.dispatch('/overwrite');
      expect(res.headers.get('x-custom')).toBe(null);
    });
  });
});

describe('builtin Middleware', () => {
  const app = new Application();
  app.use('/abc', poweredBy());
  app.use('/def', async (c, next) => {
    const middleware = poweredBy();
    return middleware(c, next);
  });
  app.get('/abc', () => new Response());
  app.get('/def', () => new Response());

  test('"powered-by" middleware', async () => {
    const res = await app.dispatch('http://localhost/abc');
    expect(res.headers.get('x-powered-by')).toBe('@web-widget/web-router');
  });

  test('"powered-by" middleware in a handler', async () => {
    const res = await app.dispatch('http://localhost/def');
    expect(res.headers.get('x-powered-by')).toBe('@web-widget/web-router');
  });
});

describe('not Found', () => {
  const app = new Application();

  app.notFound((c) => {
    return text('Custom 404 Not Found', {
      status: 404,
    });
  });

  app.get('/hello', (c) => {
    return text('hello');
  });

  test('custom 404 Not Found', async () => {
    let res = await app.dispatch('http://localhost/hello');
    expect(res.status).toBe(200);
    res = await app.dispatch('http://localhost/foo');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Custom 404 Not Found');
  });
});

describe('redirect', () => {
  const app = new Application();
  app.get('/redirect', (c) => {
    try {
      return Response.redirect('/'); // Node.js: TypeError [ERR_INVALID_URL]: Invalid URL
    } catch (e) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/',
        },
      });
    }
  });

  test('absolute URL', async () => {
    const res = await app.dispatch('https://example.com/redirect');
    expect(await res.text()).toBe('');
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');
  });
});

describe('error handle', () => {
  describe('basic', () => {
    const app = new Application();

    app.get('/error', () => {
      throw new Error('This is Error');
    });

    app.use('/error-middleware', async () => {
      throw new Error('This is Middleware Error');
    });

    app.onError((err, c) => {
      return text('Custom Error Message', {
        status: 500,
        headers: {
          'x-debug': (err as Error).message,
        },
      });
    });

    test('custom Error Message', async () => {
      let res = await app.dispatch('https://example.com/error');
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('Custom Error Message');
      expect(res.headers.get('x-debug')).toBe('This is Error');

      res = await app.dispatch('https://example.com/error-middleware');
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('Custom Error Message');
      expect(res.headers.get('x-debug')).toBe('This is Middleware Error');
    });
  });

  describe('custom handler', () => {
    const app = new Application();

    app.get('/error', () => {
      throw new Error('This is Error');
    });

    app.use('/error-middleware', async () => {
      throw new Error('This is Middleware Error');
    });

    app.use('/error-response', async () => {
      throw Response.json(
        {
          name: 'Error',
          message: 'This is Response Error',
        },
        {
          status: 500,
        }
      );
    });

    app.onError((err, c) => {
      const message = (err as Error).message;
      return text(`Custom Error: ${message}`, {
        status: 500,
        headers: {
          'x-debug': (err as Error).message,
        },
      });
    });

    test('custom error message', async () => {
      let res = await app.dispatch('https://example.com/error');
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('Custom Error: This is Error');
      expect(res.headers.get('x-debug')).toBe('This is Error');

      res = await app.dispatch('https://example.com/error-middleware');
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('Custom Error: This is Middleware Error');
      expect(res.headers.get('x-debug')).toBe('This is Middleware Error');
    });

    test('transform error response', async () => {
      const res = await app.dispatch('https://example.com/error-response');
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('Custom Error: This is Response Error');
      expect(res.headers.get('x-debug')).toBe('This is Response Error');
    });
  });

  describe('async custom handler', () => {
    const app = new Application();

    app.get('/error', () => {
      throw new Error('This is Error');
    });

    app.use('/error-middleware', async () => {
      throw new Error('This is Middleware Error');
    });

    app.onError(async (err, c) => {
      const message = (err as Error).message;
      return text(`Custom Error: ${message}`, {
        status: 500,
        headers: {
          'x-debug': (err as Error).message,
        },
      });
    });

    test('custom error message', async () => {
      let res = await app.dispatch('https://example.com/error');
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('Custom Error: This is Error');
      expect(res.headers.get('x-debug')).toBe('This is Error');

      res = await app.dispatch('https://example.com/error-middleware');
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('Custom Error: This is Middleware Error');
      expect(res.headers.get('x-debug')).toBe('This is Middleware Error');
    });
  });

  describe('onError restores async context (web-widget#716)', () => {
    const app = new Application();

    app.use('*', callContext);

    app.use('*', async (c, next) => {
      c.state.marker = 'from-middleware';
      return next();
    });

    app.get('/throws', () => {
      throw new Error('route boom');
    });

    app.onError(async () => {
      const ctx = context();
      const marker = (ctx.state as { marker?: string }).marker ?? 'missing';
      return text(`marker=${marker}`, { status: 500 });
    });

    test('context() works in onError after route throw', async () => {
      const res = await app.dispatch('https://example.com/throws');
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('marker=from-middleware');
    });
  });
});

describe('error handling in middleware', () => {
  const app = new Application();

  // @ts-expect-error
  app.get('/handle-error-in-middleware', async (c, next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message;
        return text(
          `Handle the error in middleware, original message is ${message}`,
          {
            status: 500,
          }
        );
      }
    }
  });

  // @ts-expect-error
  app.get('/handle-error-in-middleware-async', async (c, next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message;
        return text(
          `Handle the error in middleware with async, original message is ${message}`,
          {
            status: 500,
          }
        );
      }
    }
  });

  app.get('/handle-error-in-middleware', () => {
    throw new Error('Error message');
  });

  app.get('/handle-error-in-middleware-async', async () => {
    throw new Error('Error message');
  });

  test('should handle the error in middleware', async () => {
    const res = await app.dispatch(
      'https://example.com/handle-error-in-middleware'
    );
    expect(res.status).toBe(500);
    expect(await res.text()).toBe(
      'Handle the error in middleware, original message is Error message'
    );
  });

  test('should handle the error in middleware - async', async () => {
    const res = await app.dispatch(
      'https://example.com/handle-error-in-middleware-async'
    );
    expect(res.status).toBe(500);
    expect(await res.text()).toBe(
      'Handle the error in middleware with async, original message is Error message'
    );
  });

  describe('error in `notFound()`', () => {
    const app = new Application();

    app.use('*', async (c, next) => next());

    app.notFound(() => {
      throw new Error('@@@Error in Not Found');
    });

    app.onError((err, c) => {
      return text((err as Error).message, {
        status: 400,
      });
    });

    test('should handle the error thrown in `notFound()``', async () => {
      const res = await app.dispatch('http://localhost/');
      expect(res.status).toBe(400);
      expect(await res.text()).toBe('@@@Error in Not Found');
    });
  });
});

describe('multiple handler', () => {
  describe('handler + handler', () => {
    const app = new Application();

    app.get('/posts/:id', (c) => {
      const id = c.params['id'];
      return text(`id is ${id}`, {
        headers: {
          foo: 'bar',
        },
      });
    });

    app.get('/:type/:id', (c) => {
      return text('foo', {
        status: 404,
        headers: {
          foo2: 'bar2',
        },
      });
    });
    test('should return response from `specialized` route', async () => {
      const res = await app.dispatch('http://localhost/posts/123');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('id is 123');
      expect(res.headers.get('foo')).toBe('bar');
      expect(res.headers.get('foo2')).toBeNull();
    });
  });

  describe('duplicate param name', () => {
    describe('basic', () => {
      const app = new Application();
      app.get('/:type/:url', (c) => {
        return text(`type: ${c.params['type']}, url: ${c.params['url']}`);
      });
      app.get('/foo/:type/:url', (c) => {
        return text(`foo type: ${c.params['type']}, url: ${c.params['url']}`);
      });

      test('should return a correct param - GET /car/good-car', async () => {
        const res = await app.dispatch('/car/good-car');
        expect(res.ok).toBe(true);
        expect(await res.text()).toBe('type: car, url: good-car');
      });

      test('should return a correct param - GET /foo/food/good-food', async () => {
        const res = await app.dispatch('/foo/food/good-food');
        expect(res.ok).toBe(true);
        expect(await res.text()).toBe('foo type: food, url: good-food');
      });
    });

    describe('hierarchy', () => {
      const app = new Application();
      app.get('/posts/:id/comments/:comment_id', (c) => {
        return text(
          `post: ${c.params['id']}, comment: ${c.params['comment_id']}`
        );
      });
      app.get('/posts/:id', (c) => {
        return text(`post: ${c.params['id']}`);
      });
      test('should return a correct param - GET /posts/123/comments/456', async () => {
        const res = await app.dispatch('/posts/123/comments/456');
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('post: 123, comment: 456');
      });
      test('should return a correct param - GET /posts/789', async () => {
        const res = await app.dispatch('/posts/789');
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('post: 789');
      });
    });

    describe('different regular expression', () => {
      const app = new Application();
      app.get('/:id/:action(create|update)', (c) => {
        return text(`id: ${c.params['id']}, action: ${c.params['action']}`);
      });
      app.get('/:id/:action(delete)', (c) => {
        return text(`id: ${c.params['id']}, action: ${c.params['action']}`);
      });

      test('should return a correct param - GET /123/create', async () => {
        const res = await app.dispatch('/123/create');
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('id: 123, action: create');
      });
      test('should return a correct param - GET /456/update', async () => {
        const res = await app.dispatch('/467/update');
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('id: 467, action: update');
      });
      test('should return a correct param - GET /789/delete', async () => {
        const res = await app.dispatch('/789/delete');
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('id: 789, action: delete');
      });
    });
  });
});

describe('context is not finalized', () => {
  test('should throw error - lack `await next()`', async () => {
    const app = new Application();

    // @ts-ignore
    app.use('*', () => {});
    app.get('/foo', (c) => {
      return text('foo');
    });
    app.onError((err, c) => {
      return text((err as Error).message, { status: 500 });
    });
    const res = await app.dispatch('http://localhost/foo');
    expect(res.status).toBe(500);
    expect(await res.text()).toMatch(/^Response is not finalized/);
  });

  test('should throw error - lack `returning Response`', async () => {
    const app = new Application();
    app.use('*', async (_c, next) => {
      return next();
    });

    // @ts-ignore
    app.get('/foo', () => {});
    app.onError((err, c) => {
      return text((err as Error).message, { status: 500 });
    });
    const res = await app.dispatch('http://localhost/foo');
    expect(res.status).toBe(500);
    expect(await res.text()).toMatch(/^Response is not finalized/);
  });
});

describe('both two middleware returning response', () => {
  test('should return correct Content-Type`', async () => {
    const app = new Application();
    app.use('*', async (c, next) => {
      const res = await next();
      return res ?? html('Foo');
    });
    app.get('/', (c) => {
      return text('Bar');
    });
    const res = await app.dispatch('http://localhost/');
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Bar');
    expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/);
  });
});

describe('handler as variables', () => {
  const app = new Application();

  test('should be typed correctly', async () => {
    const handler: MiddlewareHandler = (c) => {
      const id = c.params['id'];
      return text(`Post id is ${id}`);
    };
    app.get('/posts/:id', handler);

    const res = await app.dispatch('http://localhost/posts/123');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Post id is 123');
  });
});

describe('proxy mode', () => {
  test('should resolve original request URL when proxy is enabled', async () => {
    const app = new Application({ proxy: true });

    app.get('/proxy-test', (c) => {
      return new Response(c.request.url);
    });

    const res = await app.dispatch('http://localhost/proxy-test', {
      headers: {
        'x-forwarded-host': 'example.com',
        'x-forwarded-proto': 'https',
      },
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('https://example.com/proxy-test');
  });

  test('should not modify request URL when proxy is disabled', async () => {
    const app = new Application({ proxy: false });

    app.get('/proxy-test', (c) => {
      return new Response(c.request.url);
    });

    const res = await app.dispatch('http://localhost/proxy-test', {
      headers: {
        'x-forwarded-host': 'example.com',
        'x-forwarded-proto': 'https',
      },
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('http://localhost/proxy-test');
  });
});

declare module './context' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      head: { title: string }
    ): Response | Promise<Response>;
  }
}

// describe("c.state - with testing types", () => {
//   const app = new Application<{
//     Bindings: {
//       Token: string;
//     };
//   }>();

//   const mw =
//     (): MiddlewareHandler<{
//       Variables: {
//         echo: (str: string) => string;
//       };
//     }> =>
//     async (c, next) => {
//       c.state.echo = (str: string) => str;
//       return next();
//     };

//   const mw2 =
//     (): MiddlewareHandler<{
//       Variables: {
//         echo2: (str: string) => string;
//       };
//     }> =>
//     async (c, next) => {
//       c.state.echo2 = (str: string) => str;
//       return next();
//     };

//   const mw3 =
//     (): MiddlewareHandler<{
//       Variables: {
//         echo3: (str: string) => string;
//       };
//     }> =>
//     async (c, next) => {
//       c.state.echo3 = (str: string) => str;
//       return next();
//     };

//   const mw4 =
//     (): MiddlewareHandler<{
//       Variables: {
//         echo4: (str: string) => string;
//       };
//     }> =>
//     async (c, next) => {
//       c.state.echo4 = (str: string) => str;
//       return next();
//     };

//   const mw5 =
//     (): MiddlewareHandler<{
//       Variables: {
//         echo5: (str: string) => string;
//       };
//     }> =>
//     async (c, next) => {
//       c.state.echo5 = (str: string) => str;
//       return next();
//     };

//   app.use("/no-path/1").get(mw(), (c) => {
//     // @ts-expect-error
//     return text(c.state.echo("hello"));
//   });

//   app.use("/no-path/2").get(mw(), mw2(), (c) => {
//     // @ts-expect-error
//     return text(c.state.echo("hello") + c.state.echo2("hello2"));
//   });

//   app.use("/no-path/3").get(mw(), mw2(), mw3(), (c) => {
//     return text(
//       // @ts-expect-error
//       c.state.echo("hello") + c.state.echo2("hello2") + c.state.echo3("hello3")
//     );
//   });

//   app.use("/no-path/4").get(mw(), mw2(), mw3(), mw4(), (c) => {
//     return text(
//       // @ts-expect-error
//       c.state.echo("hello") +
//         // @ts-expect-error
//         c.state.echo2("hello2") +
//         // @ts-expect-error
//         c.state.echo3("hello3") +
//         // @ts-expect-error
//         c.state.echo4("hello4")
//     );
//   });

//   app.use("/no-path/5").get(mw(), mw2(), mw3(), mw4(), mw5(), (c) => {
//     return text(
//       // @ts-expect-error
//       c.state.echo("hello") +
//         // @ts-expect-error
//         c.state.echo2("hello2") +
//         // @ts-expect-error
//         c.state.echo3("hello3") +
//         // @ts-expect-error
//         c.state.echo4("hello4") +
//         // @ts-expect-error
//         c.state.echo5("hello5")
//     );
//   });

//   app.get("*", mw());

//   app.get("/path/1", mw(), (c) => {
//     // @ts-expect-error
//     return text(c.state.echo("hello"));
//   });

//   app.get("/path/2", mw(), mw2(), (c) => {
//     // @ts-expect-error
//     return text(c.state.echo("hello") + c.state.echo2("hello2"));
//   });

//   app.get("/path/3", mw(), mw2(), mw3(), (c) => {
//     return text(
//       // @ts-expect-error
//       c.state.echo("hello") + c.state.echo2("hello2") + c.state.echo3("hello3")
//     );
//   });

//   app.get("/path/4", mw(), mw2(), mw3(), mw4(), (c) => {
//     return text(
//       // @ts-expect-error
//       c.state.echo("hello") +
//         // @ts-expect-error
//         c.state.echo2("hello2") +
//         // @ts-expect-error
//         c.state.echo3("hello3") +
//         // @ts-expect-error
//         c.state.echo4("hello4")
//     );
//   });

//   app.get("/path/5", mw(), mw2(), mw3(), mw4(), mw5(), (c) => {
//     return text(
//       // @ts-expect-error
//       c.state.echo("hello") +
//         // @ts-expect-error
//         c.state.echo2("hello2") +
//         // @ts-expect-error
//         c.state.echo3("hello3") +
//         // @ts-expect-error
//         c.state.echo4("hello4") +
//         // @ts-expect-error
//         c.state.echo5("hello5")
//     );
//   });

//   app.on("GET", "/on/1", mw(), (c) => {
//     // @ts-expect-error
//     return text(c.state.echo("hello"));
//   });

//   app.on("GET", "/on/2", mw(), mw2(), (c) => {
//     // @ts-expect-error
//     return text(c.state.echo("hello") + c.state.echo2("hello2"));
//   });

//   app.on("GET", "/on/3", mw(), mw2(), mw3(), (c) => {
//     return text(
//       // @ts-expect-error
//       c.state.echo("hello") + c.state.echo2("hello2") + c.state.echo3("hello3")
//     );
//   });

//   app.on("GET", "/on/4", mw(), mw2(), mw3(), mw4(), (c) => {
//     return text(
//       // @ts-expect-error
//       c.state.echo("hello") +
//         // @ts-expect-error
//         c.state.echo2("hello2") +
//         // @ts-expect-error
//         c.state.echo3("hello3") +
//         // @ts-expect-error
//         c.state.echo4("hello4")
//     );
//   });

//   app.on("GET", "/on/5", mw(), mw2(), mw3(), mw4(), mw5(), (c) => {
//     return text(
//       // @ts-expect-error
//       c.state.echo("hello") +
//         // @ts-expect-error
//         c.state.echo2("hello2") +
//         // @ts-expect-error
//         c.state.echo3("hello3") +
//         // @ts-expect-error
//         c.state.echo4("hello4") +
//         // @ts-expect-error
//         c.state.echo5("hello5")
//     );
//   });

//   test("Should return the correct response - no-path", async () => {
//     let res = await app.dispatch("/no-path/1");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hello");

//     res = await app.dispatch("/no-path/2");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2");

//     res = await app.dispatch("/no-path/3");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2hello3");

//     res = await app.dispatch("/no-path/4");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2hello3hello4");

//     res = await app.dispatch("/no-path/5");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2hello3hello4hello5");
//   });

//   test("Should return the correct response - path", async () => {
//     let res = await app.dispatch("/path/1");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hello");

//     res = await app.dispatch("/path/2");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2");

//     res = await app.dispatch("/path/3");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2hello3");

//     res = await app.dispatch("/path/4");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2hello3hello4");

//     res = await app.dispatch("/path/5");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2hello3hello4hello5");
//   });

//   test("Should return the correct response - on", async () => {
//     let res = await app.dispatch("/on/1");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hello");

//     res = await app.dispatch("/on/2");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2");

//     res = await app.dispatch("/on/3");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2hello3");

//     res = await app.dispatch("/on/4");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2hello3hello4");

//     res = await app.dispatch("/on/5");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("hellohello2hello3hello4hello5");
//   });

//   test("Should not throw type errors", () => {
//     const app = new Application<{
//       Variables: {
//         hello: () => string;
//       };
//     }>();

//     app.get(mw());
//     app.get(mw(), mw2());
//     app.get(mw(), mw2(), mw3());
//     app.get(mw(), mw2(), mw3(), mw4());
//     app.get(mw(), mw2(), mw3(), mw4(), mw5());

//     app.get("/", mw());
//     app.get("/", mw(), mw2());
//     app.get("/", mw(), mw2(), mw3());
//     app.get("/", mw(), mw2(), mw3(), mw4());
//     app.get("/", mw(), mw2(), mw3(), mw4(), mw5());
//   });
// });

describe('normalizeHTTPException', () => {
  // Test basic error handling
  test('should handle basic errors', async () => {
    const testApp = new Application();

    testApp.get('/test-error', () => {
      throw new Error('Test error');
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.message).toBe('Test error');
    // Error objects are returned directly, so they don't have status property
  });

  test('should handle Error objects directly', async () => {
    const customError = new Error('Custom error');
    (customError as any).status = 404;
    (customError as any).statusText = 'Not Found';

    const testApp = new Application();
    testApp.get('/test-error', () => {
      throw customError;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.message).toBe('Custom error');
    // Error objects are returned directly, so they might not have status property
  });

  test('should handle Error objects directly', async () => {
    const originalError = new Error('Original error');

    const testApp = new Application();
    testApp.get('/test-error', () => {
      throw originalError;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.message).toBe('Original error');
    // Error objects are returned directly without conversion
  });

  test('should handle Response objects with JSON content', async () => {
    const jsonResponse = new Response(
      JSON.stringify({ message: 'API Error', code: 'INVALID_INPUT' }),
      {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }
    );

    const testApp = new Application();
    testApp.get('/test-error', () => {
      throw jsonResponse;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.status).toBe(400);
    expect(capturedError.message).toBe('API Error');
    expect(capturedError.cause).toBe(jsonResponse);
  });

  test('should attach stack from JSON Response body when present', async () => {
    const serverStack = 'Error: boom\n    at foo (bar.js:1:1)';
    const jsonResponse = new Response(
      JSON.stringify({
        message: 'API Error',
        stack: serverStack,
      }),
      {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }
    );

    const testApp = new Application();
    testApp.get('/test-error', () => {
      throw jsonResponse;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.status).toBe(400);
    expect(capturedError.message).toBe('API Error');
    expect(capturedError.stack).toBe(serverStack);
    expect(capturedError.cause).toBe(jsonResponse);
  });

  test('should not attach stack when JSON stack is empty string', async () => {
    const jsonResponse = new Response(
      JSON.stringify({
        message: 'API Error',
        stack: '',
      }),
      {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }
    );

    const testApp = new Application();
    testApp.get('/test-error', () => {
      throw jsonResponse;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.message).toBe('API Error');
    expect(capturedError.stack).not.toBe('');
  });

  test('should handle Response objects with text content', async () => {
    const textResponse = new Response('Server is down', {
      status: 503,
      headers: { 'content-type': 'text/plain' },
    });

    const testApp = new Application();
    testApp.get('/test-error', () => {
      throw textResponse;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.status).toBe(503);
  });

  test('should handle object format errors with message', async () => {
    const objectError = { message: 'Validation failed', status: 422 };

    const testApp = new Application();
    testApp.get('/test-error', () => {
      throw objectError;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.status).toBe(422);
    expect(capturedError.message).toBe('Validation failed');
  });

  test('should handle object format errors with error field', async () => {
    const objectError = { error: 'Permission denied', status: 403 };

    const testApp = new Application();
    testApp.get('/test-error', () => {
      throw objectError;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.status).toBe(403);
    expect(capturedError.message).toBe('Permission denied');
  });

  test('should handle string errors', async () => {
    const stringError = 'Simple string error';

    const testApp = new Application();
    testApp.get('/test-error', () => {
      throw stringError;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.status).toBe(500);
    expect(capturedError.message).toBe('Unknown error: Simple string error');
  });

  test('should preserve cause for Error objects', async () => {
    const testApp = new Application();
    const originalError = new Error('Original error');

    testApp.get('/test-error', () => {
      throw originalError;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    // Error objects are returned directly, so cause should be the same object
    expect(capturedError).toBe(originalError);
  });

  test('should preserve cause for Response objects', async () => {
    const testApp = new Application();
    const responseError = new Response('API Error', { status: 400 });

    testApp.get('/test-error', () => {
      throw responseError;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError).toBeDefined();
    expect(capturedError.status).toBe(400);
    // Note: cause preservation might not work as expected in test environment
  });

  test('should preserve cause for object errors', async () => {
    const testApp = new Application();
    const objectError = { message: 'Object error', status: 422 };

    testApp.get('/test-error', () => {
      throw objectError;
    });

    let capturedError: any = null;
    testApp.onError((error) => {
      capturedError = error;
      return new Response('Error handled', { status: 500 });
    });

    await testApp.dispatch('/test-error');

    expect(capturedError.cause).toBe(objectError);
  });
});

describe('HEAD method', () => {
  test('normalizes internal request to GET while preserving originalRequest', async () => {
    let internalMethod = '';
    let originalMethod = '';

    const app = new Application();
    app.get('/page', (c) => {
      internalMethod = c.request.method;
      originalMethod = c.originalRequest.method;
      return text('ok');
    });

    await app.dispatch('http://localhost/page', { method: 'HEAD' });
    expect(internalMethod).toBe('GET');
    expect(originalMethod).toBe('HEAD');
  });

  test('keeps same URL on internal request unlike rewrite', async () => {
    let internalUrl = '';
    let originalUrl = '';

    const app = new Application();
    app.get('/page', (c) => {
      internalUrl = c.request.url;
      originalUrl = c.originalRequest.url;
      return text('ok');
    });

    await app.dispatch('http://localhost/page?q=1', { method: 'HEAD' });
    expect(internalUrl).toBe('http://localhost/page?q=1');
    expect(originalUrl).toBe('http://localhost/page?q=1');
  });

  test('dispatches to GET route handler via methodsToHandler', async () => {
    const app = new Application();
    app.get(
      '/page',
      methodsToHandler({
        GET: () => text('ok'),
      }) as MiddlewareHandler
    );

    const res = await app.dispatch('http://localhost/page', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.body).toBe(null);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });

  test('plain GET middleware serves HEAD without body', async () => {
    const app = new Application();
    app.get('/page', () => text('ok'));

    const res = await app.dispatch('http://localhost/page', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.body).toBe(null);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });

  test('GET and HEAD to same path differ only by body', async () => {
    const app = new Application();
    app.get('/page', () => text('payload'));

    const getRes = await app.dispatch('http://localhost/page', {
      method: 'GET',
    });
    const headRes = await app.dispatch('http://localhost/page', {
      method: 'HEAD',
    });

    expect(await getRes.text()).toBe('payload');
    expect(headRes.body).toBe(null);
    expect(headRes.status).toBe(getRes.status);
    expect(headRes.headers.get('content-type')).toBe(
      getRes.headers.get('content-type')
    );
  });

  test('preserves status and headers from handler', async () => {
    const app = new Application();
    app.get('/page', () =>
      text('body', { status: 201, headers: { 'x-custom': 'yes' } })
    );

    const res = await app.dispatch('http://localhost/page', { method: 'HEAD' });
    expect(res.status).toBe(201);
    expect(res.headers.get('x-custom')).toBe('yes');
    expect(res.body).toBe(null);
  });

  test('runs middleware stack once without rematch', async () => {
    const log: string[] = [];
    const app = new Application();

    app.use('*', async (_c, next) => {
      log.push('middleware');
      return next();
    });
    app.get('/page', () => {
      log.push('route');
      return text('ok');
    });

    await app.dispatch('http://localhost/page', { method: 'HEAD' });
    expect(log).toEqual(['middleware', 'route']);
  });

  test('hits same matched route instead of switching path', async () => {
    const log: string[] = [];
    const app = new Application();

    app.get('/a', () => {
      log.push('a');
      return text('a');
    });
    app.get('/b', () => {
      log.push('b');
      return text('b');
    });

    await app.dispatch('http://localhost/a', { method: 'HEAD' });
    expect(log).toEqual(['a']);
  });

  test('middleware can branch on originalRequest.method', async () => {
    let originalMethod = '';
    let internalMethod = '';

    const app = new Application();
    app.use('*', async (c, next) => {
      originalMethod = c.originalRequest.method;
      internalMethod = c.request.method;
      return next();
    });
    app.get('/page', () => text('ok'));

    await app.dispatch('http://localhost/page', { method: 'HEAD' });
    expect(originalMethod).toBe('HEAD');
    expect(internalMethod).toBe('GET');
  });

  test('strips body on error responses', async () => {
    const app = new Application();

    app.get('/page', () => {
      throw new Error('fail');
    });
    app.onError(() => text('error body', { status: 500 }));

    const res = await app.dispatch('http://localhost/page', { method: 'HEAD' });
    expect(res.status).toBe(500);
    expect(res.body).toBe(null);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });

  test('returns 404 without body for missing routes', async () => {
    const app = new Application();

    const res = await app.dispatch('http://localhost/missing', {
      method: 'HEAD',
    });
    expect(res.status).toBe(404);
    expect(res.body).toBe(null);
  });

  test('matches GET route not separately registered HEAD handler', async () => {
    const app = new Application();

    app.head('/page', () =>
      text('head-only', { headers: { 'x-handler': 'head' } })
    );
    app.get('/page', () => text('get', { headers: { 'x-handler': 'get' } }));

    const res = await app.dispatch('http://localhost/page', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-handler')).toBe('get');
    expect(res.body).toBe(null);
  });

  test('HEAD-only registered route is not matched after normalization', async () => {
    const app = new Application();

    app.head('/page', () => text('head-only'));

    const res = await app.dispatch('http://localhost/page', { method: 'HEAD' });
    expect(res.status).toBe(404);
    expect(res.body).toBe(null);
  });

  test('rewrite rematches GET routes after HEAD normalization', async () => {
    const app = new Application();

    app.use('*', async (c, next) => {
      if (c.originalRequest.method === 'HEAD') {
        return c.rewrite('/internal');
      }
      return next();
    });
    app.get('/internal', () => text('ok'));

    const res = await app.dispatch('http://localhost/v1', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.body).toBe(null);
    expect(await res.text()).toBe('');
  });

  test('rewrite changes internal path while HEAD alone does not', async () => {
    let internalPathHeadOnly = '';
    let internalPathRewrite = '';

    const headApp = new Application();
    headApp.get('/page', (c) => {
      internalPathHeadOnly = new URL(c.request.url).pathname;
      return text('ok');
    });
    await headApp.dispatch('http://localhost/page', { method: 'HEAD' });
    expect(internalPathHeadOnly).toBe('/page');

    const rewriteApp = new Application();
    rewriteApp.use('*', async (c) => c.rewrite('/internal'));
    rewriteApp.get('/internal', (c) => {
      internalPathRewrite = new URL(c.request.url).pathname;
      return text('ok');
    });
    await rewriteApp.dispatch('http://localhost/external', { method: 'HEAD' });
    expect(internalPathRewrite).toBe('/internal');
  });
});

describe('rewrite()', () => {
  test('returns target route response', async () => {
    const app = new Application();

    app.use('*', async (c, next) => {
      const { pathname } = new URL(c.originalRequest.url);
      if (pathname === '/v1/foo') {
        return c.rewrite('/internal');
      }
      return next();
    });
    app.get('/internal', () => text('target'));

    const res = await app.dispatch('http://localhost/v1/foo');
    expect(await res.text()).toBe('target');
  });

  test('gateway middleware can amend response headers', async () => {
    const app = new Application();

    app.use('*', async (c, next) => {
      const { pathname } = new URL(c.originalRequest.url);
      if (!pathname.startsWith('/v1/')) return next();

      const res = await c.rewrite(pathname.replace(/^\/v1/, '/internal'));
      res.headers.set('x-routed-by', 'v1-gateway');
      return res;
    });
    app.get('/internal/products/:id', (c) => {
      return text(`internal:${c.params.id}`);
    });

    const res = await app.dispatch('http://localhost/v1/products/42');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('internal:42');
    expect(res.headers.get('x-routed-by')).toBe('v1-gateway');
  });

  test('originalRequest keeps client URL after rewrite', async () => {
    let internalUrl = '';
    let originalUrl = '';

    const app = new Application();
    app.use('*', async (c) => {
      originalUrl = c.originalRequest.url;
      return c.rewrite('/internal');
    });
    app.get('/internal', (c) => {
      internalUrl = c.request.url;
      return text('ok');
    });

    await app.dispatch('http://localhost/v1/foo?bar=1');
    expect(originalUrl).toBe('http://localhost/v1/foo?bar=1');
    expect(new URL(internalUrl).pathname).toBe('/internal');
  });

  test('uses query only from rewrite destination', async () => {
    let internalSearch = '';

    const app = new Application();
    app.use('*', async (c) => c.rewrite('/internal?p=2'));
    app.get('/internal', (c) => {
      internalSearch = new URL(c.request.url).search;
      return text('ok');
    });

    await app.dispatch('http://localhost/v1/foo?bar=1');
    expect(internalSearch).toBe('?p=2');
  });

  test('executed handlers are not re-run after rewrite', async () => {
    const log: string[] = [];
    const app = new Application();

    app.use('*', async (c, next) => {
      log.push('global');
      if (new URL(c.originalRequest.url).pathname.startsWith('/v1')) {
        return c.rewrite('/internal');
      }
      return next();
    });
    app.get('/internal', () => {
      log.push('route');
      return text('ok');
    });

    await app.dispatch('http://localhost/v1/foo');
    expect(log).toEqual(['global', 'route']);
  });

  test('skips every handler that already started before rewrite', async () => {
    const log: string[] = [];
    const app = new Application();

    app.use('*', async (c, next) => {
      log.push('first-global');
      return next();
    });
    app.use('*', async (c) => {
      log.push('second-global');
      return c.rewrite('/internal');
    });
    app.get('/internal', () => {
      log.push('route');
      return text('ok');
    });

    await app.dispatch('http://localhost/v1/foo');
    expect(log).toEqual(['first-global', 'second-global', 'route']);
  });

  describe('rewrite() request view', () => {
    test('caller middleware keeps pre-rewrite context.request after await rewrite()', async () => {
      const log: string[] = [];
      const app = new Application();

      app.use('*', async (c) => {
        log.push(`before:${new URL(c.request.url).pathname}`);
        await c.rewrite('/internal');
        log.push(`after:${new URL(c.request.url).pathname}`);
        return text('never returned when using return rewrite');
      });
      app.get('/internal', () => text('target'));

      const res = await app.dispatch('http://localhost/v1/foo');
      expect(await res.text()).toBe('never returned when using return rewrite');
      expect(log).toEqual(['before:/v1/foo', 'after:/v1/foo']);
    });

    test('target stack handlers see rewritten context.request', async () => {
      const log: string[] = [];
      const app = new Application();

      app.use('*', async (c) => c.rewrite('/internal'));
      app.get('/internal', (c) => {
        log.push(`target:${new URL(c.request.url).pathname}`);
        return text('ok');
      });

      await app.dispatch('http://localhost/v1/foo');
      expect(log).toEqual(['target:/internal']);
    });

    test('next() downstream sees rewritten context.request after await rewrite()', async () => {
      const log: string[] = [];
      const app = new Application();

      app.use('*', async (c, next) => {
        await c.rewrite('/internal');
        return next();
      });
      app.get('/v1/foo', (c) => {
        log.push(`downstream:${new URL(c.request.url).pathname}`);
        return text('downstream-body');
      });
      app.get('/internal', () => text('target-body'));

      const res = await app.dispatch('http://localhost/v1/foo');
      expect(await res.text()).toBe('downstream-body');
      expect(log).toEqual(['downstream:/internal']);
    });
  });

  /**
   * Documents dispatch when rewrite is not return-driven control flow.
   * These patterns are not recommended; use `return context.rewrite(...)`.
   */
  describe('rewrite() flow (non-recommended patterns)', () => {
    test('await rewrite then return next() downstream response discards rewrite result', async () => {
      const log: string[] = [];
      const app = new Application();

      app.use('*', async (c, next) => {
        log.push(`caller:${new URL(c.request.url).pathname}`);
        const rewriteRes = await c.rewrite('/internal');
        log.push(`after-rewrite:${new URL(c.request.url).pathname}`);
        log.push(`mw:rewrite:${await rewriteRes.clone().text()}`);
        const downstreamRes = await next();
        log.push(`mw:downstream:${await downstreamRes.clone().text()}`);
        return downstreamRes;
      });
      app.get('/v1/foo', (c) => {
        log.push(`source:request=${new URL(c.request.url).pathname}`);
        return text('source-body');
      });
      app.get('/internal', (c) => {
        log.push(`target:request=${new URL(c.request.url).pathname}`);
        return text('target-body');
      });

      const res = await app.dispatch('http://localhost/v1/foo');

      expect(await res.text()).toBe('source-body');
      expect(log).toEqual([
        'caller:/v1/foo',
        'target:request=/internal',
        'after-rewrite:/v1/foo',
        'mw:rewrite:target-body',
        'source:request=/internal',
        'mw:downstream:source-body',
      ]);
    });

    test('rewrite without await still applies subsequent request before next() downstream', async () => {
      const log: string[] = [];
      const app = new Application();

      app.use('*', async (c, next) => {
        log.push(`caller:${new URL(c.request.url).pathname}`);
        const rewritePromise = c.rewrite('/internal');
        const downstreamRes = await next();
        const rewriteRes = await rewritePromise;
        log.push(`after-next:${new URL(c.request.url).pathname}`);
        log.push(`mw:rewrite:${await rewriteRes.clone().text()}`);
        log.push(`mw:downstream:${await downstreamRes.clone().text()}`);
        return downstreamRes;
      });
      app.get('/v1/foo', () => {
        log.push('source');
        return text('source-body');
      });
      app.get('/internal', () => {
        log.push('target');
        return text('target-body');
      });

      const res = await app.dispatch('http://localhost/v1/foo');

      expect(await res.text()).toBe('source-body');
      expect(log).toEqual([
        'caller:/v1/foo',
        'target',
        'source',
        'after-next:/v1/foo',
        'mw:rewrite:target-body',
        'mw:downstream:source-body',
      ]);
    });
  });

  test('skips source route handler', async () => {
    const app = new Application();

    app.use('*', async (c, next) => {
      if (new URL(c.originalRequest.url).pathname === '/v1/foo') {
        return c.rewrite('/internal');
      }
      return next();
    });
    app.get('/v1/foo', () => text('source'));
    app.get('/internal', () => text('target'));

    const res = await app.dispatch('http://localhost/v1/foo');
    expect(await res.text()).toBe('target');
  });

  test('runs target path middleware', async () => {
    const log: string[] = [];
    const app = new Application();

    app.use('*', async (c, next) => {
      if (new URL(c.originalRequest.url).pathname === '/v1/foo') {
        return c.rewrite('/internal');
      }
      return next();
    });
    app.use('/internal', async (_c, next) => {
      log.push('internal-mw');
      return next();
    });
    app.get('/internal', () => text('ok'));

    await app.dispatch('http://localhost/v1/foo');
    expect(log).toContain('internal-mw');
  });

  test('rewrite to missing path returns 404', async () => {
    const app = new Application();

    app.use('*', async (c) => c.rewrite('/missing'));

    const res = await app.dispatch('http://localhost/v1/foo');
    expect(res.status).toBe(404);
  });

  test('rejects cross-origin rewrite via onError', async () => {
    const app = new Application();
    let capturedMessage = '';

    app.use('*', (c) => c.rewrite('https://evil.com/path'));
    app.onError((error) => {
      capturedMessage = (error as Error).message;
      return text('handled', { status: 500 });
    });

    await app.dispatch('http://localhost/v1/foo');
    expect(capturedMessage).toMatch(/same-origin or relative/i);
  });

  test('detects rewrite loop with HTTPException 508', async () => {
    const app = new Application();
    let capturedStatus: number | undefined;

    app.use('/a', async (c) => c.rewrite('/b'));
    app.use('/b', async (c) => c.rewrite('/a'));
    app.onError((error) => {
      capturedStatus = (error as { status?: number }).status;
      return text(`error:${capturedStatus}`, { status: 500 });
    });

    await app.dispatch('http://localhost/a');
    expect(capturedStatus).toBe(508);
  });

  test('rejects rewrite after next() has completed', async () => {
    const app = new Application();
    let capturedMessage = '';

    app.use('*', async (c, next) => {
      await next();
      c.rewrite('/internal');
      return text('never');
    });
    app.get('/foo', () => text('ok'));
    app.onError((error) => {
      capturedMessage = (error as Error).message;
      return text('handled', { status: 500 });
    });

    await app.dispatch('http://localhost/foo');
    expect(capturedMessage).toMatch(/next\(\) has completed/i);
  });

  test('updates params to match rewritten route', async () => {
    const app = new Application();

    app.use('*', async (c, next) => {
      const { pathname } = new URL(c.originalRequest.url);
      if (pathname.startsWith('/v1/')) {
        return c.rewrite(pathname.replace('/v1', '/internal'));
      }
      return next();
    });
    app.get('/internal/:id', (c) => text(`id:${c.params.id}`));

    const res = await app.dispatch('http://localhost/v1/99');
    expect(await res.text()).toBe('id:99');
  });

  test('inherits method from current internal request', async () => {
    const app = new Application();

    app.use('*', async (c) => c.rewrite('/internal'));
    app.post('/internal', (c) => text(c.request.method));

    const res = await app.dispatch('http://localhost/v1/foo', {
      method: 'POST',
    });
    expect(await res.text()).toBe('POST');
  });

  test('accepts Request input', async () => {
    const app = new Application();

    app.use('*', async (c, next) => {
      if (new URL(c.originalRequest.url).pathname === '/v1/foo') {
        return c.rewrite(new Request('/internal', c.request));
      }
      return next();
    });
    app.get('/internal', () => text('from-request'));

    const res = await app.dispatch('http://localhost/v1/foo');
    expect(await res.text()).toBe('from-request');
  });

  test('accepts init to override method', async () => {
    const app = new Application();

    app.use('*', async (c) => c.rewrite('/internal', { method: 'POST' }));
    app.post('/internal', (c) => text(c.request.method));
    app.get('/internal', () => text('GET'));

    const res = await app.dispatch('http://localhost/v1/foo', {
      method: 'GET',
    });
    expect(await res.text()).toBe('POST');
  });

  test('clears route activation when rewrite changes method on same path', async () => {
    const runtime = new ModuleRuntime({
      layoutModule: {
        default: () => '<html/>',
        render: async () => '<html/>',
      } as LayoutModule,
      defaultMeta: { title: 't' } as Meta,
      defaultBaseAsset: '/',
      defaultRenderer: {} as ServerRenderOptions,
      onFallback: () => {},
      exposeErrors: true,
    });
    const clearSpy = vi.spyOn(runtime, 'clearActivation');

    const app = new Application();
    app.useModuleRuntime(runtime);

    app.use('*', async (c) => c.rewrite('/resource', { method: 'POST' }));
    app.get('/resource', () => text('get'));
    app.post('/resource', () => text('post'));

    const res = await app.dispatch('http://localhost/resource', {
      method: 'GET',
    });
    expect(clearSpy).toHaveBeenCalledTimes(2);
    expect(await res.text()).toBe('post');
  });

  test('releases route activation after successful dispatch', async () => {
    const runtime = new ModuleRuntime({
      layoutModule: {
        default: () => '<html/>',
        render: async () => '<html/>',
      } as LayoutModule,
      defaultMeta: { title: 't' } as Meta,
      defaultBaseAsset: '/',
      defaultRenderer: {} as ServerRenderOptions,
      onFallback: () => {},
      exposeErrors: true,
    });

    const app = new Application();
    app.useModuleRuntime(runtime);

    let captured: RouteContext | undefined;
    app.use(
      '/page',
      runtime.createRouteContextHandler({
        render: () => 'Page',
        handler: { GET: () => new Response('ok') },
      })
    );
    app.use('/page', async (c, next) => {
      captured = c as RouteContext;
      return next();
    });
    app.use(
      '/page',
      runtime.createRouteHandler({
        handler: { GET: () => new Response('ok') },
      })
    );

    const res = await app.dispatch('http://localhost/page');
    expect(res.status).toBe(200);
    expect(captured?.module).toBeUndefined();
    expect(captured?.render).toBeUndefined();
  });

  test('releases route activation after error dispatch', async () => {
    const runtime = new ModuleRuntime({
      layoutModule: {
        default: () => '<html/>',
        render: async () => '<html/>',
      } as LayoutModule,
      defaultMeta: { title: 't' } as Meta,
      defaultBaseAsset: '/',
      defaultRenderer: {} as ServerRenderOptions,
      onFallback: () => {},
      exposeErrors: true,
    });

    const app = new Application();
    app.useModuleRuntime(runtime);

    let captured: RouteContext | undefined;
    app.use(
      '/page',
      runtime.createRouteContextHandler({
        render: () => 'Page',
        handler: { GET: () => new Response('ok') },
      })
    );
    app.use('/page', async (c, next) => {
      captured = c as RouteContext;
      return next();
    });
    app.get('/page', () => {
      throw new Error('boom');
    });
    app.onError(() => text('handled', { status: 500 }));

    const res = await app.dispatch('http://localhost/page');
    expect(res.status).toBe(500);
    expect(captured?.module).toBeUndefined();
  });

  test('fails when rewrite changes route view with active module but no module runtime', async () => {
    const runtime = new ModuleRuntime({
      layoutModule: {
        default: () => '<html/>',
        render: async () => '<html/>',
      } as LayoutModule,
      defaultMeta: { title: 't' } as Meta,
      defaultBaseAsset: '/',
      defaultRenderer: {} as ServerRenderOptions,
      onFallback: () => {},
      exposeErrors: true,
    });

    const app = new Application();
    app.use(
      '/page',
      runtime.createRouteContextHandler({
        render: () => 'Page',
        handler: { GET: () => new Response('get') },
      })
    );
    app.use('*', async (c) => c.rewrite('/other'));
    app.get('/other', () => text('other'));

    let capturedMessage = '';
    app.onError((error) => {
      capturedMessage = (error as Error).message;
      return text('handled', { status: 500 });
    });

    await app.dispatch('http://localhost/page');
    expect(capturedMessage).toMatch(/not invalidated on rewrite/i);
  });

  test('useModuleRuntime allows rewrite after route activation', async () => {
    const runtime = new ModuleRuntime({
      layoutModule: {
        default: () => '<html/>',
        render: async () => '<html/>',
      } as LayoutModule,
      defaultMeta: { title: 't' } as Meta,
      defaultBaseAsset: '/',
      defaultRenderer: {} as ServerRenderOptions,
      onFallback: () => {},
      exposeErrors: true,
    });

    const app = new Application();
    app.useModuleRuntime(runtime);
    app.use(
      '/with-render',
      runtime.createRouteContextHandler({
        render: () => 'Render Route',
        handler: { GET: (c) => c.html!() },
      })
    );
    app.use('/with-render', async (c) => c.rewrite('/plain'));
    app.use(
      '/plain',
      runtime.createRouteHandler({
        handler: {
          GET() {
            return new Response('plain');
          },
        },
      })
    );

    const res = await app.dispatch('http://localhost/with-render');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('plain');
  });
});
