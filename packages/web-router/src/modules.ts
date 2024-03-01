import {
  methodsToHandler,
  mergeMeta,
  rebaseMeta,
} from '@web-widget/helpers/module';
import {
  callContext,
  createContext,
  useTryContext,
} from '@web-widget/helpers/context';
import { createHttpError } from '@web-widget/helpers/error';
import type {
  LayoutModule,
  LayoutRenderContext,
  Meta,
  MiddlewareContext,
  MiddlewareHandler,
  MiddlewareModule,
  MiddlewareNext,
  RouteError,
  RouteHandler,
  RouteHandlerContext,
  RouteHandlers,
  RouteModule,
  RouteRenderContext,
  RouteRenderOptions,
} from './types';
import type { Context } from './context';

export type OnFallback = (
  error: RouteError,
  context?: MiddlewareContext
) => void;

function callAsyncContext<T extends (...args: any[]) => any>(
  context: MiddlewareContext,
  setup: T,
  args?: Parameters<T>
): Promise<Response> {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  let appContext = useTryContext();
  const isInit = !!appContext;

  appContext ??= createContext(context);

  // Exposed to client
  if (context.meta) {
    const id = 'state:web-router';
    const meta = mergeMeta(context.meta, {});
    const script = (meta.script ??= []);
    const index = script.findIndex((script) => script.id === id);

    if (index > -1) {
      script.splice(index, 1);
    }

    script.push({
      id,
      type: 'application/json',
      // TODO htmlEscapeJsonString
      content: JSON.stringify(appContext),
    });

    // eslint-disable-next-line no-param-reassign
    context.meta = meta;
  }

  if (isInit) {
    return args ? setup(...args) : setup();
  } else {
    return callContext(appContext!, setup, args);
  }
}

function composeRender(
  context: RouteHandlerContext,
  layoutModule: LayoutModule,
  onFallback: OnFallback,
  dev?: boolean
) {
  return async function render(
    {
      data = context.data,
      error: unsafeError = context.error,
      meta = context.meta,
    } = {},
    renderOptions = context.renderOptions
  ) {
    if (unsafeError) {
      onFallback(unsafeError, context);
    }

    if (typeof layoutModule.render !== 'function') {
      throw new TypeError(`Layout module does not export "render" function.`);
    }

    if (!context.module) {
      throw new TypeError(`Missing "module".`);
    }

    if (typeof context.module.render !== 'function') {
      throw new TypeError(`Module does not export "render" function.`);
    }

    const error = unsafeError
      ? dev
        ? unsafeError
        : createSafeError(unsafeError)
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
      },
      meta,
      module: layoutModule,
    };

    const html = await layoutModule.render(layoutContext, renderOptions);
    const status =
      renderOptions?.status ??
      (error ? (error.status ? error.status : 500) : 200);
    const statusText =
      renderOptions?.statusText ??
      (error
        ? error.statusText
          ? error.statusText
          : 'Internal Server Error'
        : 'OK');
    const headers = {
      'content-type': 'text/html; charset=utf-8',
      ...renderOptions?.headers,
    };

    return new Response(html, {
      status,
      statusText,
      headers,
    });
  };
}

function createSafeError(error: RouteError): RouteError {
  return new Proxy(error, {
    get(target, key) {
      if (key === 'stack') {
        return '';
      }
      return Reflect.get(target, key);
    },
  });
}

async function transformRouteError(error: any): Promise<RouteError> {
  if (error instanceof Error) {
    return error;
  }

  if (error instanceof Response) {
    return createHttpError(
      error.status,
      (await error.text()) || error.statusText
    );
  }

  return createHttpError(500, String(error));
}

async function getModule<T>(module: any) {
  return (typeof module === 'function' ? module() : module) as T;
}

export function callMiddlewareModule(
  middleware: MiddlewareModule | (() => Promise<MiddlewareModule>)
): MiddlewareHandler {
  let module: MiddlewareModule;
  let handler: MiddlewareHandler;
  return async (context, next) => {
    module ??= await getModule<MiddlewareModule>(middleware);

    if (!module.handler) {
      throw new TypeError(
        `Middleware module does not export "handler" function.`
      );
    }

    handler ??=
      typeof module.handler === 'function'
        ? module.handler
        : (methodsToHandler(module.handler) as MiddlewareHandler);

    return handler(context, next);
  };
}

export function createRouteContext(
  route: RouteModule | (() => Promise<RouteModule>),
  layout: LayoutModule | (() => Promise<LayoutModule>),
  defaultMeta: Meta,
  defaultBaseAsset: string,
  defaultRenderOptions: RouteRenderOptions,
  onFallback: OnFallback,
  dev?: boolean
) {
  let layoutModule: LayoutModule;
  let meta: Meta;
  let module: RouteModule;
  let renderOptions: RouteRenderOptions;
  return async (context: Context, next: MiddlewareNext) => {
    layoutModule ??= await getModule<LayoutModule>(layout);
    module ??= await getModule<RouteModule>(route);
    meta ??= mergeMeta(
      defaultMeta,
      rebaseMeta(module.meta ?? {}, defaultBaseAsset)
    );
    renderOptions ??= Object.assign({}, defaultRenderOptions);

    // If multiple routes match here, only the first one is valid.
    if (!('module' in context)) {
      Object.assign<Context, RouteHandlerContext>(context, {
        ...context,
        data: {},
        error: undefined,
        meta,
        module,
        render: composeRender(
          context as RouteHandlerContext,
          layoutModule,
          onFallback,
          dev
        ),
        renderOptions,
      });
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
  onFallback: OnFallback,
  dev?: boolean
) {
  let handler: RouteHandler;
  let layoutModule: LayoutModule;
  let meta: Meta;
  let module: RouteModule;
  let renderOptions: RouteRenderOptions;
  return async (error: unknown, context: Context) => {
    layoutModule ??= await getModule<LayoutModule>(layout);
    module ??= await getModule<RouteModule>(route);
    meta ??= mergeMeta(
      defaultMeta,
      rebaseMeta(module.meta ?? {}, defaultBaseAsset)
    );
    handler ??=
      typeof module.handler === 'function'
        ? module.handler
        : (methodsToHandler(
            module.handler ??
              ({
                GET({ render }) {
                  return render();
                },
              } as RouteHandlers)
          ) as RouteHandler);
    renderOptions ??= Object.assign({}, defaultRenderOptions);

    const routeContext = Object.assign<Context, RouteHandlerContext>(context, {
      ...context,
      data: {},
      error: await transformRouteError(error),
      meta,
      module,
      render: composeRender(
        context as RouteHandlerContext,
        layoutModule,
        onFallback,
        dev
      ),
      renderOptions,
    });

    return callAsyncContext(routeContext, handler, [routeContext]);
  };
}

export function renderRouteModule(): MiddlewareHandler {
  let handler: RouteHandler;
  return async (context, next) => {
    const isRouteContext =
      Reflect.has(context, 'module') && Reflect.has(context, 'render');
    if (isRouteContext) {
      const module = context.module!;
      handler ??=
        typeof module.handler === 'function'
          ? module.handler
          : (methodsToHandler(
              module.handler ??
                ({
                  GET({ render }) {
                    return render();
                  },
                } as RouteHandlers)
            ) as RouteHandler);
      return callAsyncContext(context, handler, [
        context as RouteHandlerContext,
      ]);
    } else {
      return callAsyncContext(context, next);
    }
  };
}

export function trailingSlash(
  trailingSlashEnabled: boolean
): MiddlewareHandler {
  return async ({ request }, next) => {
    // Redirect requests that end with a trailing slash to their non-trailing
    // slash counterpart.
    // Ex: /about/ -> /about
    const url = new URL(request.url);
    if (
      url.pathname.length > 1 &&
      url.pathname.endsWith('/') &&
      !trailingSlashEnabled
    ) {
      // Remove trailing slashes
      const path = url.pathname.replace(/\/+$/, '');
      const location = `${path}${url.search}`;
      return new Response(null, {
        status: 307,
        headers: { location },
      });
    } else if (trailingSlashEnabled && !url.pathname.endsWith('/')) {
      // If the last element of the path has a "." it's a file
      const isFile = url.pathname.split('/').at(-1)?.includes('.');

      if (!isFile) {
        url.pathname += '/';
        return Response.redirect(url, 308);
      }
    }

    return next();
  };
}
