/**
 * @fileoverview Application domain object - HTTP request/response lifecycle management
 */
import { compose } from '@web-widget/helpers';
import { normalizeForwardedRequest } from '@web-widget/helpers/proxy';
import { createHttpError } from '@web-widget/helpers/error';
import { Context } from './context';
import type { Router } from './router';
import {
  METHOD_NAME_ALL,
  METHODS,
  createRouter,
  getDefaultRouterType,
  isValidRouterType,
  type RouterType,
} from './router';
import type {
  Env,
  ErrorHandler,
  ExecutionContext,
  HTTPException,
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

type GetPath<E extends Env> = (
  request: Request,
  options?: { env?: E['Bindings'] }
) => string;

export interface ApplicationOptions<E extends Env> {
  strict?: boolean;
  router?: Router<MiddlewareHandler>;
  getPath?: GetPath<E>;
  /**
   * Router type to use. Defaults to 'url-pattern' for backward compatibility.
   * Use 'radix-tree' for better performance with large route sets.
   * @experimental
   */
  routerType?: RouterType;
  /**
   * Whether to enable proxy mode. When set to true, ensure that the last reverse proxy
   * trusted is removing or overwriting the following HTTP headers:
   * X-Forwarded-Host and X-Forwarded-Proto. Otherwise, the client may provide any value.
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

    // Implementation of app.use(path, ...handlers[])
    this.use = (path: string, ...handlers: MiddlewareHandler[]) => {
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, path, handler);
      });
      return this;
    };

    const strict = options.strict ?? true;
    const routerType = options.routerType ?? getDefaultRouterType();
    delete options.strict;
    delete options.routerType;
    // Object.assign(this, options);
    this.getPath = strict ? (options.getPath ?? getPath) : getPathNoStrict;

    // Choose router based on configuration
    if (options.router) {
      this.router = options.router;
    } else {
      if (!isValidRouterType(routerType)) {
        throw new Error(`Invalid router type: ${routerType}`);
      }
      this.router = createRouter<MiddlewareHandler>(routerType);
    }

    this.#proxy = !!options.proxy;
  }

  #proxy: boolean = false;
  #notFoundHandler: NotFoundHandler = notFoundHandler;
  #errorHandler: ErrorHandler = errorHandler;

  /**
   * @internal
   */
  fixErrorStack(_error: Error) {}

  /**
   * @internal
   */
  onError(handler: ErrorHandler<E>) {
    this.#errorHandler = handler;
    return this;
  }

  /**
   * @internal
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
      request = normalizeForwardedRequest(request);
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
    const handlers = this.#matchRoute(method, path);

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
          // NOTE: This is a workaround to handle the error response from the cache middleware.
          // https://github.com/web-widget/web-widget/blob/6ed821db5535aa274f1ee151fff38f1ea0a99231/packages/middlewares/src/cache.ts#L189
          // TODO: This is not a good code, we will eliminate it later.
          res.headers.has('x-transform-error') &&
          res.headers.get('content-type') === 'application/json'
        ) {
          throw res;
        }

        return res;
      } catch (error) {
        this.fixErrorStack(error as Error);
        return this.#errorHandler(
          await this.#normalizeHTTPException(error),
          context
        );
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
      // NOTE: This is a workaround to avoid the error:
      // "TypeError: Illegal constructor"
      // when running tests in Cloudflare Workers.
      // new FetchEvent('fetch', {
      //  request,
      // });
      ({
        waitUntil: () => {},
        passThroughOnException: () => {},
      } as ExecutionContext);
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

  async #normalizeHTTPException(error: unknown): Promise<HTTPException> {
    // If it's an Error object, preserve original stack trace
    if (error instanceof Error) {
      return error;
    }

    // If it's a Response object, intelligently parse content
    if (error instanceof Response) {
      const clonedResponse = error.clone();
      let message = error.statusText;

      try {
        const contentType = clonedResponse.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const jsonData = await clonedResponse.json();
          if (jsonData && typeof jsonData === 'object') {
            message =
              jsonData.message ?? jsonData.error ?? JSON.stringify(jsonData);
          }
        } else {
          message = await clonedResponse.text();
        }
      } catch {
        message = error.statusText;
      }

      return createHttpError(error.status, message, { cause: error });
    }

    // If it's an object format error
    if (error && typeof error === 'object' && !Array.isArray(error)) {
      const errorObj = error as Record<string, any>;
      const status =
        errorObj.status >= 400 && errorObj.status < 600 ? errorObj.status : 500;
      const message =
        errorObj.message ?? errorObj.error ?? JSON.stringify(error);

      return createHttpError(status, message, {
        cause: error,
      });
    }

    // For other cases, convert to string
    return createHttpError(500, `Unknown error: ${String(error)}`, {
      cause: error,
    });
  }
}

export { Application };
