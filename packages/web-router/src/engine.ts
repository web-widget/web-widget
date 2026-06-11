/**
 * @fileoverview Engine domain object - Core business processing engine with unified rendering pipeline
 */
import { handleRpc } from '@web-widget/action/server';
import { contextToScriptDescriptor } from '@web-widget/context/server';
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
  LayoutComponentProps,
  LayoutModule,
  Meta,
  MiddlewareContext,
  MiddlewareHandler,
  MiddlewareModule,
  RouteComponentProps,
  RouteContext,
  RouteHandler,
  RouteHandlers,
  RouteModule,
  RouteRenderOptions,
  ServerRenderOptions,
} from './types';

declare module '@web-widget/helpers' {
  interface RouteContext {
    /**
     * Private property: cached handler
     * @internal
     */
    _handler?: RouteHandler;
  }
}

const HANDLER = Symbol('handler');

// Type for cached module data
interface CachedModuleData {
  meta?: Meta;
  renderer?: ServerRenderOptions;
  render?: RouteContext['render'];
  html?: RouteContext['html'];
  handler: RouteHandler;
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

  /**
   * @internal Resets route activation when Application rewrites the internal request.
   */
  static invalidateRouteContext(context: MiddlewareContext): void {
    invalidateRouteActivation(context);
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
          if (!hasRouteActivation(routeContext)) {
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

  createRouteHandler(
    module: RouteModule | (() => Promise<RouteModule>)
  ): MiddlewareHandler {
    let cachedHandler: MiddlewareHandler | null = null;

    return async (context, next) => {
      if (!cachedHandler) {
        cachedHandler = async (context, next) => {
          const routeContext = context as RouteContext;
          const resolvedModule =
            await this.#normalizeModule<RouteModule>(module);

          if (resolvedModule) {
            const activation = getRouteActivation(routeContext);
            if (!activation?._handler) {
              await this.#activateModule(routeContext, resolvedModule);
            }

            const handler = getRouteActivation(routeContext)!._handler!;

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
  ): (error: HTTPException, context: MiddlewareContext) => Promise<Response> {
    let cachedHandler:
      | ((
          error: HTTPException,
          context: MiddlewareContext
        ) => Promise<Response>)
      | null = null;

    return async (error, context) => {
      if (!cachedHandler) {
        cachedHandler = async (error, context) => {
          const routeContext = context as RouteContext;
          const resolvedModule =
            await this.#normalizeModule<RouteModule>(module);

          // For error scenarios, execute onFallback callback immediately upon module activation
          this.#onFallback(error, context);

          // Activate error module with immediate callback execution
          await this.#activateModule(routeContext, resolvedModule, error);

          // Use the cached handler (already handles error scenarios correctly)
          const handler = routeContext._handler!;

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
   */
  async #activateModule(
    context: RouteContext,
    module: RouteModule,
    error?: HTTPException
  ): Promise<void> {
    const state = ensureRouteActivation(context);
    state.module = module;
    state.error = error;

    let cached = MODULE_CACHE.get(module);
    if (!cached) {
      const handler = this.#normalizeRouteHandler(module, !!error);

      if (module.render) {
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
          handler,
        };
      } else {
        cached = {
          handler,
        };
      }

      MODULE_CACHE.set(module, cached);
    }

    state._handler = cached.handler;

    if (module.render) {
      state.meta = structuredClone(cached.meta!);
      state.render = cached.render!.bind(context);
      state.html = cached.html!.bind(context);
      state.renderOptions = state.renderer = structuredClone(cached.renderer!);
    }

    applyRouteActivationToHost(context, state);
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

    // Build common component props
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

    // Select component and props based on error state and availability
    const component =
      error && context.module.fallback
        ? context.module.fallback
        : context.module.default;

    const renderProps =
      error && context.module.fallback
        ? this.#createSerializableError(error)
        : componentProps;

    const children = await context.module.render(
      component,
      renderProps,
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

  /**
   * Factory methods for creating default handlers
   */
  #createDefaultRouteHandler(): RouteHandlers {
    return {
      GET(context: RouteContext) {
        return context.html();
      },
    };
  }

  #createDefaultErrorHandler(): RouteHandler {
    return (context: RouteContext) => {
      // Use the error from context, which is set during module activation
      return context.html(null, { error: context.error });
    };
  }

  /**
   * Get or create appropriate handler for a module
   */
  #getModuleHandler(
    module: RouteModule,
    isErrorScenario = false
  ): RouteHandler | RouteHandlers {
    if (module.handler) {
      return module.handler;
    }

    // Return appropriate default handler based on scenario
    return isErrorScenario
      ? this.#createDefaultErrorHandler()
      : this.#createDefaultRouteHandler();
  }

  /**
   * Normalize any handler to RouteHandler with unified default handling
   */
  #normalizeRouteHandler(
    module: RouteModule,
    isErrorScenario = false
  ): RouteHandler {
    const handler = this.#getModuleHandler(module, isErrorScenario);
    return this.#normalizeHandler<RouteHandler>(handler, true);
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

  #createSerializableError(error: HTTPException): {
    name: string;
    message: string;
    stack: string;
    status: number;
    statusText: string;
    cause?: unknown;
  } {
    return {
      name: error.name || 'Error',
      message: error.message || 'An error occurred',
      stack: error.stack || '',
      status: error.status || 500,
      statusText: error.statusText || 'Internal Server Error',
      cause: error.cause,
    };
  }

  #createSafeError(error: HTTPException | SafeError): HTTPException {
    if ((error as SafeError).proxy) {
      return error as HTTPException;
    }

    const safeError = new Proxy(error, {
      get(target, key) {
        if (key === 'stack' || key === 'cause') {
          return '';
        }
        return Reflect.get(target, key);
      },
    }) as SafeError;

    safeError.proxy = true;

    return safeError;
  }
}

// ---------------------------------------------------------------------------
// Route activation (Engine-private). State lives here; mirrored onto the host
// object so RouteContext handlers keep using context.module / context.html().
// ---------------------------------------------------------------------------

interface RouteActivationState {
  module?: RouteModule;
  meta?: Meta;
  render?: RouteContext['render'];
  html?: RouteContext['html'];
  renderOptions?: RouteRenderOptions;
  renderer?: ServerRenderOptions;
  data?: unknown;
  error?: HTTPException;
  _handler?: RouteHandler;
}

const activations = new WeakMap<MiddlewareContext, RouteActivationState>();

const ROUTE_HOST_KEYS = [
  'module',
  'meta',
  'render',
  'html',
  'renderOptions',
  'renderer',
  'data',
  'error',
  '_handler',
] as const satisfies ReadonlyArray<keyof RouteActivationState>;

function getRouteActivation(
  host: MiddlewareContext
): RouteActivationState | undefined {
  return activations.get(host);
}

function ensureRouteActivation(host: MiddlewareContext): RouteActivationState {
  let state = activations.get(host);
  if (!state) {
    activations.set(host, (state = {}));
  }
  return state;
}

function hasRouteActivation(host: MiddlewareContext): boolean {
  const state = activations.get(host);
  if (state?.module !== undefined) {
    applyRouteActivationToHost(host, state);
    return true;
  }
  return (host as RouteContext).module !== undefined;
}

function applyRouteActivationToHost(
  host: MiddlewareContext,
  state: RouteActivationState
): void {
  const target = host as RouteContext;
  for (const key of ROUTE_HOST_KEYS) {
    const value = state[key];
    if (value !== undefined) {
      (target as unknown as Record<string, unknown>)[key] = value;
    }
  }
}

function removeRouteActivationFromHost(host: MiddlewareContext): void {
  const target = host as unknown as Record<string, unknown>;
  for (const key of ROUTE_HOST_KEYS) {
    delete target[key];
  }
}

function invalidateRouteActivation(host: MiddlewareContext): void {
  activations.delete(host);
  removeRouteActivationFromHost(host);
}
