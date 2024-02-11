import { compose } from '@web-widget/helpers';
import { Context } from './context';
import type { ExecutionContext } from './context';
import type { Router } from './router';
import { METHOD_NAME_ALL, METHODS, URLPatternRouter } from './router';
import type {
  Env,
  ErrorHandler,
  FetchEventLike,
  MiddlewareHandler,
  NotFoundHandler,
} from './types';
import { getPath, getPathNoStrict, mergePath } from './url';

type Methods = (typeof METHODS)[number];

interface RouterRoute {
  path: string;
  method: string;
  handler: MiddlewareHandler;
}

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

export type ApplicationOptions<E extends Env> = {
  strict?: boolean;
  router?: Router<MiddlewareHandler>;
  getPath?: GetPath<E>;
};

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
  routes: RouterRoute[] = [];

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
    // eslint-disable-next-line no-param-reassign
    delete options.strict;
    // Object.assign(this, options);
    this.getPath = strict ? options.getPath ?? getPath : getPathNoStrict;
    this.router = options.router ?? new URLPatternRouter();
  }

  #notFoundHandler: NotFoundHandler = notFoundHandler;
  #errorHandler: ErrorHandler = errorHandler;

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
    // eslint-disable-next-line no-param-reassign
    method = method.toUpperCase();
    this.router.add(method, path, handler);
    const r: RouterRoute = { path: path, method, handler };
    this.routes.push(r);
  }

  #matchRoute(method: string, path: string) {
    return this.router.match(method, path);
  }

  handler(
    request: Request,
    env: E['Bindings'] | undefined = Object.create(null),
    executionContext?: ExecutionContext | FetchEventLike,
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
        return res;
      } catch (error) {
        return this.#errorHandler(error, context);
      }
    })();
  }

  handleEvent = (event: FetchEventLike) => {
    return this.handler(event.request, undefined, event);
  };

  /**
   * @experimental
   */
  request = (
    input: RequestInfo | URL,
    requestInit?: RequestInit,
    Env?: E['Bindings'] | {},
    executionContext?: ExecutionContext
  ) => {
    if (input instanceof Request) {
      if (requestInit !== undefined) {
        // eslint-disable-next-line no-param-reassign
        input = new Request(input, requestInit);
      }
      return this.handler(input, Env, executionContext);
    }
    // eslint-disable-next-line no-param-reassign
    input = input.toString();
    const path = /^https?:\/\//.test(input)
      ? input
      : `http://localhost${mergePath('/', input)}`;
    const req = new Request(path, requestInit);
    return this.handler(req, Env, executionContext);
  };
}

export { Application };
