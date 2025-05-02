/* eslint-disable @typescript-eslint/no-unused-vars */
import { Application } from './application';
import type { MiddlewareHandler } from './types';

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

function json(content: any, { status = 200, headers = {} } = {}) {
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

    app.get('/*', (c) => {
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

describe('URLPatternInit support', () => {
  const app = new Application();

  app.get({ pathname: '/pattern-init' }, (c) => {
    return new Response('Matched URLPatternInit', {
      status: 200,
    });
  });

  test('GET /pattern-init matches URLPatternInit route', async () => {
    const res = await app.dispatch('http://localhost/pattern-init');
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Matched URLPatternInit');
  });

  test('GET /non-existent does not match URLPatternInit route', async () => {
    const res = await app.dispatch('http://localhost/non-existent');
    expect(res).not.toBeNull();
    expect(res.status).toBe(404);
  });
});

describe('URLPatternInit with hostname support', () => {
  const app = new Application();

  app.get({ hostname: ':lang.example.com', pathname: '/pattern-init' }, (c) => {
    return new Response(
      `Matched URLPatternInit with hostname: ${c.params['lang']}`,
      {
        status: 200,
      }
    );
  });

  test('GET /pattern-init matches URLPatternInit route with hostname', async () => {
    const res = await app.dispatch('http://en.example.com/pattern-init');
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Matched URLPatternInit with hostname: en');
  });

  test('GET /pattern-init does not match incorrect hostname', async () => {
    const res = await app.dispatch('http://example.com/pattern-init');
    expect(res).not.toBeNull();
    expect(res.status).toBe(404);
  });
});

describe('URLPatternInit with overlapping named groups', () => {
  test('GET /pattern-init with hostname lang takes precedence', async () => {
    const app = new Application();
    app.get(
      {
        hostname: ':lang.example.com',
        pathname: '/:lang/pattern-init',
        search: '?lang=:lang',
      },
      (c) => {
        return new Response(`Matched with lang: ${c.params['lang']}`, {
          status: 200,
        });
      }
    );
    const res = await app.dispatch(
      'http://en.example.com/cn/pattern-init?lang=fr'
    );
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Matched with lang: en');
  });

  test('GET /pattern-init with pathname lang takes precedence over search', async () => {
    const app = new Application();
    app.get(
      {
        pathname: '/:lang/pattern-init',
        search: '?lang=:lang',
      },
      (c) => {
        return new Response(`Matched with lang: ${c.params['lang']}`, {
          status: 200,
        });
      }
    );
    const res = await app.dispatch(
      'http://example.com/en/pattern-init?lang=fr'
    );
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Matched with lang: en');
  });

  test('GET /pattern-init with only search lang', async () => {
    const app = new Application();
    app.get(
      {
        search: '?lang=:lang',
      },
      (c) => {
        return new Response(`Matched with lang: ${c.params['lang']}`, {
          status: 200,
        });
      }
    );
    const res = await app.dispatch('http://example.com/pattern-init?lang=fr');
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Matched with lang: fr');
  });
});

describe('scope', () => {
  const app = new Application();

  app.get('/foo/:bar', (c) => {
    return text(`foo is ${c.scope.pathname}`);
  });

  test('scope of /foo/:bar is found', async () => {
    const res = await app.dispatch('http://localhost/foo/bar');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('foo is /foo/:bar');
  });
});

describe('url', () => {
  const app = new Application();

  app.get('/url-test', (c) => {
    return text(`URL is ${c.url.toString()}`);
  });

  test('should return the correct URL from context', async () => {
    const res = await app.dispatch('http://localhost/url-test');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('URL is http://localhost/url-test');
  });

  test('url should be an instance of URL', async () => {
    const app = new Application();

    app.get('/url-instance-test', (c) => {
      if (!(c.url instanceof URL)) {
        throw new Error('url is not an instance of URL');
      }
      return text('URL instance check passed');
    });

    const res = await app.dispatch('http://localhost/url-instance-test');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('URL instance check passed');
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

describe('builtin middleware', () => {
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

describe('not found', () => {
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
          'x-debug': err.message,
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
      return Response.json(
        {
          name: 'Error',
          message: 'This is Response Error',
        },
        {
          status: 500,
          headers: {
            'x-transform-error': 'true',
          },
        }
      );
    });

    app.onError((err, c) => {
      const message = err.message;
      return text(`Custom Error: ${message}`, {
        status: 500,
        headers: {
          'x-debug': err.message,
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
      const message = err.message;
      return text(`Custom Error: ${message}`, {
        status: 500,
        headers: {
          'x-debug': err.message,
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
      return text(err.message, {
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.use('*', () => {});
    app.get('/foo', (c) => {
      return text('foo');
    });
    app.onError((err, c) => {
      return text(err.message, { status: 500 });
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.get('/foo', () => {});
    app.onError((err, c) => {
      return text(err.message, { status: 500 });
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
