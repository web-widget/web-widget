import { compose } from "./compose";
import { Context } from "./context";
import type { ExecutionContext } from "./context";
import type { Router } from "./router";
import {
  METHOD_NAME_ALL_LOWERCASE,
  METHOD_NAME_ALL,
  METHODS,
  URLPatternRouter,
} from "./router";
import type {
  Env,
  ErrorHandler,
  FetchEventLike,
  H,
  HandlerInterface,
  MergePath,
  MergeSchemaPath,
  MiddlewareHandler,
  MiddlewareHandlerInterface,
  Next,
  NotFoundHandler,
  OnHandlerInterface,
  Schema,
} from "./types";
import { getPath, getPathNoStrict, mergePath } from "./url";

type Methods = (typeof METHODS)[number] | typeof METHOD_NAME_ALL_LOWERCASE;

interface RouterRoute {
  path: string;
  method: string;
  handler: H;
}

function defineDynamicClass(): {
  new <
    E extends Env = Env,
    S extends Schema = {},
    BasePath extends string = "/",
  >(): {
    [M in Methods]: HandlerInterface<E, M, S, BasePath>;
  } & {
    /**
     * @experimental
     */
    on: OnHandlerInterface<E, S, BasePath>;
  } & {
    /**
     * @experimental
     */
    use: MiddlewareHandlerInterface<E, S, BasePath>;
  };
} {
  return class {} as never;
}

const notFoundHandler = () => {
  return new Response("404 Not Found", {
    status: 404,
  });
};

const errorHandler = (err: Error) => {
  console.error(err);
  const message = "Internal Server Error";
  return new Response(message, {
    status: 500,
  });
};

type GetPath<E extends Env> = (
  request: Request,
  options?: { env?: E["Bindings"] }
) => string;

export type ApplicationOptions<E extends Env> = {
  strict?: boolean;
  router?: Router<H>;
  getPath?: GetPath<E>;
};

class Application<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = "/",
> extends defineDynamicClass()<E, S, BasePath> {
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router!: Router<H>;
  readonly getPath: GetPath<E>;
  #basePath: string = "/";
  #path: string = "/";
  routes: RouterRoute[] = [];

  constructor(options: ApplicationOptions<E> = {}) {
    super();

    // Implementation of app.get(...handlers[]) or app.get(path, ...handlers[])
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1: string | H, ...args: H[]) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          if (typeof handler !== "string") {
            this.#addRoute(method, this.#path, handler);
          }
        });
        return this;
      };
    });

    // Implementation of app.on(method, path, ...handlers[])
    this.on = (method: string | string[], path: string, ...handlers: H[]) => {
      if (!method) return this;
      this.#path = path;
      for (const m of [method].flat()) {
        handlers.forEach((handler) => {
          this.#addRoute(m.toUpperCase(), this.#path, handler);
        });
      }
      return this;
    };

    // Implementation of app.use(...handlers[]) or app.get(path, ...handlers[])
    this.use = (
      arg1: string | MiddlewareHandler<any>,
      ...handlers: MiddlewareHandler<any>[]
    ) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };

    const strict = options.strict ?? true;
    delete options.strict;
    Object.assign(this, options);
    this.getPath = strict ? options.getPath ?? getPath : getPathNoStrict;
    this.router = options.router ?? new URLPatternRouter();
  }

  #clone(): Application<E, S, BasePath> {
    const clone = new Application<E, S, BasePath>({
      router: this.router,
      getPath: this.getPath,
    });
    clone.routes = this.routes;
    return clone;
  }

  #notFoundHandler: NotFoundHandler = notFoundHandler;
  #errorHandler: ErrorHandler = errorHandler;

  /**
   * @experimental
   */
  route<
    SubPath extends string,
    SubEnv extends Env,
    SubSchema extends Schema,
    SubBasePath extends string,
  >(
    path: SubPath,
    app?: Application<SubEnv, SubSchema, SubBasePath>
  ): Application<
    E,
    MergeSchemaPath<SubSchema, MergePath<BasePath, SubPath>> & S,
    BasePath
  > {
    const subApp = this.basePath(path);

    if (!app) {
      return subApp;
    }

    app.routes.forEach((r) => {
      const handler =
        app.#errorHandler === errorHandler
          ? r.handler
          : async (c: Context, next: Next) =>
              await compose<Context>([], app.#errorHandler)(c, () =>
                r.handler(c, next)
              );
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }

  /**
   * @experimental
   */
  basePath<SubPath extends string>(
    path: SubPath
  ): Application<E, S, MergePath<BasePath, SubPath>> {
    const subApp = this.#clone();
    subApp.#basePath = mergePath(this.#basePath, path);
    return subApp;
  }

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

  #addRoute(method: string, path: string, handler: H) {
    method = method.toUpperCase();
    path = mergePath(this.#basePath, path);
    this.router.add(method, path, handler);
    const r: RouterRoute = { path: path, method: method, handler: handler };
    this.routes.push(r);
  }

  #matchRoute(method: string, path: string) {
    return this.router.match(method, path);
  }

  #handleError(err: unknown, c: Context<E>) {
    if (err instanceof Error) {
      return this.#errorHandler(err, c);
    }
    throw err;
  }

  #dispatch(
    request: Request,
    requester: ExecutionContext | FetchEventLike | undefined,
    env: E["Bindings"] | undefined = Object.create(null),
    method: string
  ): Response | Promise<Response> {
    // Handle HEAD method
    if (method === "HEAD") {
      return (async () =>
        new Response(
          null,
          await this.#dispatch(request, requester, env, "GET")
        ))();
    }

    const path = this.getPath(request, { env });
    const [handlers] = this.#matchRoute(method, path);

    const c = new Context(request, {
      env,
      requester,
    });

    const composed = compose<Context>(
      handlers,
      this.#errorHandler,
      this.#notFoundHandler
    );

    return (async () => {
      try {
        const res = await composed(c);
        if (!res) {
          throw new Error(
            "Response is not finalized. You may forget returning Response object or `return next()`"
          );
        }
        return res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }

  handleEvent = (event: FetchEventLike) => {
    return this.#dispatch(
      event.request,
      event,
      undefined,
      event.request.method
    );
  };

  handler = (
    request: Request,
    requester?: ExecutionContext,
    Env?: E["Bindings"] | {}
  ) => {
    return this.#dispatch(request, requester, Env, request.method);
  };

  /**
   * @experimental
   */
  request = (
    input: RequestInfo | URL,
    requestInit?: RequestInit,
    requester?: ExecutionContext,
    Env?: E["Bindings"] | {}
  ) => {
    if (input instanceof Request) {
      if (requestInit !== undefined) {
        input = new Request(input, requestInit);
      }
      return this.handler(input, requester, Env);
    }
    input = input.toString();
    const path = /^https?:\/\//.test(input)
      ? input
      : `http://localhost${mergePath("/", input)}`;
    const req = new Request(path, requestInit);
    return this.handler(req, requester, Env);
  };
}

export { Application };
