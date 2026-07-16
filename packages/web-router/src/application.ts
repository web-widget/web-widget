/**
 * @fileoverview Application domain object - HTTP request/response lifecycle management
 */
import { callContext } from '@web-widget/context/server';
import { normalizeForwardedRequest } from '@web-widget/helpers/proxy';
import { createHttpError } from '@web-widget/helpers/error';
import { Context, type RequestInput, type RequestSource } from './context';
import { ModuleRuntime, type DevMetaProvider } from './module';
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
const REQUEST_SOURCE_HANDLER = Symbol.for(
  '@web-widget/web-router.request-source-handler'
);

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

// NOTE: Node cannot resolve `new Request('/path', prev)`; pre-resolve relative URLs.
function createRewriteRequest(
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

function resetRouteActivationOnViewChange(
  context: Context,
  moduleRuntime: ModuleRuntime | undefined
): void {
  if (moduleRuntime) {
    moduleRuntime.clearActivation(context);
    return;
  }

  if (ModuleRuntime.hasActivation(context)) {
    throw new Error('Route context was not invalidated on rewrite');
  }
}

function materializeRequest(request: RequestInput): Request {
  return 'toRequest' in request ? request.toRequest() : request;
}

function toInternalRequest(request: RequestInput): RequestInput {
  if (request.method !== 'HEAD') {
    return request;
  }
  request = materializeRequest(request);
  return new Request(request.url, {
    method: 'GET',
    headers: request.headers,
  });
}

function finalizeHeadResponse(
  originalMethod: string,
  response: Response
): Response {
  if (originalMethod !== 'HEAD') {
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

function filterExecutedHandlers(
  handlers: Result<MiddlewareHandler>,
  executedHandlers: MiddlewareHandler[]
): Result<MiddlewareHandler> {
  return handlers.filter((entry) => !executedHandlers.includes(entry[0]));
}

type GetPath<E extends Env> = (
  request: Request,
  options?: { env?: E['Bindings'] }
) => string;

interface DispatchFrame<E extends Env = Env> {
  /**
   * Handlers that have started in this request (rewrite re-match skips these).
   * NOTE: Tracked by function reference — do not register the same handler on
   * multiple routes; a second registration would be skipped after the first runs.
   */
  executedHandlers: MiddlewareHandler[];
  subsequentInternalRequest?: Request;
  nextCompleted: boolean;
  visited?: Set<string>;
  method: string;
  env: E['Bindings'] | undefined;
}

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
  #getPathRequiresRequest = false;

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
    this.#getPathRequiresRequest = strict && options.getPath !== undefined;
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
  }

  #proxy: boolean = false;
  #notFoundHandler: NotFoundHandler = notFoundHandler;
  #errorHandler: ErrorHandler = errorHandler;
  #moduleRuntime?: ModuleRuntime;
  #rewriteDispatcher = (
    context: Context,
    state: unknown,
    input: RequestInfo | URL,
    init?: RequestInit
  ) => this.#rewrite(context, state as DispatchFrame, input, init);

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

  /** @internal Clears route activation on rewrite and when a request completes. */
  useModuleRuntime(runtime: ModuleRuntime): this {
    this.#moduleRuntime = runtime;
    return this;
  }

  /** @internal Sets the dev meta provider at runtime (used by vite-plugin dev middleware). */
  setDevMetaProvider(provider: DevMetaProvider): this {
    this.#moduleRuntime?.setDevMetaProvider(provider);
    return this;
  }

  #addRoute(method: string, path: string, handler: MiddlewareHandler) {
    method = method.toUpperCase();
    this.router.add(method, path, handler);
  }

  #matchRoute(method: string, path: string) {
    return this.router.match(method, path);
  }

  #getInitialPath(request: RequestInput, env: E['Bindings'] | undefined) {
    const input = this.#getPathRequiresRequest
      ? materializeRequest(request)
      : (request as Request);
    return this.getPath(input, { env });
  }

  #rewrite(
    context: Context,
    frame: DispatchFrame,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (frame.nextCompleted) {
      throw new Error(
        'Cannot change internal request after next() has completed.'
      );
    }

    const callerRequest = context.request;
    const nextRequest = createRewriteRequest(context, input, init);
    const nextUrl = new URL(nextRequest.url);
    const currentUrl = new URL(callerRequest.url);

    if (nextUrl.origin !== currentUrl.origin) {
      throw new Error('Rewrite destination must be same-origin or relative');
    }

    const nextPathKey = pathKeyFromUrl(nextUrl);
    const currentPathKey = pathKeyFromUrl(currentUrl);
    const routeViewChanged =
      nextPathKey !== currentPathKey ||
      nextRequest.method !== callerRequest.method;

    if (nextPathKey !== currentPathKey) {
      const visited = (frame.visited ??= new Set([currentPathKey]));
      if (visited.has(nextPathKey)) {
        throw createHttpError(508, 'Rewrite loop detected');
      }
      visited.add(nextPathKey);
    }

    if (routeViewChanged) {
      resetRouteActivationOnViewChange(context, this.#moduleRuntime);
    }

    context.updateRequest(nextRequest);
    frame.method = nextRequest.method;

    const path = this.getPath(context.request, { env: frame.env });
    return Promise.resolve(
      this.#dispatchMatched(context, path, frame, 'rewrite')
    ).finally(() => {
      context.updateRequest(callerRequest);
      frame.subsequentInternalRequest = nextRequest;
      frame.method = nextRequest.method;
    });
  }

  #dispatchMatched(
    context: Context,
    path: string,
    frame: DispatchFrame,
    mode: DispatchMode = 'initial'
  ): Response | Promise<Response> {
    let matched = this.#matchRoute(frame.method, path);
    if (mode === 'rewrite') {
      matched = filterExecutedHandlers(matched, frame.executedHandlers);
    }

    // Most requests resolve to a single handler. Keep this path synchronous
    // when the handler is synchronous, matching Hono's low-overhead dispatch
    // branch and avoiding an async function/recursive dispatcher allocation.
    if (matched.length === 1) {
      const entry = matched[0];
      context.params = entry[1];
      context.pathname = entry[2];
      frame.executedHandlers.push(entry[0]);

      let nextCalled = false;
      const next = () => {
        if (nextCalled) {
          throw new Error('next() called multiple times.');
        }
        nextCalled = true;
        if (frame.subsequentInternalRequest) {
          context.updateRequest(frame.subsequentInternalRequest);
          frame.method = frame.subsequentInternalRequest.method;
        }
        return Promise.resolve(this.#notFoundHandler(context)).then(
          (response) => {
            frame.nextCompleted = true;
            return response;
          },
          (error: unknown) => {
            frame.nextCompleted = true;
            throw error;
          }
        );
      };

      const result = entry[0](context, next);
      return result instanceof Promise
        ? result.then(assertHandlerResponse)
        : assertHandlerResponse(result);
    }

    let index = -1;
    const dispatch = (nextIndex: number): Response | Promise<Response> => {
      if (nextIndex <= index) {
        throw new Error('next() called multiple times.');
      }
      index = nextIndex;

      const entry = matched[nextIndex];
      if (!entry) {
        return this.#notFoundHandler(context);
      }

      context.params = entry[1];
      context.pathname = entry[2];
      frame.executedHandlers.push(entry[0]);

      const next = () => {
        if (frame.subsequentInternalRequest) {
          context.updateRequest(frame.subsequentInternalRequest);
          frame.method = frame.subsequentInternalRequest.method;
        }
        return Promise.resolve(dispatch(nextIndex + 1)).then(
          (response) => {
            frame.nextCompleted = true;
            return response;
          },
          (error: unknown) => {
            frame.nextCompleted = true;
            throw error;
          }
        );
      };

      const result = entry[0](context, next);
      return result instanceof Promise
        ? result.then(assertHandlerResponse)
        : assertHandlerResponse(result);
    };

    return dispatch(0);
  }

  handler(
    request: Request,
    env: E['Bindings'] | undefined = Object.create(null),
    executionContext?: ExecutionContext
  ): Response | Promise<Response> {
    return this.#handleRequest(request, env, executionContext);
  }

  [REQUEST_SOURCE_HANDLER](
    request: RequestSource,
    env: E['Bindings'] | undefined = Object.create(null),
    executionContext?: ExecutionContext
  ): Response | Promise<Response> {
    return this.#handleRequest(request, env, executionContext);
  }

  #handleRequest(
    request: RequestInput,
    env: E['Bindings'] | undefined,
    executionContext?: ExecutionContext
  ): Response | Promise<Response> {
    if (this.#proxy) {
      request = normalizeForwardedRequest(materializeRequest(request));
    }

    const originalRequest = request;
    const originalMethod = originalRequest.method;
    const internalRequest = toInternalRequest(originalRequest);

    const path = this.#getInitialPath(internalRequest, env);
    const context = new Context(internalRequest, {
      env,
      executionContext,
      originalRequest,
    });

    const frame: DispatchFrame = {
      executedHandlers: [],
      nextCompleted: false,
      method: internalRequest.method,
      env,
    };

    context.setRewriteDispatcher(this.#rewriteDispatcher, frame);

    let result: Response | Promise<Response>;
    try {
      result = this.#dispatchMatched(context, path, frame);
    } catch (error) {
      return this.#handleError(error, context, originalMethod);
    }

    if (!(result instanceof Promise)) {
      try {
        const finalized = finalizeHeadResponse(originalMethod, result);
        this.#releaseRouteActivation(context);
        return finalized;
      } catch (error) {
        return this.#handleError(error, context, originalMethod);
      }
    }

    return result.then(
      (response) => {
        try {
          const finalized = finalizeHeadResponse(originalMethod, response);
          this.#releaseRouteActivation(context);
          return finalized;
        } catch (error) {
          return this.#handleError(error, context, originalMethod);
        }
      },
      (error) => this.#handleError(error, context, originalMethod)
    );
  }

  #handleError(
    error: unknown,
    context: Context,
    originalMethod: string
  ): Response | Promise<Response> {
    this.fixErrorStack(error as Error);
    // Re-enter AsyncLocalStorage / unctx scope so onError and fallbacks can use
    // context() and other ALS-backed APIs (see web-widget#716).
    const handled = callContext(context, async () =>
      finalizeHeadResponse(
        originalMethod,
        await this.#errorHandler(
          await this.#normalizeHTTPException(error),
          context
        )
      )
    );
    return handled instanceof Promise
      ? handled.finally(() => this.#releaseRouteActivation(context))
      : (this.#releaseRouteActivation(context), handled);
  }

  /** Clears route activation after dispatch; defers until `waitUntil` tasks finish. */
  #releaseRouteActivation(context: Context<E>): void {
    const runtime = this.#moduleRuntime;
    if (!runtime) {
      return;
    }

    const pending = context.getPendingBackgroundTasks();
    if (pending.length > 0) {
      void Promise.allSettled(pending).finally(() => {
        runtime.clearActivation(context);
      });
      return;
    }

    runtime.clearActivation(context);
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
