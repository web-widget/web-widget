/**
 * @fileoverview Engine domain object - Core business processing engine with unified rendering pipeline
 */
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
  RouteContext,
  RouteFallbackComponentProps,
  RouteHandler,
  RouteHandlers,
  RouteModule,
  RouteComponentProps,
  ServerRenderOptions,
} from './types';

const HANDLER = Symbol('handler');
const MODULE_CACHE = new WeakMap<
  RouteModule,
  {
    meta: Meta;
    renderer: ServerRenderOptions;
    render: RouteContext['render'];
    html: RouteContext['html'];
  }
>();

export type OnFallback = (
  error: HTTPException,
  context?: MiddlewareContext
) => void;

type SafeError = { proxy: true } & HTTPException;

/**
 * Engine domain object
 *
 * NOTE: Core business processing engine for unified module handling,
 * rendering pipeline orchestration, and error management
 */
export class Engine {
  #layoutModule: LayoutModule | (() => Promise<LayoutModule>);
  #defaultMeta: Meta;
  #defaultBaseAsset: string;
  #defaultRenderer: ServerRenderOptions;
  #onFallback: OnFallback;
  #dev: boolean;

  constructor(options: {
    layoutModule: LayoutModule | (() => Promise<LayoutModule>);
    defaultMeta: Meta;
    defaultBaseAsset: string;
    defaultRenderer: ServerRenderOptions;
    onFallback: OnFallback;
    dev: boolean;
  }) {
    this.#layoutModule = options.layoutModule;
    this.#defaultMeta = options.defaultMeta;
    this.#defaultBaseAsset = options.defaultBaseAsset;
    this.#defaultRenderer = options.defaultRenderer;
    this.#onFallback = options.onFallback;
    this.#dev = options.dev;
  }

  async processRoute(): Promise<MiddlewareHandler> {
    return async (context, next) => {
      const routeContext = context as RouteContext;
      const module = routeContext.module;
      if (module) {
        const handler = this.#normalizeHandler<RouteHandler>(
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

  async processMiddleware(
    middleware: MiddlewareModule | (() => Promise<MiddlewareModule>)
  ): Promise<MiddlewareHandler> {
    return async (context, next) => {
      const module = await this.#normalizeModule<MiddlewareModule>(middleware);
      const handler = this.#normalizeHandler<MiddlewareHandler>(
        module.handler,
        false
      );
      return handler(context, next);
    };
  }

  async processAction(
    action: ActionModule | (() => Promise<ActionModule>)
  ): Promise<MiddlewareHandler> {
    return async (context) => {
      const module = await this.#normalizeModule<ActionModule>(action);
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

  async createRouteContextHandler(
    route: RouteModule | (() => Promise<RouteModule>)
  ): Promise<MiddlewareHandler> {
    return async (context, next) => {
      const routeContext = context as RouteContext;
      const module = await this.#normalizeModule<RouteModule>(route);

      // If multiple routes match here, only the first one is valid.
      if (!routeContext.module) {
        routeContext.module = module;

        // If the route has a render function, it's a route module.
        if (module.render) {
          let cached = MODULE_CACHE.get(module);

          if (!cached) {
            const layoutModule = await this.#normalizeModule<LayoutModule>(
              this.#layoutModule
            );
            cached = {
              meta: mergeMeta(
                this.#defaultMeta,
                rebaseMeta(module.meta ?? {}, this.#defaultBaseAsset)
              ),
              renderer: this.#defaultRenderer,
              render: this.#composeRender(layoutModule),
              html: this.#composeHtml(layoutModule),
            };
            MODULE_CACHE.set(module, cached);
          }

          routeContext.meta = structuredClone(cached.meta);
          routeContext.render = cached.render.bind(context);
          routeContext.html = cached.html.bind(context);
          routeContext.renderOptions = routeContext.renderer = structuredClone(
            cached.renderer
          );
        }
      }

      return next();
    };
  }

  async createErrorHandler(route: RouteModule | (() => Promise<RouteModule>)) {
    return async (error: unknown, context: MiddlewareContext) => {
      const routeContext = context as RouteContext;
      const module = await this.#normalizeModule<RouteModule>(route);

      // Don't use cache for fallback handlers to avoid onFallback callback conflicts
      const layoutModule = await this.#normalizeModule<LayoutModule>(
        this.#layoutModule
      );
      const meta = mergeMeta(
        this.#defaultMeta,
        rebaseMeta(module.meta ?? {}, this.#defaultBaseAsset)
      );

      routeContext.meta = structuredClone(meta);
      routeContext.render = this.#composeRender(layoutModule).bind(context);
      routeContext.html = this.#composeHtml(layoutModule).bind(context);
      routeContext.renderOptions = routeContext.renderer = structuredClone(
        this.#defaultRenderer
      );

      const httpError = await this.#transformHTTPException(error);
      routeContext.error = httpError;
      // NOTE: `contextToScriptDescriptor` promises not to serialize private data.
      (routeContext.meta!.script ??= []).push(
        contextToScriptDescriptor(routeContext)
      );
      routeContext.module = module;

      // Call render directly with the error to trigger onFallback
      return routeContext.html(null, { error: httpError });
    };
  }

  async #renderToResponse(
    context: RouteContext,
    layoutModule: LayoutModule,
    data: unknown,
    unsafeError: HTTPException | undefined,
    meta: Meta,
    renderer: ServerRenderOptions,
    responseInit?: ResponseInit
  ) {
    if (unsafeError) {
      this.#onFallback(unsafeError, context);
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
      ? this.#dev
        ? unsafeError
        : this.#createSafeError(unsafeError)
      : undefined;

    const {
      html: _html,
      module: _module,
      render: _render,
      renderer: _renderer,
      renderOptions: _renderOptions,
      waitUntil: _waitUntil,
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
      renderer
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
      renderer
    );
    const status =
      responseInit?.status ??
      (error ? (error.status ? error.status : 500) : 200);
    const statusText =
      responseInit?.statusText ??
      (error
        ? error.statusText
          ? error.statusText
          : 'Internal Server Error'
        : 'OK');

    const headers = new Headers(responseInit?.headers);

    if (!headers.has('content-type')) {
      headers.set('content-type', 'text/html; charset=utf-8');
    }

    if (renderer?.progressive) {
      // NOTE: Disable Nginx buffering for progressive responses.
      // NOTE: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
      headers.set('x-accel-buffering', 'no');
    }

    if (this.#dev) {
      const source = (context.module as DevRouteModule).$source;
      const devSourceKey: DevHttpHandler = 'x-module-source';
      headers.set(devSourceKey, source);
    }

    return new Response(html, {
      status,
      statusText,
      headers,
    });
  }

  #composeRender(layoutModule: LayoutModule): RouteContext['render'] {
    const engine = this;
    return async function render(
      this: RouteContext,
      { data = this.data, error = this.error, meta = this.meta } = {},
      { headers, status, statusText, ...renderer } = this.renderOptions
    ) {
      return engine.#renderToResponse(
        this,
        layoutModule,
        data,
        error,
        meta,
        renderer,
        { headers, status, statusText }
      );
    };
  }

  #composeHtml(layoutModule: LayoutModule): RouteContext['html'] {
    const engine = this;
    return async function html(
      this: RouteContext,
      data = this.data,
      {
        error = this.error,
        meta = this.meta,
        renderer = this.renderer,
        ...responseInit
      } = {}
    ) {
      return engine.#renderToResponse(
        this,
        layoutModule,
        data,
        error,
        meta,
        renderer,
        responseInit
      );
    };
  }

  #createSafeError(error: HTTPException | SafeError): HTTPException {
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

  async #transformHTTPException(error: any): Promise<HTTPException> {
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

  async #normalizeModule<T>(module: any) {
    return (typeof module === 'function' ? module() : module) as T;
  }

  #normalizeHandler<T>(handler: any, disallowUnknownMethod: boolean): T {
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
}
