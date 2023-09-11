import {
  createHttpError,
  HttpStatus,
  mergeMeta,
  rebaseMeta,
} from "@web-widget/schema/server-helpers";
import type {
  HttpError,
  Meta,
  RouteError,
  RouteHandler,
  RouteModule,
  RouteRender,
  RouteRenderContext,
  RouteRenderOptions,
  RouteRenderResult,
} from "@web-widget/schema/server-helpers";
import * as router from "./router";
import * as defaultRootFallbackModule from "./fallback";
import * as defaultRootLayoutModule from "./layout";
import type {
  Layout,
  LayoutModule,
  LayoutRender,
  Manifest,
  Middleware,
  MiddlewareHandlerContext,
  MiddlewareModule,
  Page,
  Requester,
  RootRender,
  RouterHandler,
  RouteConfig,
  ScriptDescriptor,
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

type ResolvedWebRouterOptions = {
  baseAsset: string;
  baseModule: string;
  defaultBootstrap: ScriptDescriptor[];
  defaultMeta: Meta;
  experimental_render: RootRender;
  experimental_loader: (
    module: string,
    importer?: string
  ) => RouteModule | Promise<RouteModule>;
} & WebRouterOptions;

export class ServerContext {
  #dev: boolean;
  #fallbacks: Page[];
  #layout: Layout;
  #middlewares: Middleware[];
  #options: ResolvedWebRouterOptions;
  #rootRender: RootRender;
  #routes: Page[];

  constructor(
    dev: boolean,
    fallbacks: Page[],
    layout: Layout,
    middlewares: Middleware[],
    options: ResolvedWebRouterOptions,
    rootRender: RootRender,
    routes: Page[]
  ) {
    this.#dev = dev;
    this.#fallbacks = fallbacks;
    this.#layout = layout;
    this.#middlewares = middlewares;
    this.#options = options;
    this.#rootRender = rootRender;
    this.#routes = routes;
    deepFreeze(this);
  }

  /**
   * Process the manifest into individual components and pages.
   */
  static async fromManifest(
    manifest: Manifest,
    opts: WebRouterOptions,
    dev: boolean
  ): Promise<ServerContext> {
    if (!opts) {
      throw TypeError(`Missing parameter option: baseAsset, baseModule.`);
    }

    if (!opts.baseAsset) {
      throw TypeError(`Missing parameter option: baseAsset.`);
    }

    if (!opts.baseModule) {
      throw TypeError(`Missing parameter option: baseModule.`);
    }

    const RESOLVE_URL_REG = /^(?:\w+:)?\//;
    const isDevBaseAsset =
      dev &&
      typeof opts.baseAsset === "string" &&
      RESOLVE_URL_REG.test(opts.baseAsset);

    const resolvedOpts: ResolvedWebRouterOptions = {
      baseAsset: isDevBaseAsset
        ? (opts.baseAsset as string)
        : opts.baseAsset instanceof URL
        ? opts.baseAsset.href
        : opts.baseAsset,
      baseModule: new URL(opts.baseModule).href,
      defaultBootstrap: opts.defaultBootstrap ?? DEFAULT_BOOTSTRAP,
      experimental_loader:
        opts.experimental_loader ??
        ((module: string, importer?: string) => {
          const url = new URL(module, importer).href;
          return import(/* @vite-ignore */ /* webpackIgnore: true */ url);
        }),
      defaultMeta: opts.defaultMeta ?? DEFAULT_META,
      experimental_render: opts.experimental_render ?? DEFAULT_RENDER_FN,
      experimental_trailingSlash: opts.experimental_trailingSlash ?? false,
    };

    // Extract all routes, and prepare them into the `Page` structure.
    const routes: Page[] = [];
    const middlewares: Middleware[] = [];
    const fallbacks: Page[] = [];
    let layout = DEFAULT_ROOT_LAYOUT;

    type ResolvedModule = { source: string };
    type JSONModule = { module: string };
    const resolveSource = (module: ResolvedModule | JSONModule) =>
      new URL(
        typeof Reflect.get(module, "module") === "string"
          ? (module as JSONModule).module
          : (module as ResolvedModule).source,
        resolvedOpts.baseModule
      );

    const resolveModule = async <T>(mod: string | T, importer: string) => {
      if (typeof mod === "string") {
        return (await resolvedOpts.experimental_loader(mod, importer)) as T;
      } else {
        return mod as T;
      }
    };

    const resolveConfig = (config: RouteConfig) => config;

    const resolveMeta = (meta: Meta, importer: string): Meta => {
      return rebaseMeta(mergeMeta(resolvedOpts.defaultMeta, meta), importer);
    };

    const emptyRender = async () => {
      throw createHttpError(500, `Module does not export render function.`);
    };

    for (const item of manifest.routes ?? []) {
      const { pathname, name } = item;
      const source = resolveSource(item);
      const module = await resolveModule<RouteModule>(
        item.module,
        resolvedOpts.baseModule
      );
      const { handler = {}, render = emptyRender } = module;
      const config = resolveConfig(module.config || {});
      const meta = resolveMeta(module.meta || {}, source.href);

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
        bootstrap: resolvedOpts.defaultBootstrap,
        csp: Boolean(config.csp ?? false),
        handler: handler as RouteHandler,
        meta,
        module,
        name,
        pathname: config.routeOverride
          ? String(config.routeOverride)
          : pathname,
        render,
        source,
      });
    }

    for (const item of manifest.fallbacks ?? []) {
      const { pathname, name } = item;
      const source = resolveSource(item);
      const module = await resolveModule<RouteModule>(
        item.module,
        resolvedOpts.baseModule
      );
      const { render } = module;
      const config = resolveConfig(module.config || {});
      const meta = resolveMeta(module.meta || {}, source.href);

      let { handler } = module;

      if (handler !== null && typeof handler === "object") {
        throw new TypeError(
          `manifest.fallbacks[].handler: Must be a function.`
        );
      }

      if (render && handler === undefined) {
        handler = (ctx) => ctx.render({ error: ctx.error });
      }

      fallbacks.push({
        bootstrap: resolvedOpts.defaultBootstrap,
        csp: Boolean(config.csp ?? false),
        handler:
          handler ??
          (name === HttpStatus[404]
            ? (ctx) => router.defaultOtherHandler(ctx, ctx.error)
            : (ctx) => router.defaultErrorHandler(ctx, ctx.error)),
        meta,
        module,
        name,
        pathname,
        render: render ?? emptyRender,
        source,
      });
    }

    if (manifest.layout) {
      const item = manifest.layout;
      const { name } = manifest.layout;
      const source = resolveSource(item);
      const module = await resolveModule<LayoutModule>(
        item.module,
        resolvedOpts.baseModule
      );
      const { render = emptyRender } = module;
      const meta = resolveMeta(
        module.meta || {},
        new URL(source, resolvedOpts.baseModule).href
      );

      layout = {
        bootstrap: resolvedOpts.defaultBootstrap,
        meta,
        name: name ?? "Root",
        module,
        render,
        source,
      };
    }

    for (const item of manifest.middlewares ?? []) {
      const { pathname } = item;
      const module = await resolveModule<MiddlewareModule>(
        item.module,
        resolvedOpts.baseModule
      );
      middlewares.push({
        pathname,
        pattern: new URLPattern({ pathname: pathname }),
        ...module,
      });
    }

    if (!fallbacks.some((page) => page.name === HttpStatus[404])) {
      fallbacks.push(DEFAULT_NOT_FOUND_ERROR_PAGE);
    }

    if (!fallbacks.some((page) => page.name === HttpStatus[500])) {
      fallbacks.push(DEFAULT_INTERNAL_SERVER_ERROR_PAGE);
    }

    return new ServerContext(
      dev,
      fallbacks,
      layout,
      middlewares,
      resolvedOpts,
      resolvedOpts.experimental_render,
      routes
    );
  }

  /**
   * This functions returns a request handler that handles all routes required
   * by web router.
   */
  handler(): RouterHandler {
    const handlers = this.#handlers();
    const inner = router.router<RouterState>(handlers);
    const withMiddlewares = this.#composeMiddlewares(
      this.#middlewares,
      handlers.errorHandler
    );
    const trailingSlashEnabled = this.#options.experimental_trailingSlash;
    return async function handler(
      req: Request,
      requester?: Requester
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

      return await withMiddlewares(req, inner, requester);
    };
  }

  /**
   * Identify which middlewares should be applied for a request,
   * chain them and return a handler response
   */
  #composeMiddlewares(
    middlewares: Middleware[],
    errorHandler: router.ErrorHandler<RouterState>
  ) {
    return (
      req: Request,
      inner: router.FinalHandler<RouterState>,
      requester?: Requester
    ) => {
      // identify middlewares to apply, if any.
      // middlewares should be already sorted from deepest to shallow layer
      const mws = selectMiddlewares(req.url, middlewares);

      const handlers: (() => Response | Promise<Response>)[] = [];

      const middlewareCtx: MiddlewareHandlerContext = {
        requester,
        destination: "route",
        request: req,
        state: {},
      };
      const next = () => {
        const handler = handlers.shift()!;
        return Promise.resolve(handler());
      };

      for (const mw of mws) {
        if (mw.handler instanceof Array) {
          for (const handler of mw.handler) {
            handlers.push(() => handler(middlewareCtx, next));
          }
        } else {
          const handler = mw.handler;
          handlers.push(() => handler(middlewareCtx, next));
        }
      }

      const ctx = {
        requester,
        request: req,
        state: middlewareCtx.state,
      };
      const { destination, handler } = inner(ctx);
      handlers.push(handler);
      middlewareCtx.destination = destination;
      return next().catch((e) => errorHandler(ctx, e));
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
    const internalServerErrorPage = this.#fallbacks.find(
      (page) => page.name === HttpStatus[500]
    ) as Page;
    const layout = this.#layout as Layout;

    const genRender = (
      page: Page,
      defaultRenderOptions: RouteRenderOptions
    ) => {
      return (
        request: Request,
        params: Record<string, string>,
        routeError?: RouteError
      ) => {
        return async (
          renderProps: {
            data?: any;
            error?: RouteError;
            meta?: Meta;
          } = {},
          renderOptions?: RouteRenderOptions
        ) => {
          const { data, error = routeError, meta = page.meta } = renderProps;
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

          const renderContext: RouteRenderContext = {
            // children?
            data,
            error: errorProxy,
            meta,
            module: page.module,
            params,
            pathname: page.pathname,
            request,
          };

          const [body, csp] = await internalRender(
            renderContext,
            {
              ...defaultRenderOptions,
              ...renderOptions,
            },
            page,
            this.#rootRender,
            layout
          );

          return sendResponse(body, {
            status:
              renderOptions?.status ??
              (error
                ? Reflect.has(error, "status")
                  ? (error as HttpError).status
                  : 500
                : defaultRenderOptions.status),
            statusText:
              renderOptions?.statusText ??
              (error
                ? Reflect.has(error, "statusText")
                  ? (error as HttpError).statusText
                  : HttpStatus[500]
                : undefined),
            headers: renderOptions?.headers,
            csp,
            isDev: this.#dev,
          });
        };
      };
    };

    for (const route of this.#routes) {
      const meta = route.meta;
      const module = route.module;
      const name = route.name;
      const createRender = genRender(route, {
        status: HttpStatus.OK,
      });
      if (typeof route.handler === "function") {
        routes[route.pathname] = {
          default: (ctx, params) =>
            (route.handler as RouteHandler)({
              ...ctx,
              meta,
              module,
              name,
              params,
              pathname: route.pathname,
              render: createRender(ctx.request, params),
              request: ctx.request,
            }),
        };
      } else {
        routes[route.pathname] = {};
        for (const [method, handler] of Object.entries(route.handler)) {
          // eslint-disable-next-line no-loop-func
          routes[route.pathname][method as router.KnownMethod] = (
            ctx,
            params
          ) =>
            handler({
              ...ctx,
              meta,
              module,
              name,
              params,
              pathname: route.pathname,
              render: createRender(ctx.request, params),
              request: ctx.request,
            });
        }
      }
    }

    const createUnknownHandlerRender = genRender(notFoundPage, {
      status: HttpStatus.NotFound,
    });

    const otherHandler: router.Handler<RouterState> = (
      ctx,
      error = createHttpError(404)
    ) =>
      (notFoundPage.handler as RouteHandler)({
        ...ctx,
        error,
        meta: notFoundPage.meta,
        module: notFoundPage.module,
        name: notFoundPage.name,
        params: {},
        pathname: "*",
        render: createUnknownHandlerRender(ctx.request, {}, error),
        request: ctx.request,
      });

    const createErrorHandlerRender = genRender(internalServerErrorPage, {
      status: HttpStatus.InternalServerError,
    });

    const errorHandler: router.ErrorHandler<RouterState> = (ctx, error) => {
      console.error(
        "An error occurred during route handling or page rendering.",
        error
      );
      return (internalServerErrorPage.handler as RouteHandler)({
        ...ctx,
        error: error as Error,
        meta: internalServerErrorPage.meta,
        module: internalServerErrorPage.module,
        name: internalServerErrorPage.name,
        params: {},
        pathname: "*",
        render: createErrorHandlerRender(ctx.request, {}, error as Error),
        request: ctx.request,
      });
    };

    return { internalRoutes, routes, otherHandler, errorHandler };
  }
}

const DEFAULT_RENDER_FN: RootRender = async (_ctx, render) => {
  await render();
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

const DEFAULT_BOOTSTRAP: ScriptDescriptor[] = [];

const DEFAULT_NOT_FOUND_ERROR_PAGE: Page = {
  bootstrap: DEFAULT_BOOTSTRAP,
  csp: false,
  handler: (ctx) => ctx.render({ error: ctx.error }),
  meta: DEFAULT_META,
  module: defaultRootFallbackModule as RouteModule,
  name: "NotFound",
  pathname: "*",
  render: defaultRootFallbackModule.render as RouteRender,
  source: new URL(import.meta.url),
};

const DEFAULT_INTERNAL_SERVER_ERROR_PAGE: Page = {
  bootstrap: DEFAULT_BOOTSTRAP,
  csp: false,
  handler: (ctx) => ctx.render({ error: ctx.error }),
  meta: DEFAULT_META,
  module: defaultRootFallbackModule as RouteModule,
  name: "InternalServerError",
  pathname: "*",
  render: defaultRootFallbackModule.render as RouteRender,
  source: new URL(import.meta.url),
};

const DEFAULT_ROOT_LAYOUT: Layout = {
  bootstrap: DEFAULT_BOOTSTRAP,
  meta: DEFAULT_META,
  module: defaultRootLayoutModule as LayoutModule,
  name: "Root",
  render: defaultRootLayoutModule.render as LayoutRender,
  source: new URL(import.meta.url),
};

/**
 * Return a list of middlewares that needs to be applied for request url
 * @param url the request url
 * @param middlewares Array of middlewares handlers and their routes as path-to-regexp style
 */
export function selectMiddlewares(url: string, middlewares: Middleware[]) {
  const selectedMws: Middleware[] = [];
  const reqURL = new URL(url);

  for (const middleware of middlewares) {
    const res = middleware.pattern.exec(reqURL);
    if (res) {
      selectedMws.push(middleware);
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

function sendResponse(
  body: RouteRenderResult,
  options: {
    csp?: ContentSecurityPolicy;
    headers?: HeadersInit;
    isDev: boolean;
    status: number;
    statusText: string | undefined;
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
    headers: options.headers ? { ...headers, ...options.headers } : headers,
    status: options.status,
    statusText: options.statusText,
  });
}
