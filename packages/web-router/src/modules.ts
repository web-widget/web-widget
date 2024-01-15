/* eslint-disable react-hooks/rules-of-hooks */
import type { Context } from "./context";
import type {
  HttpError,
  LayoutModule,
  LayoutRenderContext,
  Meta,
  MiddlewareHandler,
  MiddlewareModule,
  Next,
  RootLayoutComponentProps,
  RouteHandler,
  RouteHandlerContext,
  RouteHandlers,
  RouteModule,
  RouteRenderContext,
  RouteRenderOptions,
} from "./types";
import {
  callContext,
  createContext,
  useContext,
  HttpStatus,
  mergeMeta,
  rebaseMeta,
} from "@web-widget/schema/server-helpers";

export type PageContext = {
  meta?: Meta;
  module?: RouteModule;
  render?: RouteHandlerContext["render"];
  renderOptions?: RouteRenderOptions;
} & Context;

function callAsyncContext<T extends (...args: any[]) => any>(
  context: PageContext,
  setup: T,
  args?: Parameters<T>
): Promise<Response> {
  const hasCtx = !!useContext();
  const data = createContext({
    params: context.params,
    pathname: context.pathname,
  });

  if (context.meta) {
    const name = "state:web-router";
    const meta = mergeMeta(context.meta, {});
    const script = (meta.script ??= []);
    const index = script.findIndex(
      // @ts-ignore
      (script) => script.name === name
    );

    if (index > -1) {
      script.splice(index, 1);
    }

    script.push({
      // @ts-ignore
      name,
      type: "application/json",
      // TODO htmlEscapeJsonString
      content: JSON.stringify(data),
    });

    context.meta = meta;
  }

  if (hasCtx) {
    return args ? setup(...args) : setup();
  } else {
    return callContext(data, setup, args);
  }
}

function composeHandler(handler: RouteHandler | RouteHandlers): RouteHandler {
  if (typeof handler === "function") {
    return handler;
  }

  const methods: RouteHandlers = { ...handler };
  const knownMethods = [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS",
    "PATCH",
  ] as const;

  for (const methodName of knownMethods) {
    if (methodName === "HEAD") {
      const GET = methods.GET;
      methods[methodName] =
        handler[methodName] || GET
          ? ((async (ctx) => {
              const resp = await (GET as RouteHandler)(ctx);
              resp.body?.cancel();
              return new Response(null, {
                headers: resp.headers,
                status: resp.status,
                statusText: resp.statusText,
              });
            }) as RouteHandler)
          : undefined;
    }

    methods[methodName] ??= handler[methodName];
  }

  return (context: RouteHandlerContext) => {
    let request = context.request;

    // If not overridden, HEAD requests should be handled as GET requests but without the body.
    if (request.method === "HEAD" && !methods["HEAD"]) {
      request = new Request(request.url, {
        method: "GET",
        headers: request.headers,
      });
    }

    const handler =
      Reflect.get(methods, request.method) ??
      (() =>
        new Response(null, {
          status: 405,
          headers: {
            Accept: knownMethods.join(", "),
          },
        }));

    return handler(context);
  };
}

function composeRender(
  context: PageContext,
  layoutModule: LayoutModule,
  dev?: boolean
) {
  return async function render(
    {
      data = context.state,
      error: rawError = context.error,
      meta = context.meta as Meta,
    } = {},
    renderOptions = context.renderOptions
  ) {
    if (typeof layoutModule.render !== "function") {
      throw new TypeError(`Layout module does not export "render" function.`);
    }

    if (!context.module) {
      throw new TypeError(`"module" does not exist in context.`);
    }

    if (typeof context.module.render !== "function") {
      throw new TypeError(`Module does not export "render" function.`);
    }

    const error = rawError
      ? dev
        ? rawError
        : createSafeError(rawError)
      : undefined;

    const renderContext: RouteRenderContext = {
      data,
      error,
      meta,
      module: context.module,
      params: context.params,
      pathname: context.pathname,
      request: context.request,
    };
    const children = await context.module.render(renderContext, renderOptions);

    const layoutContext: LayoutRenderContext = {
      data: {
        children,
        meta,
        params: context.params,
        pathname: context.pathname,
        request: context.request,
        get bootstrap() {
          throw new Error(`"bootstrap" has been removed.`);
        },
      } as RootLayoutComponentProps,
      meta,
      module: layoutModule,
    };

    const html = await layoutModule.render(layoutContext, renderOptions);
    const status =
      renderOptions?.status ??
      (error
        ? Reflect.has(error, "status")
          ? (error as HttpError).status
          : 500
        : 200);
    const statusText =
      renderOptions?.statusText ??
      (error
        ? Reflect.has(error, "statusText")
          ? (error as HttpError).statusText
          : HttpStatus[500]
        : HttpStatus[200]);
    const headers = {
      "content-type": "text/html; charset=utf-8",
      ...renderOptions?.headers,
    };

    return new Response(html, {
      status,
      statusText,
      headers,
    });
  };
}

function createSafeError(error: Error) {
  return new Proxy(error, {
    get(target, key) {
      if (key === "stack") {
        return "";
      }
      return Reflect.get(target, key);
    },
  });
}

async function getModule<T>(module: any) {
  return (typeof module === "function" ? module() : module) as T;
}

export function callMiddlewareModule(
  middleware: MiddlewareModule | (() => Promise<MiddlewareModule>)
) {
  let module;
  let handler;
  return async (context: Context, next: Next) => {
    module ??= await getModule<MiddlewareModule>(middleware);

    if (!module.handler) {
      throw new TypeError(
        `Middleware module does not export "handler" function.`
      );
    }

    handler ??= composeHandler(module.handler);

    return handler(context, next);
  };
}

export function createPageContext(
  route: RouteModule | (() => Promise<RouteModule>),
  layout: LayoutModule | (() => Promise<LayoutModule>),
  defaultMeta: Meta,
  defaultBaseAsset: string,
  defaultRenderOptions: RouteRenderOptions,
  dev?: boolean
): MiddlewareHandler {
  let layoutModule;
  let meta;
  let module;
  let renderOptions;
  return async (context: PageContext, next) => {
    layoutModule ??= await getModule<LayoutModule>(layout);
    module ??= await getModule<RouteModule>(route);
    meta ??= mergeMeta(
      defaultMeta,
      rebaseMeta(module.meta ?? {}, defaultBaseAsset)
    );
    renderOptions ??= Object.assign({}, defaultRenderOptions);

    // If multiple routes match here, only the first one is valid.
    if (!context.module) {
      context.meta = meta;
      context.module = module;
      context.render = composeRender(context, layoutModule, dev);
      context.renderOptions = renderOptions;
    }

    return next();
  };
}

export function createFallbackHandler(
  route: RouteModule | (() => Promise<RouteModule>),
  layout: LayoutModule | (() => Promise<LayoutModule>),
  defaultMeta: Meta,
  defaultBaseAsset: string,
  defaultRenderOptions: RouteRenderOptions,
  dev?: boolean
) {
  let handler;
  let layoutModule;
  let meta;
  let module;
  let renderOptions;
  return async (error: Error, context: Context) => {
    layoutModule ??= await getModule<LayoutModule>(layout);
    module ??= await getModule<RouteModule>(route);
    meta ??= mergeMeta(
      defaultMeta,
      rebaseMeta(module.meta ?? {}, defaultBaseAsset)
    );
    handler ??= composeHandler(
      module.handler ?? {
        GET({ render }) {
          return render();
        },
      }
    );
    renderOptions ??= Object.assign({}, defaultRenderOptions);

    const status = Reflect.get(error, "status") ?? 500;
    if (status >= 500) {
      console.error(
        "An error occurred during route handling or page rendering.",
        error
      );
    }

    const pageContext = context as PageContext;
    pageContext.error = error;
    pageContext.meta = meta;
    pageContext.module = module;
    pageContext.render = composeRender(pageContext, layoutModule, dev);
    pageContext.renderOptions = renderOptions;

    return callAsyncContext(pageContext, handler, [pageContext]);
  };
}

export function renderRouteModule(): MiddlewareHandler {
  let handler;
  return async (context: PageContext, next) => {
    const isPageContext =
      Reflect.has(context, "module") && Reflect.has(context, "render");
    if (isPageContext) {
      handler ??= composeHandler(
        context?.module?.handler ?? {
          GET({ render }) {
            return render();
          },
        }
      );
      return callAsyncContext(context, handler, [context]);
    } else {
      return callAsyncContext(context, next);
    }
  };
}

export function trailingSlash(trailingSlashEnabled: boolean) {
  return async ({ request }: Context, next: Next) => {
    // Redirect requests that end with a trailing slash to their non-trailing
    // slash counterpart.
    // Ex: /about/ -> /about
    const url = new URL(request.url);
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
      // If the last element of the path has a "." it's a file
      const isFile = url.pathname.split("/").at(-1)?.includes(".");

      if (!isFile) {
        url.pathname += "/";
        return Response.redirect(url, HttpStatus.PermanentRedirect);
      }
    }

    return next();
  };
}
