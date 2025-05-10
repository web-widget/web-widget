/* eslint-disable no-param-reassign */
import { handleRpc } from '@web-widget/action/server';
import {
  callContext,
  contextToScriptDescriptor,
} from '@web-widget/context/server';
import { createHttpError } from '@web-widget/helpers/error';
import {
  mergeMeta,
  methodsToHandler,
  rebaseMeta,
} from '@web-widget/helpers/module';

import type {
  ActionModule,
  DevHttpHandler,
  DevRouteModule,
  HTTPException,
  LayoutModule,
  LayoutComponentProps,
  Meta,
  MiddlewareContext,
  MiddlewareHandler,
  MiddlewareModule,
  MiddlewareNext,
  RouteContext,
  RouteFallbackComponentProps,
  RouteHandler,
  RouteHandlers,
  RouteModule,
  RouteComponentProps,
  RouteRenderOptions,
} from './types';

const HANDLER = Symbol('handler');

export type OnFallback = (
  error: HTTPException,
  context?: MiddlewareContext
) => void;

function composeRender(
  context: RouteContext,
  layoutModule: LayoutModule,
  onFallback: OnFallback,
  dev: boolean | undefined
): RouteContext['render'] {
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
      throw new TypeError(`Layout module is missing export "render" function.`);
    }

    if (!context.module) {
      throw new TypeError(`Context is missing "module".`);
    }

    if (typeof context.module.render !== 'function') {
      throw new TypeError(`Module is missing export "render" function.`);
    }

    const error = unsafeError
      ? dev
        ? unsafeError
        : createSafeError(unsafeError)
      : undefined;

    const {
      render: _render,
      renderOptions: _renderOptions,
      waitUntil: _waitUntil,
      module: _module,
      ...restContext
    } = context;

    const componentExportName = error ? 'fallback' : 'default';
    const component = context.module[componentExportName];

    const renderContext: RouteFallbackComponentProps | RouteComponentProps =
      error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            status: error.status,
            statusText: error.statusText,
          }
        : {
            ...restContext,
            data,
            error,
            meta,
          };

    const children = await context.module.render(
      component,
      renderContext,
      renderOptions
    );
    const layoutContext: LayoutComponentProps = {
      children,
      data,
      meta,
      params: context.params,
      pathname: context.pathname,
      request: context.request,
      state: context.state,
    };

    const html = await layoutModule.render(
      layoutModule.default,
      layoutContext,
      renderOptions
    );
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

    const headers = new Headers(renderOptions?.headers);

    if (!headers.has('content-type')) {
      headers.set('content-type', 'text/html; charset=utf-8');
    }

    if (renderOptions?.progressive) {
      // NOTE: Disable nginx buffering.
      // NOTE: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
      headers.set('x-accel-buffering', 'no');
      // headers.set('cache-control', 'no-cache');
    }

    if (dev) {
      const source = (context.module as DevRouteModule).$source;
      const devSourceKey: DevHttpHandler = 'x-module-source';
      headers.set(devSourceKey, source);
    }

    return new Response(html, {
      status,
      statusText,
      headers,
    });
  };
}

type SafeError = { proxy: true } & HTTPException;

function createSafeError(error: HTTPException | SafeError): HTTPException {
  if ((error as SafeError).proxy) {
    return error as HTTPException;
  }

  const safeError = new Proxy(error, {
    get(target, key) {
      if (key === 'stack') {
        return '';
      }
      return Reflect.get(target, key);
    },
  }) as SafeError;

  safeError.proxy = true;

  return safeError;
}

async function transformHTTPException(error: any): Promise<HTTPException> {
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

async function normalizeModule<T>(module: any) {
  return (typeof module === 'function' ? module() : module) as T;
}

function normalizeHandler<T>(handler: any, disallowUnknownMethod: boolean): T {
  if (!handler) {
    throw new TypeError(`Module is missing export "handler".`);
  }
  if (typeof handler === 'function') {
    return handler;
  } else if (handler[HANDLER]) {
    return handler[HANDLER];
  } else {
    return (handler[HANDLER] = methodsToHandler(
      handler,
      disallowUnknownMethod
    ) as T);
  }
}

export function callMiddlewareModule(
  middleware: MiddlewareModule | (() => Promise<MiddlewareModule>)
): MiddlewareHandler {
  return async (context, next) => {
    const module = await normalizeModule<MiddlewareModule>(middleware);
    const handler = normalizeHandler<MiddlewareHandler>(module.handler, false);
    return handler(context, next);
  };
}

export function callActionModule(
  action: ActionModule | (() => Promise<ActionModule>)
): MiddlewareHandler {
  return async (context) => {
    const module = await normalizeModule<ActionModule>(action);
    const { request } = context;

    if (request.method !== 'POST') {
      return new Response(null, {
        status: 405,
        statusText: 'Method Not Allowed',
        headers: {
          Accept: 'POST',
        },
      });
    }

    return callContext(context, async function handler() {
      const json = await handleRpc(await request.json(), module);
      return Response.json(json);
    });
  };
}

export function createRouteContext(
  route: RouteModule | (() => Promise<RouteModule>),
  layout: LayoutModule | (() => Promise<LayoutModule>),
  defaultMeta: Meta,
  defaultBaseAsset: string,
  defaultRenderOptions: RouteRenderOptions,
  onFallback: OnFallback,
  dev: boolean
): MiddlewareHandler {
  return async (context, next) => {
    const routeContext = context as RouteContext;
    const module = await normalizeModule<RouteModule>(route);
    const layoutModule = await normalizeModule<LayoutModule>(layout);

    // If multiple routes match here, only the first one is valid.
    if (!routeContext.module) {
      routeContext.module = module;

      // If the route has a render function, it's a route module.
      if (module.render) {
        routeContext.data ??= Object.create(null);
        routeContext.error ??= undefined;
        routeContext.meta ??= mergeMeta(
          defaultMeta,
          rebaseMeta(module.meta ?? {}, defaultBaseAsset)
        );
        routeContext.render ??= composeRender(
          routeContext,
          layoutModule,
          onFallback,
          dev
        );
        routeContext.renderOptions ??= defaultRenderOptions;
      }
    }

    return next();
  };
}

export const createAsyncContext = callContext as MiddlewareNext;

export function createFallbackHandler(
  route: RouteModule | (() => Promise<RouteModule>),
  layout: LayoutModule | (() => Promise<LayoutModule>),
  defaultMeta: Meta,
  defaultBaseAsset: string,
  defaultRenderOptions: RouteRenderOptions,
  onFallback: OnFallback,
  dev: boolean
) {
  return async (error: unknown, context: MiddlewareContext) => {
    const routeContext = context as RouteContext;
    const layoutModule = await normalizeModule<LayoutModule>(layout);
    const module = await normalizeModule<RouteModule>(route);
    const handler = normalizeHandler<RouteHandler>(
      module.handler ??
        ({
          GET({ render }) {
            return render();
          },
        } as RouteHandlers),
      true
    );

    routeContext.data = Object.create(null);
    routeContext.error = await transformHTTPException(error);
    routeContext.meta = mergeMeta(
      defaultMeta,
      rebaseMeta(module.meta ?? {}, defaultBaseAsset)
    );
    // NOTE: `contextToScriptDescriptor` promises not to serialize private data.
    (routeContext.meta!.script ??= []).push(
      contextToScriptDescriptor(routeContext)
    );
    routeContext.module = module;
    routeContext.render = composeRender(
      routeContext,
      layoutModule,
      onFallback,
      dev
    );
    routeContext.renderOptions = defaultRenderOptions;

    return callContext(routeContext, handler, [routeContext]);
  };
}

export function callRouteModule(): MiddlewareHandler {
  return async (context, next) => {
    const routeContext = context as RouteContext;
    const module = routeContext.module;
    if (module) {
      const handler = normalizeHandler<RouteHandler>(
        module.handler ??
          ({
            GET({ render }) {
              return render();
            },
          } as RouteHandlers),
        true
      );

      if (routeContext.meta) {
        // NOTE: `contextToScriptDescriptor` promises not to serialize private data.
        (routeContext.meta.script ??= []).push(
          contextToScriptDescriptor(routeContext)
        );
      }

      return handler(routeContext);
    } else {
      return next();
    }
  };
}
