/* eslint-disable no-param-reassign */
import {
  methodsToHandler,
  mergeMeta,
  rebaseMeta,
} from '@web-widget/helpers/module';
import {
  callContext,
  contextToScriptDescriptor,
  createSerializableContext,
  useContext,
} from '@web-widget/context/server';
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

function tryGetSerializableContext() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useContext();
  } catch (e) {}
}

export type OnFallback = (
  error: RouteError,
  context?: MiddlewareContext
) => void;

function callAsyncContext<T extends (...args: any[]) => any>(
  context: MiddlewareContext,
  setup: T,
  args?: Parameters<T>
): Promise<Response> {
  let asyncContext = tryGetSerializableContext();

  if (asyncContext) {
    return args ? setup(...args) : setup();
  } else {
    asyncContext = createSerializableContext(context);

    // Exposed to client
    if (context.meta) {
      context.meta = mergeMeta(context.meta, {
        script: [contextToScriptDescriptor(asyncContext)],
      });
    }

    return callContext(asyncContext, setup, args);
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
  let module: RouteModule;
  return async (context: MiddlewareContext, next: MiddlewareNext) => {
    module ??= await getModule<RouteModule>(route);
    layoutModule ??= await getModule<LayoutModule>(layout);

    // If multiple routes match here, only the first one is valid.
    if (!('module' in context)) {
      context.module ??= module;

      if (module.render) {
        context.data ??= Object.create(null);
        context.error ??= undefined;
        context.meta ??= mergeMeta(
          defaultMeta,
          rebaseMeta(module.meta ?? {}, defaultBaseAsset)
        );
        context.render ??= composeRender(
          context as RouteHandlerContext,
          layoutModule,
          onFallback,
          dev
        );
        // TODO: Deep merging
        context.renderOptions ??= Object.assign({}, defaultRenderOptions);
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
  defaultRenderOptions: RouteRenderOptions,
  onFallback: OnFallback,
  dev?: boolean
) {
  let handler: RouteHandler;
  let layoutModule: LayoutModule;
  let module: RouteModule;
  return async (error: unknown, context: MiddlewareContext) => {
    layoutModule ??= await getModule<LayoutModule>(layout);
    module ??= await getModule<RouteModule>(route);
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

    context.data = Object.create(null);
    context.error = await transformRouteError(error);
    context.meta = mergeMeta(
      defaultMeta,
      rebaseMeta(module.meta ?? {}, defaultBaseAsset)
    );
    context.module = module;
    context.render = composeRender(
      context as RouteHandlerContext,
      layoutModule,
      onFallback,
      dev
    );
    // TODO: Deep merging
    context.renderOptions = Object.assign({}, defaultRenderOptions);

    return callAsyncContext(context, handler, [context as RouteHandlerContext]);
  };
}

export function renderRouteModule(): MiddlewareHandler {
  let handler: RouteHandler;
  return async (context, next) => {
    if (context.module) {
      const module = context.module;
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
