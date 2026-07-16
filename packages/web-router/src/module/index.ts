/**
 * @fileoverview ModuleRuntime — coordinates schema module handlers and activation
 */
import { handleRpc } from '@web-widget/action/server';
import { contextToScriptDescriptor } from '@web-widget/context/server';
import type {
  ActionModule,
  HTTPException,
  LayoutModule,
  Meta,
  MiddlewareContext,
  MiddlewareHandler,
  MiddlewareModule,
  RouteContext,
  RouteHandler,
  RouteModule,
  ServerRenderOptions,
} from '../types';
import {
  ensureRouteAccessors,
  ensureRouteActivation,
  getRouteActivation,
  hasRouteActivation,
  invalidateRouteActivation,
} from './activation';
import { normalizeHandler, normalizeRouteHandler } from './handler';
import { ModuleLoaderCache } from './loader';
import {
  ModuleRenderer,
  type DevMetaProvider,
  type RenderCacheData,
} from './renderer';

// Type for cached module data
interface CachedModuleData extends Partial<RenderCacheData> {
  handler: RouteHandler;
}

export type { DevMetaProvider } from './renderer';

export type OnFallback = (
  error: HTTPException,
  context?: MiddlewareContext
) => void | Promise<void>;

/**
 * Runtime for schema modules: handler factories, route activation, and server rendering.
 */
export class ModuleRuntime {
  #onFallback: OnFallback;
  #renderer: ModuleRenderer;
  #moduleCache = new WeakMap<RouteModule, CachedModuleData>();
  #moduleLoaders = new ModuleLoaderCache();

  // =========================================================================
  // Constructor and Configuration
  // =========================================================================

  constructor(options: {
    layoutModule: LayoutModule | (() => Promise<LayoutModule>);
    defaultMeta: Meta;
    defaultBaseAsset: string;
    defaultRenderer: ServerRenderOptions;
    onFallback: OnFallback;
    exposeErrors?: boolean;
  }) {
    this.#onFallback = options.onFallback;
    this.#renderer = new ModuleRenderer(options, this.#moduleLoaders);
  }

  /** @internal Sets the dev meta provider at runtime (used by vite-plugin dev middleware). */
  setDevMetaProvider(provider: DevMetaProvider): void {
    this.#renderer.setDevMetaProvider(provider);
  }

  /** @internal */
  static hasActivation(host: MiddlewareContext): boolean {
    return hasRouteActivation(host);
  }

  /** @internal Clears route activation for the given context. */
  clearActivation(context: MiddlewareContext): void {
    invalidateRouteActivation(context);
  }

  createRouteContextHandler(
    module: RouteModule | (() => Promise<RouteModule>)
  ): MiddlewareHandler {
    if (module && typeof module !== 'function' && !module.render) {
      const resolvedModule = module;
      const handler = this.#getCachedRouteHandler(resolvedModule);

      return (context, next) => {
        const routeContext = context as RouteContext;
        if (!hasRouteActivation(routeContext)) {
          this.#activateHandlerModule(routeContext, resolvedModule, handler);
        } else {
          ensureRouteAccessors(routeContext);
        }
        return next();
      };
    }

    const loadModule = this.#moduleLoaders.get(module);

    return async (context, next) => {
      const routeContext = context as RouteContext;

      // If multiple routes match here, only the first one is valid.
      if (!hasRouteActivation(routeContext)) {
        await this.#activateModule(routeContext, await loadModule());
      } else {
        ensureRouteAccessors(routeContext);
      }

      return next();
    };
  }

  /**
   * Production keeps module activation caches for static imports.
   * Hosts may invalidate caches via module graph / router lifecycle.
   */
  createMiddlewareHandler(
    module: MiddlewareModule | (() => Promise<MiddlewareModule>)
  ): MiddlewareHandler {
    const loadModule = this.#moduleLoaders.get(module);
    let cachedHandler: MiddlewareHandler | null = null;

    return async (context, next) => {
      if (!cachedHandler) {
        const resolvedModule = await loadModule();
        cachedHandler = normalizeHandler<MiddlewareHandler>(
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
    const loadModule = this.#moduleLoaders.get(module);
    let cachedHandler: MiddlewareHandler | null = null;

    return async (context, next) => {
      if (!cachedHandler) {
        const resolvedModule = await loadModule();
        cachedHandler = async (context) => {
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
    if (module && typeof module !== 'function' && !module.render) {
      const resolvedModule = module;
      const normalizedHandler = this.#getCachedRouteHandler(resolvedModule);

      return (context, next) => {
        const routeContext = context as RouteContext;
        if (!getRouteActivation(routeContext)?._handler) {
          this.#activateHandlerModule(
            routeContext,
            resolvedModule,
            normalizedHandler
          );
        }
        this.#addContextScriptDescriptor(routeContext);
        return normalizedHandler(routeContext);
      };
    }

    const loadModule = this.#moduleLoaders.get(module);

    return async (context, next) => {
      const routeContext = context as RouteContext;
      const resolvedModule = await loadModule();

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
      }
      return next();
    };
  }

  createErrorHandler(
    module: RouteModule | (() => Promise<RouteModule>)
  ): (error: HTTPException, context: MiddlewareContext) => Promise<Response> {
    const loadModule = this.#moduleLoaders.get(module);

    return async (error, context) => {
      const routeContext = context as RouteContext;
      const resolvedModule = await loadModule();

      try {
        await this.#onFallback(error, context);
      } catch (cause) {
        console.error(new Error('The onFallback callback failed.', { cause }));
      }

      // Keep diagnostics isolated from the actual error-page render.
      await this.#activateModule(routeContext, resolvedModule, error);

      const handler = getRouteActivation(routeContext)!._handler!;
      this.#addContextScriptDescriptor(routeContext);
      return handler(routeContext);
    };
  }

  // =========================================================================
  // Core Business Logic - Module Activation
  // =========================================================================

  #getCachedRouteHandler(module: RouteModule): RouteHandler {
    let cached = this.#moduleCache.get(module);
    if (!cached) {
      cached = { handler: normalizeRouteHandler(module) };
      this.#moduleCache.set(module, cached);
    }
    return cached.handler;
  }

  #activateHandlerModule(
    context: RouteContext,
    module: RouteModule,
    handler: RouteHandler
  ): void {
    const state = ensureRouteActivation(context);
    state.module = module;
    state._handler = handler;
  }

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

    let cached = this.#moduleCache.get(module);
    if (!cached) {
      const handler = normalizeRouteHandler(module, !!error);

      if (module.render) {
        cached = {
          handler,
          ...(await this.#renderer.createRenderData(module)),
        };
      } else {
        cached = {
          handler,
        };
      }

      this.#moduleCache.set(module, cached);
    }

    state._handler = cached.handler;

    if (module.render) {
      state.meta = structuredClone(cached.meta!);
      state.render = cached.render!.bind(context);
      state.html = cached.html!.bind(context);
      state.renderOptions = state.renderer = structuredClone(cached.renderer!);
    }
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
}
