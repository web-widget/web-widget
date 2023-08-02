import {
  createHttpError,
  HttpStatus,
  mergeMeta,
  rebaseMeta,
} from "@web-widget/schema/server";
import type {
  HttpError,
  Meta,
  RouteError,
  RouteHandler,
  RouteModule,
  RouteRender,
  RouteRenderResult,
} from "@web-widget/schema/server";
import * as router from "./router";
import {
  default as defaultErrorComponent,
  render as defaultRender,
} from "./error.default";
import type {
  Manifest,
  Middleware,
  MiddlewareHandlerContext,
  MiddlewareModule,
  MiddlewareRoute,
  Page,
  RenderPage,
  RouterOptions,
  ServerConnInfo,
  ServerHandler,
  WebRouterOptions,
} from "./types";

import { internalRender } from "./render";
import {
  type ContentSecurityPolicy,
  type ContentSecurityPolicyDirectives,
  SELF,
} from "./csp";

interface RouterState {
  request: Request;
  state: Record<string, unknown>;
}

export class ServerContext {
  #dev: boolean;
  #fallbacks: Page[];
  #middlewares: MiddlewareRoute[];
  #renderPage: RenderPage;
  #routerOptions: RouterOptions;
  #routes: Page[];

  constructor(
    dev: boolean,
    fallbacks: Page[],
    middlewares: MiddlewareRoute[],
    renderPage: RenderPage,
    routerOptions: RouterOptions,
    routes: Page[]
  ) {
    this.#dev = dev;
    this.#fallbacks = fallbacks;
    this.#middlewares = middlewares;
    this.#renderPage = renderPage;
    this.#routerOptions = routerOptions;
    this.#routes = routes;
    deepFreeze(this);
  }

  /**
   * Process the manifest into individual components and pages.
   */
  static async fromManifest(
    routemap: string | URL | Manifest,
    opts: WebRouterOptions,
    dev: boolean
  ): Promise<ServerContext> {
    let manifest: Manifest;
    let root: string;
    const base = opts?.client?.base ?? "/";
    const loader =
      opts?.loader ??
      ((module) => import(/* @vite-ignore */ /* webpackIgnore: true */ module));

    if (routemap instanceof URL) {
      routemap = routemap.href;
    }

    if (typeof routemap === "string") {
      root = fileUrlDirname(routemap);
      manifest =
        routemap.endsWith(".json") && !opts?.loader
          ? await (await fetch(routemap)).json()
          : await loader(routemap);
    } else {
      if (typeof opts.root !== "string") {
        throw new TypeError(`options.root: Must be a string.`);
      }
      root = opts.root;
      manifest = routemap;
    }

    // Extract all routes, and prepare them into the `Page` structure.
    const routes: Page[] = [];
    const middlewares: MiddlewareRoute[] = [];
    const fallbacks: Page[] = [];

    const resolveRouteModule = async (file: string) => {
      const url = fileUrlJoin(root, file);
      const dirname = fileUrlDirname(url).replace(root, "");
      const module = (await loader(url)) as RouteModule;
      const { meta = {} } = module;
      const rebasedMeta = rebaseMeta(
        mergeMeta(DEFAULT_META, meta),
        base + dirname
      );
      return {
        ...module,
        file,
        meta: rebasedMeta,
      };
    };

    const resolveMiddlewareModule = async (file: string) => {
      const module = (await loader(
        fileUrlJoin(root, file)
      )) as MiddlewareModule;
      return {
        ...module,
        file,
      };
    };

    const emptyRender = async () => {
      throw createHttpError(500, `Module does not export render function.`);
    };

    for (const {
      pathname,
      name,
      module: mod,
      source: file,
    } of manifest.routes ?? []) {
      const source = typeof mod === "string" ? mod : (file as string);
      const module =
        typeof mod === "string"
          ? await resolveRouteModule(mod)
          : (mod as RouteModule);
      const {
        config = {},
        handler = {},
        meta = {},
        render = emptyRender,
      } = module;

      if (typeof handler === "object" && handler.GET === undefined) {
        handler.GET = (({ render }) => render({ meta })) as RouteHandler;
      }
      if (
        typeof handler === "object" &&
        handler.GET !== undefined &&
        handler.HEAD === undefined
      ) {
        const GET = handler.GET as RouteHandler;
        handler.HEAD = (async (ctx) => {
          const resp = await GET(ctx);
          resp.body?.cancel();
          return new Response(null, {
            headers: resp.headers,
            status: resp.status,
            statusText: resp.statusText,
          });
        }) as RouteHandler;
      }
      routes.push({
        bootstrap: [],
        config,
        csp: Boolean(config.csp ?? false),
        handler: handler as RouteHandler,
        meta,
        module,
        name: name ?? pathname,
        pathname: config.routeOverride
          ? String(config.routeOverride)
          : pathname,
        render,
        source,
      });
    }

    for (const {
      pathname,
      name,
      module: mod,
      source: file,
    } of manifest.fallbacks ?? []) {
      const source = typeof mod === "string" ? mod : (file as string);
      const module =
        typeof mod === "string"
          ? await resolveRouteModule(mod)
          : (mod as RouteModule);
      const {
        default: component,
        fallback,
        config = {},
        meta = {},
        render = emptyRender,
      } = module;

      let { handler } = module;

      if (handler !== null && typeof handler === "object") {
        throw new TypeError(
          `manifest.fallbacks[].handler: Must be a function.`
        );
      }

      if ((component || fallback) && handler === undefined) {
        handler = ({ render }) =>
          render({
            meta,
          });
      }

      fallbacks.push({
        bootstrap: [],
        config,
        csp: Boolean(config.csp ?? false),
        handler:
          handler ?? name === HttpStatus[404]
            ? (ctx) => router.defaultOtherHandler(ctx)
            : (ctx) => router.defaultErrorHandler(ctx, ctx.error),
        meta,
        module,
        name: name ?? pathname,
        pathname,
        render,
        source,
      });
    }

    if (!fallbacks.some((page) => page.name === HttpStatus[404])) {
      fallbacks.push(DEFAULT_NOT_FOUND);
    }

    if (!fallbacks.some((page) => page.name === HttpStatus[500])) {
      fallbacks.push(DEFAULT_ERROR);
    }

    for (const {
      pathname,
      module: mod,
      source: file,
    } of manifest.middlewares ?? []) {
      const source = typeof mod === "string" ? mod : (file as string);
      const module =
        typeof mod === "string"
          ? await resolveMiddlewareModule(source)
          : (mod as MiddlewareModule);
      middlewares.push({
        pathname,
        compiledPattern: new URLPattern({ pathname }),
        ...module,
      });
    }

    return new ServerContext(
      dev,
      fallbacks,
      middlewares,
      opts.render ?? DEFAULT_RENDER_FN,
      opts.router ?? DEFAULT_ROUTER_OPTIONS,
      routes
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
          status: HttpStatus.TemporaryRedirect,
          headers: { location },
        });
      } else if (trailingSlashEnabled && !url.pathname.endsWith("/")) {
        return Response.redirect(url.href + "/", HttpStatus.PermanentRedirect);
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
        destination: "route",
        request: req,
        state: {},
      };

      for (const mw of mws) {
        if (mw.handler instanceof Array) {
          for (const handler of mw.handler) {
            handlers.push(() => handler(middlewareCtx));
          }
        } else {
          const handler = mw.handler;
          handlers.push(() => handler(middlewareCtx));
        }
      }

      const ctx = {
        ...connInfo,
        request: req,
        state: middlewareCtx.state,
      };
      const { destination, handler } = inner(ctx);
      handlers.push(handler);
      middlewareCtx.destination = destination;
      return middlewareCtx.next().catch((e) => errorHandler(ctx, e));
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
    const notFoundPage = this.#fallbacks.find(
      (page) => page.name === HttpStatus[404]
    ) as Page;
    const errorPage = this.#fallbacks.find(
      (page) => page.name === HttpStatus[500]
    ) as Page;

    const genRender = (route: Page, status: number) => {
      return (
        req: Request,
        params: Record<string, string>,
        routeError?: RouteError
      ) => {
        return async (
          renderProps: {
            data?: any;
            error?: RouteError;
            meta?: Meta;
          } = {},
          options?: ResponseInit
        ) => {
          const { data, error = routeError, meta = route.meta } = renderProps;
          const errorProxy = error
            ? this.#dev
              ? error
              : new Proxy(error, {
                  get(target, key) {
                    if (key === "stack") {
                      return "";
                    }
                    return Reflect.get(target, key);
                  },
                })
            : undefined;
          const [body, csp] = await internalRender(
            {
              bootstrap: DEFAULT_BOOTSTRAP,
              data,
              error: errorProxy,
              meta,
              params,
              route,
              url: new URL(req.url),
              source: route.source,
            },
            this.#renderPage
          );

          return sendResponse(body, {
            status:
              options?.status ??
              (error
                ? Reflect.has(error, "status")
                  ? (error as HttpError).status
                  : 500
                : status),
            statusText:
              options?.statusText ??
              (error
                ? Reflect.has(error, "statusText")
                  ? (error as HttpError).statusText
                  : HttpStatus[500]
                : undefined),
            headers: options?.headers,
            csp: csp,
            isDev: this.#dev,
          });
        };
      };
    };

    const createUnknownRender = genRender(notFoundPage, HttpStatus.NotFound);

    for (const route of this.#routes) {
      const meta = route.meta;
      const module = route.module;
      const createRender = genRender(route, HttpStatus.OK);
      if (typeof route.handler === "function") {
        routes[route.pathname] = {
          default: (ctx, params) =>
            (route.handler as RouteHandler)({
              ...ctx,
              meta,
              module,
              params,
              render: createRender(ctx.request, params),
              request: ctx.request,
            }),
        };
      } else {
        routes[route.pathname] = {};
        for (const [method, handler] of Object.entries(route.handler)) {
          routes[route.pathname][method as router.KnownMethod] = (
            ctx,
            params
          ) =>
            handler({
              ...ctx,
              meta,
              module,
              params,
              render: createRender(ctx.request, params),
              request: ctx.request,
            });
        }
      }
    }

    const otherHandler: router.Handler<RouterState> = (ctx) =>
      (errorPage.handler as RouteHandler)({
        ...ctx,
        params: {},
        error: createHttpError(404),
        meta: errorPage.meta,
        module: errorPage,
        render: createUnknownRender(ctx.request, {}),
      });

    const errorHandlerRender = genRender(
      errorPage,
      HttpStatus.InternalServerError
    );
    const errorHandler: router.ErrorHandler<RouterState> = (ctx, error) => {
      console.error(
        "%cAn error occurred during route handling or page rendering.",
        "color:red",
        error
      );
      return (errorPage.handler as RouteHandler)({
        ...ctx,
        error: error as Error,
        params: {},
        meta: errorPage.meta,
        module: errorPage,
        render: errorHandlerRender(ctx.request, {}, error as Error),
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

const DEFAULT_META: Meta = {
  lang: "en",
  meta: [
    {
      charset: "utf-8",
    },
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1.0",
    },
  ],
};

const DEFAULT_BOOTSTRAP = [
  {
    id: "web-widget:bootstrap",
    type: "module",
    content: [
      `const loader = () => import("@web-widget/web-widget")`,
      `typeof importShim === "function" ? importShim(String(loader).match(/\\bimport\\("([^"]*?)"\\)/)[1]): loader()`,
    ].join("\n"),
  },
];

const DEFAULT_NOT_FOUND: Page = {
  bootstrap: DEFAULT_BOOTSTRAP,
  config: {},
  csp: false,
  handler: (req) => router.defaultOtherHandler(req),
  meta: DEFAULT_META,
  module: {},
  name: "NotFound",
  pathname: "",
  render: defaultRender as RouteRender,
  source: "",
};

const DEFAULT_ERROR: Page = {
  bootstrap: DEFAULT_BOOTSTRAP,
  config: {},
  csp: false,
  handler: (ctx) => ctx.render({ meta: DEFAULT_META }),
  meta: DEFAULT_META,
  module: { default: defaultErrorComponent, fallback: defaultErrorComponent },
  name: "InternalServerError",
  pathname: "",
  render: defaultRender as RouteRender,
  source: "",
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

function fileUrlDirname(file: string) {
  return file.startsWith("/")
    ? file.slice(0, file.lastIndexOf("/") + 1)
    : new URL("./", file).href;
}

const URL_REG = /^\w+:\/\//;

function fileUrlJoin(base: string, file: string) {
  const protocol = "file://";
  const href = new URL(file, URL_REG.test(base) ? base : protocol + base).href;
  return URL_REG.test(base) ? href : href.replace(protocol, "");
}

function sendResponse(
  body: RouteRenderResult,
  options: {
    status: number;
    statusText: string | undefined;
    headers?: HeadersInit;
    isDev: boolean;
    csp?: ContentSecurityPolicy;
  }
) {
  const headers: Record<string, string> = {
    "content-type": "text/html; charset=utf-8",
  };

  const { csp } = options;
  if (csp) {
    if (options.isDev) {
      csp.directives.connectSrc = [...(csp.directives.connectSrc ?? []), SELF];
    }
    const directive = serializeCSPDirectives(csp.directives);
    if (csp.reportOnly) {
      headers["content-security-policy-report-only"] = directive;
    } else {
      headers["content-security-policy"] = directive;
    }
  }
  return new Response(body, {
    status: options.status,
    statusText: options.statusText,
    headers: options.headers ? { ...headers, ...options.headers } : headers,
  });
}
