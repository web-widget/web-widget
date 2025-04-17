import { compose } from '@web-widget/helpers';
import { HTTPException } from '@web-widget/helpers/error';
import { Context } from './context';
import type { Router } from './router';
import { METHOD_NAME_ALL, METHODS, URLPatternRouter } from './router';
import type {
  Env,
  ErrorHandler,
  ExecutionContext,
  MiddlewareHandler,
  NotFoundHandler,
} from './types';
import { getPath, getPathNoStrict } from './url';

type Methods = (typeof METHODS)[number];

function defineDynamicClass(): {
  new <E extends Env = Env, BasePath extends string = '/'>(): {
    /**
     * @experimental
     */
    [M in Methods]: (
      path: string,
      handler: MiddlewareHandler
    ) => Application<E, BasePath>;
  } & {
    /**
     * @experimental
     */
    use: (path: string, handler: MiddlewareHandler) => Application<E, BasePath>;
  };
} {
  return class {} as never;
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

const splitCommaSeparatedValues = (value: string, limit: number) => {
  return value.split(',', limit).map((v) => v.trim());
};

type GetPath<E extends Env> = (
  request: Request,
  options?: { env?: E['Bindings'] }
) => string;

export interface ApplicationOptions<E extends Env> {
  strict?: boolean;
  router?: Router<MiddlewareHandler>;
  getPath?: GetPath<E>;
  /**
   * When true proxy header fields will be trusted.
   */
  proxy?: boolean;
}

class Application<
  E extends Env = Env,
  BasePath extends string = '/',
> extends defineDynamicClass()<E, BasePath> {
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router!: Router<MiddlewareHandler>;
  readonly getPath: GetPath<E>;

  constructor(options: ApplicationOptions<E> = {}) {
    super();

    // Implementation of app.get(path, ...handlers[])
    METHODS.forEach((method) => {
      this[method] = (path: string, ...args: MiddlewareHandler[]) => {
        args.forEach((handler) => {
          this.#addRoute(method, path, handler);
        });
        return this;
      };
    });

    // Implementation of app.get(path, ...handlers[])
    this.use = (path: string, ...handlers: MiddlewareHandler[]) => {
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, path, handler);
      });
      return this;
    };

    const strict = options.strict ?? true;
    delete options.strict;
    // Object.assign(this, options);
    this.getPath = strict ? (options.getPath ?? getPath) : getPathNoStrict;
    this.router = options.router ?? new URLPatternRouter();
    this.#proxy = !!options.proxy;
  }

  #resolveOriginalRequestUrl(request: Request) {
    const url = new URL(request.url);
    const headers = request.headers;
    const forwardedHost =
      headers.get('x-forwarded-host') ?? headers.get('host');
    const forwardedProto = headers.get('x-forwarded-proto');

    if (forwardedHost) {
      url.host = splitCommaSeparatedValues(forwardedHost, 1)[0];
    }

    if (forwardedProto) {
      url.protocol = `${splitCommaSeparatedValues(forwardedProto, 1)[0]}:`;
    }

    return request.url === url.href ? request : new Request(url, request);
  }

  #proxy: boolean = false;
  #notFoundHandler: NotFoundHandler = notFoundHandler;
  #errorHandler: ErrorHandler = errorHandler;

  /**
   * @internal
   */
  fixErrorStack(error: Error) {}

  /**
   * @experimental
   */
  onError(handler: ErrorHandler<E>) {
    this.#errorHandler = handler;
    return this;
  }

  /**
   * @experimental
   */
  notFound(handler: NotFoundHandler<E>) {
    this.#notFoundHandler = handler;
    return this;
  }

  #addRoute(method: string, path: string, handler: MiddlewareHandler) {
    method = method.toUpperCase();
    this.router.add(method, path, handler);
  }

  #matchRoute(method: string, path: string) {
    return this.router.match(method, path);
  }

  handler(
    request: Request,
    env: E['Bindings'] | undefined = Object.create(null),
    executionContext?: ExecutionContext,
    method: string = request.method
  ): Response | Promise<Response> {
    if (this.#proxy) {
      request = this.#resolveOriginalRequestUrl(request);
    }

    // Handle HEAD method
    if (method === 'HEAD') {
      return (async () =>
        new Response(
          null,
          await this.handler(request, env, executionContext, 'GET')
        ))();
    }

    const path = this.getPath(request, { env });
    const [handlers] = this.#matchRoute(method, path);

    const context = new Context(request, {
      env,
      executionContext,
    });

    const composed = compose<(typeof handlers)[0], Context>(
      handlers,
      (handler) => {
        context.params = handler[1];
        context.pathname = handler[2];
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
    env?: E['Bindings'] | {},
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
    env?: E['Bindings'] | {},
    executionContext?: ExecutionContext
  ) => {
    return this.dispatch(input, requestInit, env, executionContext);
  };
}

export { Application };
