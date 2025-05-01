import { compose } from '@web-widget/helpers';
import { HTTPException } from '@web-widget/helpers/error';
import { Context } from './context';
import type { Router } from './router';
import { METHOD_NAME_ALL, METHODS, URLPatternRouter } from './router';
import type {
  ErrorHandler,
  ExecutionContext,
  MiddlewareHandler,
  NotFoundHandler,
} from './types';

type Route = string | URLPatternInit;
type Methods = (typeof METHODS)[number];

function defineDynamicClass(): {
  new (): {
    /**
     * @experimental
     */
    [M in Methods]: (route: Route, handler: MiddlewareHandler) => Application;
  } & {
    /**
     * @experimental
     */
    use: (route: Route, handler: MiddlewareHandler) => Application;
  };
} {
  return class {} as never;
}

function normalizeRoute(route: Route): URLPatternInit {
  if (typeof route === 'string') {
    return { pathname: route };
  }
  return route;
}

const notFoundHandler = () => {
  return new Response('404 Not Found', {
    status: 404,
  });
};

const errorHandler = (error: unknown) => {
  console.error(error);
  const message = 'Internal Server Error';
  return new Response(message, {
    status: 500,
  });
};

export interface ApplicationOptions {
  router?: Router<MiddlewareHandler>;
}

class Application extends defineDynamicClass() {
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router!: Router<MiddlewareHandler>;

  constructor(options: ApplicationOptions = {}) {
    super();

    // Implementation of app.get(route, ...handlers[])
    METHODS.forEach((method) => {
      this[method] = (route: Route, ...args: MiddlewareHandler[]) => {
        route = normalizeRoute(route);
        args.forEach((handler) => {
          this.#addRoute(method, route, handler);
        });
        return this;
      };
    });

    // Implementation of app.get(route, ...handlers[])
    this.use = (route: Route, ...handlers: MiddlewareHandler[]) => {
      route = normalizeRoute(route);
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, route, handler);
      });
      return this;
    };

    this.router = options.router ?? new URLPatternRouter();
  }

  #notFoundHandler: NotFoundHandler = notFoundHandler;
  #errorHandler: ErrorHandler = errorHandler;

  /**
   * @internal
   */
  fixErrorStack(error: Error) {}

  /**
   * @experimental
   */
  onError(handler: ErrorHandler) {
    this.#errorHandler = handler;
    return this;
  }

  /**
   * @experimental
   */
  notFound(handler: NotFoundHandler) {
    this.#notFoundHandler = handler;
    return this;
  }

  #addRoute(method: string, input: URLPatternInit, handler: MiddlewareHandler) {
    method = method.toUpperCase();
    this.router.add(method, input, handler);
  }

  #matchRoute(method: string, input: URLPatternInit) {
    return this.router.match(method, input);
  }

  handler(
    request: Request,
    env?: unknown,
    executionContext?: ExecutionContext,
    method: string = request.method
  ): Response | Promise<Response> {
    // Handle HEAD method
    if (method === 'HEAD') {
      return (async () =>
        new Response(
          null,
          await this.handler(request, env, executionContext, 'GET')
        ))();
    }

    const context = new Context(request, {
      executionContext,
    });

    const handlers = this.#matchRoute(method, context.url);
    const composed = compose<(typeof handlers)[0], Context>(
      handlers,
      (handler) => {
        context.params = handler[1];
        context.scope = handler[2];
        return handler[0];
      }
    );

    return (async () => {
      try {
        const res = await composed(context, this.#notFoundHandler);
        if (!res) {
          throw new Error(
            'Response is not finalized. You may forget returning Response object or `return next()`.'
          );
        }

        if (!(res instanceof Response)) {
          throw new TypeError('Response must be an instance of Response.');
        }

        if (
          res.status >= 400 &&
          res.headers.has('x-transform-error') &&
          res.headers.get('content-type') === 'application/json'
        ) {
          const data = await res.json();
          if (data && data.message) {
            const httpException = new HTTPException(res.status, data.message);
            if (data.stack) {
              httpException.stack = data.stack;
            }
            throw httpException;
          }
        }

        return res;
      } catch (error) {
        this.fixErrorStack(error as Error);
        return this.#errorHandler(error, context);
      }
    })();
  }

  /**
   * Implements the (ancient) event listener object interface to allow passing to fetch event directly,
   * e.g. `self.addEventListener('fetch', webRouter)`.
   */
  handleEvent = (event: FetchEvent) => {
    event.respondWith(this.handler(event.request, undefined, event));
  };

  /**
   * Interface for testing.
   * @experimental
   */
  dispatch = (
    input: RequestInfo | URL,
    requestInit?: RequestInit,
    env?: unknown,
    executionContext?: ExecutionContext
  ) => {
    const request =
      input instanceof Request
        ? requestInit
          ? new Request(input, requestInit)
          : input
        : new Request(new URL(input, 'http://localhost'), requestInit);
    const context =
      executionContext ??
      new FetchEvent('fetch', {
        request,
      });
    return this.handler(request, env, context);
  };

  /**
   * @deprecated Use `dispatch` method instead.
   */
  request = (
    input: RequestInfo | URL,
    requestInit?: RequestInit,
    env?: unknown,
    executionContext?: ExecutionContext
  ) => {
    return this.dispatch(input, requestInit, env, executionContext);
  };
}

export { Application };
