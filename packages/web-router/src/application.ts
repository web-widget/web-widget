/**
 * @fileoverview Application domain object - HTTP request/response lifecycle management
 */
import { callContext } from '@web-widget/context/server';
import { normalizeForwardedRequest } from '@web-widget/helpers/proxy';
import { createHttpError } from '@web-widget/helpers/error';
import { runMatchedStack } from './stack';
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
import {
  DEFAULT_MAX_REWRITE_DEPTH,
  assertRewriteAllowed,
  filterHandlersForRewrite,
  getRewriteState,
  popRewriteDestination,
  pushRewriteDestination,
  resolveRewriteDestination,
  rewritePathKey,
  type RewriteState,
} from './rewrite';
import {
  getPathForRequest,
  getPathForUrl,
  getPathNoStrictForRequest,
  getPathNoStrictForUrl,
} from './url';

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

const errorHandler = (error: unknown) => {
  console.error(error);
  const status =
    error &&
    typeof error === 'object' &&
    typeof (error as HTTPException).status === 'number' &&
    (error as HTTPException).status! >= 400
      ? (error as HTTPException).status!
      : 500;
  const message =
    status < 500 && error instanceof Error
      ? error.message
      : 'Internal Server Error';
  return new Response(message, {
    status,
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
  /**
   * Maximum nested `rewrite()` depth per request (cycle guard).
   * @default 10
   */
  maxRewriteDepth?: number;
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
  readonly #strict: boolean;
  readonly #usesCustomGetPath: boolean;

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
    this.#strict = strict;
    this.#usesCustomGetPath = !!options.getPath;
    this.getPath = strict
      ? (options.getPath ?? getPathForRequest)
      : getPathNoStrictForRequest;

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
    this.#maxRewriteDepth =
      options.maxRewriteDepth ?? DEFAULT_MAX_REWRITE_DEPTH;
  }

  #proxy: boolean = false;
  #maxRewriteDepth: number = DEFAULT_MAX_REWRITE_DEPTH;
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

  #pathForUrl(url: URL, env?: E['Bindings']): string {
    if (this.#usesCustomGetPath) {
      return this.getPath(new Request(url.href), { env });
    }
    return this.#strict ? getPathForUrl(url) : getPathNoStrictForUrl(url);
  }

  async #runMatchedStack(
    context: Context,
    method: string,
    path: string,
    rewriteState: RewriteState,
    options: {
      recordInitialHandlers: boolean;
      filterGlobalHandlers?: boolean;
    }
  ): Promise<Response> {
    let matched = this.#matchRoute(method, path);
    if (options.filterGlobalHandlers) {
      matched = filterHandlersForRewrite(matched, rewriteState);
    }

    const run = runMatchedStack(matched, {
      rewriteState,
      recordInitialHandlers: options.recordInitialHandlers,
    });

    return assertHandlerResponse(await run(context, this.#notFoundHandler));
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

    const context = new Context(request, {
      env,
      executionContext,
    });

    const rewriteState = getRewriteState(context);
    context.rewrite = (destination) =>
      this.#rewrite(context, destination, method, env, rewriteState);

    return (async () => {
      try {
        const res = await this.#runMatchedStack(
          context,
          method,
          path,
          rewriteState,
          { recordInitialHandlers: true }
        );

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
        // Re-enter AsyncLocalStorage / unctx scope so onError and fallbacks can use
        // context() and other ALS-backed APIs (see web-widget#716).
        return callContext(context, async () =>
          this.#errorHandler(await this.#normalizeHTTPException(error), context)
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

  async #rewrite(
    context: Context,
    destination: string | URL,
    method: string,
    env: E['Bindings'] | undefined,
    state: RewriteState
  ): Promise<Response> {
    assertRewriteAllowed(state);
    state._rewriteCalled = true;

    if (state._depth >= this.#maxRewriteDepth) {
      throw createHttpError(508, 'Maximum rewrite depth exceeded');
    }

    const resolved = resolveRewriteDestination(destination, context.request);
    const pathKey = rewritePathKey(resolved);

    pushRewriteDestination(state, pathKey);

    const internalPath = this.#pathForUrl(resolved, env);

    // Rewrite switches the active route branch. Reset route-derived context
    // so the target route can activate its own module/context consistently.
    this.#resetRouteDerivedContext(context);

    state._depth += 1;
    const previousRewriteCalled = state._rewriteCalled;
    const previousNextCompleted = state._nextCompleted;
    state._rewriteCalled = false;
    state._nextCompleted = false;

    try {
      return await this.#runMatchedStack(context, method, internalPath, state, {
        recordInitialHandlers: false,
        filterGlobalHandlers: true,
      });
    } finally {
      popRewriteDestination(state);
      state._depth -= 1;
      state._rewriteCalled = previousRewriteCalled;
      state._nextCompleted = previousNextCompleted;
    }
  }

  #resetRouteDerivedContext(context: Context): void {
    const routeContext = context as Context & {
      module?: unknown;
      meta?: unknown;
      render?: unknown;
      html?: unknown;
      renderOptions?: unknown;
      renderer?: unknown;
      data?: unknown;
      error?: unknown;
      _handler?: unknown;
    };
    routeContext.module = undefined;
    routeContext.meta = undefined;
    routeContext.render = undefined;
    routeContext.html = undefined;
    routeContext.renderOptions = undefined;
    routeContext.renderer = undefined;
    routeContext.data = undefined;
    routeContext.error = undefined;
    routeContext._handler = undefined;
  }

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
