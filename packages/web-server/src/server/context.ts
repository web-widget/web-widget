/// <reference types="urlpattern-polyfill" />

import { Status } from "./status";
import * as router from "./router";
import { Manifest, ServerHandler, ServerConnInfo, Meta } from "./types";
import {
  default as DefaultErrorComponent,
  render as DefaultRender,
} from "./error.default";
import {
  ErrorPage,
  ErrorPageModule,
  WebServerOptions,
  Handler,
  Middleware,
  MiddlewareHandlerContext,
  MiddlewareModule,
  MiddlewareRoute,
  RenderPage,
  Route,
  RouteModule,
  UnknownPage,
  UnknownPageModule,
  RouterOptions,
} from "./types";
import { internalRender } from "./render";
import { ContentSecurityPolicyDirectives, SELF } from "./csp";
interface RouterState {
  state: Record<string, unknown>;
}

export class ServerContext {
  #dev: boolean;
  #routes: Route[];
  #renderPage: RenderPage;
  #middlewares: MiddlewareRoute[];
  #notFound: UnknownPage;
  #error: ErrorPage;
  #routerOptions: RouterOptions;

  constructor(
    routes: Route[],
    renderPage: RenderPage,
    middlewares: MiddlewareRoute[],
    notFound: UnknownPage,
    error: ErrorPage,
    routerOptions: RouterOptions,
    dev: boolean
  ) {
    this.#routes = routes;
    this.#renderPage = renderPage;
    this.#middlewares = middlewares;
    this.#notFound = notFound;
    this.#error = error;
    this.#routerOptions = routerOptions;
    this.#dev = dev;

    deepFreeze(this);
  }

  /**
   * Process the manifest into individual components and pages.
   */
  static fromManifest(
    manifest: Manifest,
    opts: WebServerOptions,
    dev: boolean
  ): ServerContext {
    // Extract all routes, and prepare them into the `Page` structure.
    const routes: Route[] = [];
    const middlewares: MiddlewareRoute[] = [];
    let notFound: UnknownPage = DEFAULT_NOT_FOUND;
    let error: ErrorPage = DEFAULT_ERROR;
    for (const { pathname, name, module } of manifest.routes) {
      const {
        config = {},
        default: component,
        handler = {},
        meta = [],
        render,
      } = module as RouteModule;
      if (typeof handler === "object" && handler.GET === undefined) {
        handler.GET = (_req, { render }) => render({ meta });
      }
      if (
        typeof handler === "object" &&
        handler.GET !== undefined &&
        handler.HEAD === undefined
      ) {
        const GET = handler.GET;
        handler.HEAD = async (req, ctx) => {
          const resp = await GET(req, ctx);
          resp.body?.cancel();
          return new Response(null, {
            headers: resp.headers,
            status: resp.status,
            statusText: resp.statusText,
          });
        };
      }
      routes.push({
        component,
        csp: Boolean(config.csp ?? false),
        handler,
        meta,
        name,
        pathname: config.routeOverride
          ? String(config.routeOverride)
          : pathname,
        render,
      });
    }
    for (const { pathname, module } of manifest.middlewares) {
      middlewares.push({
        pathname,
        compiledPattern: new URLPattern({ pathname }),
        ...(module as MiddlewareModule),
      });
    }
    if (manifest.notFound) {
      const { pathname, name, module } = manifest.notFound;
      const {
        default: component,
        render,
        config = {},
        meta = [],
      } = module as UnknownPageModule;
      let { handler } = module as UnknownPageModule;
      if (component && handler === undefined) {
        handler = (_req, { render }) => render({ meta });
      }

      notFound = {
        pathname,
        name,
        component,
        handler: handler ?? ((req) => router.defaultOtherHandler(req)),
        meta,
        render,
        csp: Boolean(config.csp ?? false),
      };
    }
    if (manifest.error) {
      const { pathname, name, module } = manifest.error;
      const {
        config = {},
        default: component,
        meta = [],
        render,
      } = module as ErrorPageModule;
      let { handler } = module as ErrorPageModule;
      if (component && handler === undefined) {
        handler = (_req, { render }) => render({ meta });
      }

      error = {
        component,
        csp: Boolean(config.csp ?? false),
        handler:
          handler ??
          ((req, ctx) => router.defaultErrorHandler(req, ctx, ctx.error)),
        meta,
        name,
        pathname,
        render,
      };
    }

    return new ServerContext(
      routes,
      opts.render ?? DEFAULT_RENDER_FN,
      middlewares,
      notFound,
      error,
      opts.router ?? DEFAULT_ROUTER_OPTIONS,
      dev
    );
  }

  /**
   * This functions returns a request handler that handles all routes required
   * by web server.
   */
  handler(): ServerHandler {
    const handlers = this.#handlers();
    const inner = router.router<RouterState>(handlers);
    const withMiddlewares = this.#composeMiddlewares(
      this.#middlewares,
      handlers.errorHandler
    );
    const trailingSlashEnabled = this.#routerOptions?.trailingSlash;
    return async function handler(
      req: Request,
      connInfo: ServerConnInfo = {}
    ): Promise<Response> {
      // Redirect requests that end with a trailing slash to their non-trailing
      // slash counterpart.
      // Ex: /about/ -> /about
      const url = new URL(req.url);
      if (
        url.pathname.length > 1 &&
        url.pathname.endsWith("/") &&
        !trailingSlashEnabled
      ) {
        // Remove trailing slashes
        const path = url.pathname.replace(/\/+$/, "");
        const location = `${path}${url.search}`;
        return new Response(null, {
          status: Status.TemporaryRedirect,
          headers: { location },
        });
      } else if (trailingSlashEnabled && !url.pathname.endsWith("/")) {
        return Response.redirect(url.href + "/", Status.PermanentRedirect);
      }

      return await withMiddlewares(req, connInfo, inner);
    };
  }

  /**
   * Identify which middlewares should be applied for a request,
   * chain them and return a handler response
   */
  #composeMiddlewares(
    middlewares: MiddlewareRoute[],
    errorHandler: router.ErrorHandler<RouterState>
  ) {
    return (
      req: Request,
      connInfo: ServerConnInfo,
      inner: router.FinalHandler<RouterState>
    ) => {
      // identify middlewares to apply, if any.
      // middlewares should be already sorted from deepest to shallow layer
      const mws = selectMiddlewares(req.url, middlewares);

      const handlers: (() => Response | Promise<Response>)[] = [];

      const middlewareCtx: MiddlewareHandlerContext = {
        next() {
          const handler = handlers.shift()!;
          return Promise.resolve(handler());
        },
        ...connInfo,
        state: {},
        destination: "route",
      };

      for (const mw of mws) {
        if (mw.handler instanceof Array) {
          for (const handler of mw.handler) {
            handlers.push(() => handler(req, middlewareCtx));
          }
        } else {
          const handler = mw.handler;
          handlers.push(() => handler(req, middlewareCtx));
        }
      }

      const ctx = {
        ...connInfo,
        state: middlewareCtx.state,
      };
      const { destination, handler } = inner(req, ctx);
      handlers.push(handler);
      middlewareCtx.destination = destination;
      return middlewareCtx.next().catch((e) => errorHandler(req, ctx, e));
    };
  }

  /**
   * This function returns all routes required by web server as an extended
   * path-to-regex, to handler mapping.
   */
  #handlers(): {
    internalRoutes: router.Routes<RouterState>;
    routes: router.Routes<RouterState>;

    otherHandler: router.Handler<RouterState>;
    errorHandler: router.ErrorHandler<RouterState>;
  } {
    const internalRoutes: router.Routes<RouterState> = {};
    const routes: router.Routes<RouterState> = {};

    const genRender = <Data = undefined>(
      route: Route<Data> | UnknownPage | ErrorPage,
      status: number
    ) => {
      const imports: string[] = [];
      return (
        req: Request,
        params: Record<string, string>,
        error?: unknown
      ) => {
        return async (
          {
            data,
            meta = [],
          }: {
            data?: any;
            meta?: Meta[];
          } = {},
          options?: ResponseInit
        ) => {
          // const preloads: string[] = [];
          const [body, csp] = await internalRender(
            {
              data,
              error,
              imports,
              meta,
              params,
              route,
              url: new URL(req.url),
            },
            this.#renderPage
          );

          const headers: Record<string, string> = {
            "content-type": "text/html; charset=utf-8",
          };

          if (csp) {
            if (this.#dev) {
              csp.directives.connectSrc = [
                ...(csp.directives.connectSrc ?? []),
                SELF,
              ];
            }
            const directive = serializeCSPDirectives(csp.directives);
            if (csp.reportOnly) {
              headers["content-security-policy-report-only"] = directive;
            } else {
              headers["content-security-policy"] = directive;
            }
          }

          return new Response(body, {
            status: options?.status ?? status,
            statusText: options?.statusText,
            headers: options?.headers
              ? { ...headers, ...options.headers }
              : headers,
          });
        };
      };
    };

    const createUnknownRender = genRender(this.#notFound, Status.NotFound);

    for (const route of this.#routes) {
      const meta = route.meta;
      const createRender = genRender(route, Status.OK);
      if (typeof route.handler === "function") {
        routes[route.pathname] = {
          default: (req, ctx, params) =>
            (route.handler as Handler)(req, {
              ...ctx,
              meta,
              params,
              render: createRender(req, params),
              renderNotFound: createUnknownRender(req, {}),
            }),
        };
      } else {
        routes[route.pathname] = {};
        for (const [method, handler] of Object.entries(route.handler)) {
          routes[route.pathname][method as router.KnownMethod] = (
            req,
            ctx,
            params
          ) =>
            handler(req, {
              ...ctx,
              meta,
              params,
              render: createRender(req, params),
              renderNotFound: createUnknownRender(req, {}),
            });
        }
      }
    }

    const otherHandler: router.Handler<RouterState> = (req, ctx) =>
      this.#notFound.handler(req, {
        ...ctx,
        meta: this.#notFound.meta,
        render: createUnknownRender(req, {}),
      });

    const errorHandlerRender = genRender(
      this.#error,
      Status.InternalServerError
    );
    const errorHandler: router.ErrorHandler<RouterState> = (
      req,
      ctx,
      error
    ) => {
      console.error(
        "%cAn error occurred during route handling or page rendering.",
        "color:red",
        error
      );
      return this.#error.handler(req, {
        ...ctx,
        error,
        meta: this.#error.meta,
        render: errorHandlerRender(req, {}, error),
      });
    };

    return { internalRoutes, routes, otherHandler, errorHandler };
  }
}

const DEFAULT_RENDER_FN: RenderPage = async (_ctx, render) => {
  await render();
};

const DEFAULT_ROUTER_OPTIONS: RouterOptions = {
  trailingSlash: false,
};

const DEFAULT_NOT_FOUND: UnknownPage = {
  csp: false,
  handler: (req) => router.defaultOtherHandler(req),
  meta: [],
  name: "_404",
  pathname: "",
  render: DefaultRender,
};

const DEFAULT_ERROR: ErrorPage = {
  component: DefaultErrorComponent,
  csp: false,
  handler: (_req, ctx) => ctx.render({ meta: [] }),
  meta: [],
  name: "_500",
  pathname: "",
  render: DefaultRender,
};

/**
 * Return a list of middlewares that needs to be applied for request url
 * @param url the request url
 * @param middlewares Array of middlewares handlers and their routes as path-to-regexp style
 */
export function selectMiddlewares(url: string, middlewares: MiddlewareRoute[]) {
  const selectedMws: Middleware[] = [];
  const reqURL = new URL(url);

  for (const { compiledPattern, handler } of middlewares) {
    const res = compiledPattern.exec(reqURL);
    if (res) {
      selectedMws.push({ handler });
    }
  }

  return selectedMws;
}

function serializeCSPDirectives(csp: ContentSecurityPolicyDirectives): string {
  return Object.entries(csp)
    .filter(([_key, value]) => value !== undefined)
    .map(([k, v]: [string, string | string[]]) => {
      // Turn camel case into snake case.
      const key = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      const value = Array.isArray(v) ? v.join(" ") : v;
      return `${key} ${value}`;
    })
    .join("; ");
}

function deepFreeze(object: any) {
  Object.freeze(object);

  // Retrieve the property names defined on object
  const propNames = Reflect.ownKeys(object);

  // Freeze properties before freezing self
  for (const name of propNames) {
    const value = object[name];

    if (
      ((value && typeof value === "object") || typeof value === "function") &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  }

  return object;
}
