/**
 * @fileoverview Application domain object - HTTP request/response lifecycle management
 */
import { callContext } from '@web-widget/context/server';
import { compose } from '@web-widget/helpers';
import { normalizeForwardedRequest } from '@web-widget/helpers/proxy';
import { createHttpError } from '@web-widget/helpers/error';
import { Context } from './context';
import { hasRouteActivation } from './module';
import type { Router } from './router';
import {
  METHOD_NAME_ALL,
  METHODS,
  createRouter,
  getDefaultRouterType,
  isValidRouterType,
  type Result,
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
type DispatchMode = 'initial' | 'rewrite';

const GLOBAL_ROUTE_PATTERN = '*';

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

function assertHandlerResponse(res: void | Response | undefined): Response {
  if (!res) {
    throw new Error(
      'Response is not finalized. You may forget returning Response object or `return next()`.'
    );
  }
  if (!(res instanceof Response)) {
    throw new TypeError('Response must be an instance of Response.');
  }
  return res;
}

function pathKeyFromUrl(url: string | URL): string {
  const parsed = typeof url === 'string' ? new URL(url) : url;
  return parsed.pathname + parsed.search;
}

function resetRouteActivationOnViewChange(
  context: Context,
  onRouteContextReset: ((context: Context) => void) | undefined
): void {
  if (onRouteContextReset) {
    onRouteContextReset(context);
    return;
  }

  if (hasRouteActivation(context)) {
    throw new Error('Route context was not invalidated on rewrite');
  }
}

function toInternalRequest(request: Request): Request {
  if (request.method !== 'HEAD') {
    return request;
  }
  return new Request(request.url, {
    method: 'GET',
    headers: request.headers,
  });
}

function finalizeHeadResponse(
  originalRequest: Request,
  response: Response
): Response {
  if (originalRequest.method !== 'HEAD') {
    return response;
  }
  if (response.body && !response.body.locked) {
    response.body.cancel();
  }
  return new Response(null, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function filterExecutedGlobalHandlers(
  handlers: Result<MiddlewareHandler>,
  executedGlobalHandlers: WeakSet<MiddlewareHandler>
): Result<MiddlewareHandler> {
  return handlers.filter(
    (entry) =>
      entry[2] !== GLOBAL_ROUTE_PATTERN || !executedGlobalHandlers.has(entry[0])
  );
}

type GetPath<E extends Env> = (
  request: Request,
  options?: { env?: E['Bindings'] }
) => string;

interface DispatchState<E extends Env = Env> {
  executedGlobalHandlers: WeakSet<MiddlewareHandler>;
  nextCompleted: boolean;
  visited: Set<string>;
  method: string;
  env: E['Bindings'] | undefined;
}

export interface ApplicationOptions<E extends Env> {
  strict?: boolean;
  router?: Router<MiddlewareHandler>;
  getPath?: GetPath<E>;
  /** @internal */
  onRouteContextReset?: (context: Context) => void;
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
    this.getPath = strict ? (options.getPath ?? getPath) : getPathNoStrict;

    if (options.router) {
      this.router = options.router;
    } else {
      if (!isValidRouterType(routerType)) {
        throw new Error(`Invalid router type: ${routerType}`);
      }
      this.router = createRouter<MiddlewareHandler>(routerType);
    }

    this.#proxy = !!options.proxy;
    this.#onRouteContextReset = options.onRouteContextReset;
  }

  #proxy: boolean = false;
  #notFoundHandler: NotFoundHandler = notFoundHandler;
  #errorHandler: ErrorHandler = errorHandler;
  #onRouteContextReset?: (context: Context) => void;

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

  /** @internal Resets route activation on rewrite and when a request completes. */
  bindRouteLifecycle(onReset: (context: Context) => void): this {
    this.#onRouteContextReset = onReset;
    return this;
  }

  #addRoute(method: string, path: string, handler: MiddlewareHandler) {
    method = method.toUpperCase();
    this.router.add(method, path, handler);
  }

  #matchRoute(method: string, path: string) {
    return this.router.match(method, path);
  }

  // NOTE: Node cannot resolve `new Request('/path', prev)`; pre-resolve relative URLs.
  #createRewriteRequest(
    context: Context,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Request {
    const prev = context.request;

    if (input instanceof Request) {
      let resolved: Request | URL = input;
      try {
        new URL(input.url);
      } catch {
        resolved = new URL(input.url, prev.url);
      }
      if (resolved instanceof Request) {
        return init ? new Request(resolved, init) : resolved;
      }
      return new Request(resolved, init ?? prev);
    }

    const resolved = input instanceof URL ? input : new URL(input, prev.url);
    return new Request(resolved, init ?? prev);
  }

  #rewrite(
    context: Context,
    state: DispatchState,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (state.nextCompleted) {
      throw new Error(
        'Cannot change internal request after next() has completed.'
      );
    }

    const prev = context.request;
    const nextRequest = this.#createRewriteRequest(context, input, init);
    const nextUrl = new URL(nextRequest.url);
    const currentUrl = new URL(prev.url);

    if (nextUrl.origin !== currentUrl.origin) {
      throw new Error('Rewrite destination must be same-origin or relative');
    }

    const nextPathKey = pathKeyFromUrl(nextUrl);
    const currentPathKey = pathKeyFromUrl(currentUrl);
    const routeViewChanged =
      nextPathKey !== currentPathKey || nextRequest.method !== prev.method;

    if (nextPathKey !== currentPathKey) {
      if (state.visited.has(nextPathKey)) {
        throw createHttpError(508, 'Rewrite loop detected');
      }
      state.visited.add(nextPathKey);
    }

    if (routeViewChanged) {
      resetRouteActivationOnViewChange(context, this.#onRouteContextReset);
    }

    context.updateRequest(nextRequest);
    state.method = nextRequest.method;

    const path = this.getPath(context.request, { env: state.env });
    return this.#dispatchMatched(context, path, state, 'rewrite');
  }

  async #dispatchMatched(
    context: Context,
    path: string,
    state: DispatchState,
    mode: DispatchMode = 'initial'
  ): Promise<Response> {
    let matched = this.#matchRoute(state.method, path);
    if (mode === 'rewrite') {
      matched = filterExecutedGlobalHandlers(
        matched,
        state.executedGlobalHandlers
      );
    }

    const composed = compose<(typeof matched)[0], Context>(
      matched,
      (entry) => {
        context.params = entry[1];
        context.pathname = entry[2];
        if (mode === 'initial' && entry[2] === GLOBAL_ROUTE_PATTERN) {
          state.executedGlobalHandlers.add(entry[0]);
        }
        return entry[0];
      },
      {
        wrapAdvance: (advance) => {
          return () =>
            advance().then(
              (response) => {
                state.nextCompleted = true;
                return response;
              },
              (error) => {
                state.nextCompleted = true;
                throw error;
              }
            );
        },
      }
    );

    const res = await composed(context, this.#notFoundHandler);
    return assertHandlerResponse(res);
  }

  handler(
    request: Request,
    env: E['Bindings'] | undefined = Object.create(null),
    executionContext?: ExecutionContext
  ): Response | Promise<Response> {
    if (this.#proxy) {
      request = normalizeForwardedRequest(request);
    }

    const originalRequest = request;
    const internalRequest = toInternalRequest(originalRequest);

    const path = this.getPath(internalRequest, { env });
    const context = new Context(internalRequest, {
      env,
      executionContext,
      originalRequest,
    });

    const state: DispatchState = {
      executedGlobalHandlers: new WeakSet(),
      nextCompleted: false,
      visited: new Set([pathKeyFromUrl(internalRequest.url)]),
      method: internalRequest.method,
      env,
    };

    context.rewrite = (input, init) =>
      this.#rewrite(context, state, input, init);

    return (async () => {
      try {
        const res = await this.#dispatchMatched(context, path, state);

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

        return finalizeHeadResponse(originalRequest, res);
      } catch (error) {
        this.fixErrorStack(error as Error);
        // Re-enter AsyncLocalStorage / unctx scope so onError and fallbacks can use
        // context() and other ALS-backed APIs (see web-widget#716).
        return callContext(context, async () =>
          finalizeHeadResponse(
            originalRequest,
            await this.#errorHandler(
              await this.#normalizeHTTPException(error),
              context
            )
          )
        );
      } finally {
        this.#onRouteContextReset?.(context);
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
      let stack: string | undefined;

      try {
        const contentType = clonedResponse.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const jsonData = await clonedResponse.json();
          if (jsonData && typeof jsonData === 'object') {
            message =
              jsonData.message ?? jsonData.error ?? JSON.stringify(jsonData);
            stack =
              typeof jsonData.stack === 'string'
                ? jsonData.stack || undefined
                : undefined;
          }
        } else {
          message = await clonedResponse.text();
        }
      } catch {
        message = error.statusText;
      }

      return createHttpError(error.status, message, {
        cause: error,
        ...(stack !== undefined ? { stack } : {}),
      });
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
