import type { Context } from "./context";
import type {
  HttpError,
  LayoutModule,
  LayoutRenderContext,
  Meta,
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
  HttpStatus,
  mergeMeta,
  rebaseMeta,
} from "@web-widget/schema/server-helpers";

export type PageContext = {
  meta: Meta;
  module: RouteModule;
  render: RouteHandlerContext["render"];
  renderOptions: RouteRenderOptions;
} & Context;

function composeHandler(
  handler: RouteHandler | RouteHandlers = {
    GET({ render }) {
      return render();
    },
  }
) {
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
      meta = context.meta,
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

function createPageContext(
  context: Context,
  options: {
    error?: PageContext["error"];
    meta: PageContext["meta"];
    module: PageContext["module"];
    renderOptions: PageContext["renderOptions"];
  },
  layoutModule: LayoutModule,
  dev?: boolean
): PageContext {
  let render;
  const pageContext = Object.create(context, {
    render: {
      configurable: true,
      enumerable: true,
      get() {
        render ??= composeRender(this, layoutModule, dev);
        return render;
      },
    },
  });
  return Object.assign(pageContext, options);
}

export function middlewareModule(
  middleware: MiddlewareModule | (() => Promise<MiddlewareModule>)
) {
  let module;
  return async (context: Context, next: Next) => {
    module ??= await getModule<MiddlewareModule>(middleware);
    const handler = module.handler;

    if (typeof handler !== "function") {
      throw new TypeError(
        `Middleware module does not export "handler" function.`
      );
    }

    return handler(context, next);
  };
}

export function renderModule(
  route: RouteModule | (() => Promise<RouteModule>),
  layout: LayoutModule | (() => Promise<LayoutModule>),
  defaultMeta: Meta,
  defaultBaseAsset: string,
  dev?: boolean
) {
  let handler;
  let module;
  let layoutModule;
  return async (context: Context) => {
    layoutModule ??= await getModule<LayoutModule>(layout);
    module ??= await getModule<RouteModule>(route);
    handler ??= composeHandler(module.handler);

    const pageContext = createPageContext(
      context,
      {
        renderOptions: context.state.renderOptions ?? {},
        module,
        meta: mergeMeta(
          context.state.meta
            ? mergeMeta(defaultMeta, context.state.meta)
            : defaultMeta,
          rebaseMeta(module.meta ?? {}, defaultBaseAsset)
        ),
      },
      layoutModule,
      dev
    );

    delete context.state.meta;
    delete context.state.renderOptions;

    return handler(pageContext);
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

export function createFallbackHandler(
  route: RouteModule | (() => Promise<RouteModule>),
  layout: LayoutModule | (() => Promise<LayoutModule>),
  defaultMeta: Meta,
  defaultBaseAsset: string,
  dev?: boolean
) {
  let handler;
  let module;
  let layoutModule;
  return async (error: Error, context: Context) => {
    layoutModule ??= await getModule<LayoutModule>(layout);
    module ??= await getModule<RouteModule>(route);
    handler ??= composeHandler(module.handler);

    const status = Reflect.get(error, "status") ?? 500;
    if (status >= 500) {
      console.error(
        "An error occurred during route handling or page rendering.",
        error
      );
    }

    const pageContext = createPageContext(
      context,
      {
        error,
        renderOptions: context.state.renderOptions ?? {},
        module,
        meta: mergeMeta(
          context.state.meta
            ? mergeMeta(defaultMeta, context.state.meta)
            : defaultMeta,
          rebaseMeta(module.meta ?? {}, defaultBaseAsset)
        ),
      },
      layoutModule,
      dev
    );

    delete context.state.meta;
    delete context.state.renderOptions;

    return handler(pageContext);
  };
}
