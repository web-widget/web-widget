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
  DevHandlerInit,
  DevRouteModule,
  LayoutModule,
  LayoutRenderContext,
  Meta,
  MiddlewareContext,
  MiddlewareHandler,
  MiddlewareModule,
  MiddlewareNext,
  RouteContext,
  RouteError,
  RouteHandler,
  RouteHandlers,
  RouteModule,
  RouteRenderContext,
  RouteRenderOptions,
} from './types';

const HANDLER = Symbol('handler');

export type OnFallback = (
  error: RouteError,
  context?: MiddlewareContext
) => void;

function composeRender(
  context: RouteContext,
  layoutModule: LayoutModule,
  onFallback: OnFallback,
  dev: boolean | undefined
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
    const headers: HeadersInit = {
      'content-type': 'text/html; charset=utf-8',
      ...renderOptions?.headers,
    };

    if (dev) {
      const source = (context.module as DevRouteModule).$source;
      (headers as DevHandlerInit)['x-module-source'] = source;
    }

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

async function normalizeModule<T>(module: any) {
  return (typeof module === 'function' ? module() : module) as T;
}

function normalizeHandler<T>(handler: any, disallowUnknownMethod: boolean): T {
  if (!handler) {
    throw new TypeError(`Module does not export "handler".`);
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
) {
  return async (context: MiddlewareContext, next: MiddlewareNext) => {
    const module = await normalizeModule<RouteModule>(route);
    const layoutModule = await normalizeModule<LayoutModule>(layout);

    // If multiple routes match here, only the first one is valid.
    if (!context.module) {
      context.module = module;

      // If the route has a render function, it's a route module.
      if (module.render) {
        context.data ??= Object.create(null);
        context.error ??= undefined;
        context.meta ??= mergeMeta(
          defaultMeta,
          rebaseMeta(module.meta ?? {}, defaultBaseAsset)
        );
        context.render ??= composeRender(
          context as RouteContext,
          layoutModule,
          onFallback,
          dev
        );
        context.renderOptions ??= structuredClone(defaultRenderOptions);
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

    context.data = Object.create(null);
    context.error = await transformRouteError(error);
    context.meta = mergeMeta(
      defaultMeta,
      rebaseMeta(module.meta ?? {}, defaultBaseAsset)
    );
    // NOTE: `contextToScriptDescriptor` promises not to serialize private data.
    (context.meta!.script ??= []).push(contextToScriptDescriptor(context));
    context.module = module;
    context.render = composeRender(
      context as RouteContext,
      layoutModule,
      onFallback,
      dev
    );
    context.renderOptions = structuredClone(defaultRenderOptions);

    return callContext(context, handler, [context as RouteContext]);
  };
}

export function callRouteModule(): MiddlewareHandler {
  return async (context, next) => {
    const module = context.module;
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

      if (context.meta) {
        // NOTE: `contextToScriptDescriptor` promises not to serialize private data.
        (context.meta.script ??= []).push(contextToScriptDescriptor(context));
      }

      return handler(context as RouteContext);
    } else {
      return next();
    }
  };
}
