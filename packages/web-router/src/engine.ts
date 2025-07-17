/**
 * @fileoverview Engine domain object - Core business processing engine with unified rendering pipeline
 */
/* eslint-disable no-param-reassign */
import { handleRpc } from '@web-widget/action/server';
import { contextToScriptDescriptor } from '@web-widget/context/server';
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
  RouteHandler,
  RouteHandlers,
  RouteModule,
  RouteComponentProps,
  ServerRenderOptions,
} from './types';

const HANDLER = Symbol('handler');

// Type for cached module data
interface CachedModuleData {
  meta: Meta;
  renderer: ServerRenderOptions;
  render: RouteContext['render'];
  html: RouteContext['html'];
}

const MODULE_CACHE = new WeakMap<RouteModule, CachedModuleData>();

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

  // =========================================================================
  // Constructor and Configuration
  // =========================================================================

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

  // =========================================================================
  // Public API - Handler Factory Methods
  // =========================================================================

  createRouteContextHandler(
    module: RouteModule | (() => Promise<RouteModule>)
  ): MiddlewareHandler {
    let cachedHandler: MiddlewareHandler | null = null;

    return async (context, next) => {
      if (!cachedHandler) {
        cachedHandler = async (context, next) => {
          const routeContext = context as RouteContext;

          // If multiple routes match here, only the first one is valid.
          if (!routeContext.module) {
            const resolvedModule =
              await this.#normalizeModule<RouteModule>(module);
            await this.#activateModule(routeContext, resolvedModule);
          }

          return next();
        };
      }
      return cachedHandler(context, next);
    };
  }

  createMiddlewareHandler(
    module: MiddlewareModule | (() => Promise<MiddlewareModule>)
  ): MiddlewareHandler {
    let cachedHandler: MiddlewareHandler | null = null;

    return async (context, next) => {
      if (!cachedHandler) {
        const resolvedModule =
          await this.#normalizeModule<MiddlewareModule>(module);
        cachedHandler = this.#normalizeHandler<MiddlewareHandler>(
          resolvedModule.handler!,
          false
        );
      }
      return cachedHandler(context, next);
    };
  }

  createActionHandler(
    module: ActionModule | (() => Promise<ActionModule>)
  ): MiddlewareHandler {
    let cachedHandler: MiddlewareHandler | null = null;

    return async (context, next) => {
      if (!cachedHandler) {
        cachedHandler = async (context) => {
          const resolvedModule =
            await this.#normalizeModule<ActionModule>(module);
          const { request } = context;

          // Actions only accept POST requests
          if (request.method !== 'POST') {
            return new Response(null, {
              status: 405,
              statusText: 'Method Not Allowed',
              headers: {
                Accept: 'POST',
              },
            });
          }

          const json = await handleRpc(await request.json(), resolvedModule);
          return Response.json(json);
        };
      }
      return cachedHandler(context, next);
    };
  }

  createRouteHandler(): MiddlewareHandler {
    let cachedHandler: MiddlewareHandler | null = null;

    return async (context, next) => {
      if (!cachedHandler) {
        cachedHandler = async (context, next) => {
          const routeContext = context as RouteContext;
          const module = routeContext.module;
          if (module) {
            const handler = this.#normalizeHandler<RouteHandler>(
              module.handler ??
                // Default handler: render the component for GET requests
                ({
                  GET(context) {
                    return context.html();
                  },
                } as RouteHandlers),
              true
            );

            // Add context to script descriptors for client-side hydration
            // This ensures the client has access to server-side context data
            this.#addContextScriptDescriptor(routeContext);

            return handler(routeContext);
          } else {
            return next();
          }
        };
      }
      return cachedHandler(context, next);
    };
  }

  createErrorHandler(
    module: RouteModule | (() => Promise<RouteModule>)
  ): (error: unknown, context: MiddlewareContext) => Promise<Response> {
    let cachedHandler:
      | ((error: unknown, context: MiddlewareContext) => Promise<Response>)
      | null = null;

    return async (error: unknown, context: MiddlewareContext) => {
      if (!cachedHandler) {
        cachedHandler = async (error: unknown, context: MiddlewareContext) => {
          const routeContext = context as RouteContext;
          const resolvedModule =
            await this.#normalizeModule<RouteModule>(module);
          const httpError = await this.#transformHTTPException(error);

          // Activate error module with immediate callback execution
          await this.#activateModule(routeContext, resolvedModule, httpError);

          const handler = this.#normalizeHandler<RouteHandler>(
            resolvedModule.handler ??
              // Default error handler - doesn't depend on HTTP method
              ((context: RouteContext) => {
                return context.html(null, { error: httpError });
              }),
            true
          );

          // Add context to script descriptors for client-side hydration
          // This ensures the client has access to server-side context data
          this.#addContextScriptDescriptor(routeContext);
          return handler(routeContext);
        };
      }
      return cachedHandler(error, context);
    };
  }

  // =========================================================================
  // Core Business Logic - Module Activation
  // =========================================================================

  /**
   * Unified module activation method
   *
   * NOTE: This method handles both regular route modules and error modules
   * by activating the module in the context and setting up rendering capabilities.
   * For error modules, it immediately executes the onFallback callback.
   */
  async #activateModule(
    context: RouteContext,
    module: RouteModule,
    error?: HTTPException
  ): Promise<void> {
    // Set the module as the active module
    context.module = module;

    // For error scenarios, execute onFallback callback immediately upon module activation
    if (error) {
      this.#onFallback(error, context);
      context.error = error;
    }

    // Setup rendering capabilities based on module type
    if (module.render) {
      let cached: CachedModuleData | undefined;

      cached = MODULE_CACHE.get(module);

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

      context.meta = structuredClone(cached.meta);
      context.render = cached.render.bind(context);
      context.html = cached.html.bind(context);
      context.renderOptions = context.renderer = structuredClone(
        cached.renderer
      );
    }
  }

  // =========================================================================
  // Rendering Methods
  // =========================================================================

  async #renderToResponse(
    context: RouteContext,
    layoutModule: LayoutModule,
    data: unknown,
    unsafeError: HTTPException | undefined,
    meta: Meta,
    renderer: ServerRenderOptions,
    responseInit?: ResponseInit
  ) {
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

    const componentExportName = error ? 'fallback' : 'default';
    const component = context.module[componentExportName];
    const componentProps: RouteComponentProps = {
      data,
      error,
      meta,
      name: context.name,
      params: context.params,
      pathname: context.pathname,
      request: context.request,
      state: context.state,
    };

    const children = await context.module.render(
      component,
      error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            status: error.status,
            statusText: error.statusText,
          }
        : componentProps,
      renderer
    );
    const layoutContext: LayoutComponentProps = {
      children,
      ...componentProps,
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
      // https://nginx.org/en/docs/http/ngx_http_proxy_module.html
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

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Add context script descriptor to meta for client-side hydration
   */
  #addContextScriptDescriptor(context: RouteContext): void {
    if (context.meta) {
      // NOTE: `contextToScriptDescriptor` promises not to serialize private data.
      (context.meta.script ??= []).push(contextToScriptDescriptor(context));
    }
  }

  async #normalizeModule<T>(module: T | (() => Promise<T>)): Promise<T> {
    if (typeof module === 'function') {
      return await (module as () => Promise<T>)();
    }
    return module;
  }

  #normalizeHandler<T>(
    handler: T | Record<string, unknown>,
    disallowUnknownMethod: boolean
  ): T {
    if (!handler) {
      throw new TypeError(`Module is missing export "handler".`);
    }
    if (typeof handler === 'function') {
      return handler as T;
    } else {
      const handlerObj = handler as Record<string, unknown> & { [HANDLER]?: T };
      if (handlerObj[HANDLER]) {
        return handlerObj[HANDLER]!;
      } else {
        // Use type assertion to handle the methodsToHandler call
        return (handlerObj[HANDLER] = methodsToHandler(
          handlerObj as any,
          disallowUnknownMethod
        ) as T);
      }
    }
  }

  async #transformHTTPException(error: unknown): Promise<HTTPException> {
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
}
