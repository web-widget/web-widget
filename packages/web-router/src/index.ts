/**
 * @fileoverview Web-Router entry point - WebRouter class definition and exports
 */
import { rebaseMeta } from '@web-widget/helpers';
import { createHttpError } from '@web-widget/helpers/error';

import type { ApplicationOptions } from './application';
import { Application } from './application';
import * as defaultFallbackModule from './fallback';
import * as defaultLayoutModule from './layout';
import { callContext } from '@web-widget/context/server';
import { ModuleRuntime, type OnFallback } from './module';
import type {
  Env,
  LayoutModule,
  Manifest,
  Meta,
  RouteContext,
  RouteModule,
  RouteRenderOptions,
  ServerRenderOptions,
} from './types';

export type * from './types';
export type { OnFallback } from './module';
export type { Router, Result, Params } from './router';
export { URLPatternRouter, createRouter } from './router';

export type StartOptions<E extends Env = {}> = {
  baseAsset?: string;
  defaultMeta?: Meta;
  defaultRenderOptions?: RouteRenderOptions;
  /** @experimental */
  defaultRenderer?: ServerRenderOptions;
  /** When true, server error pages include full error details. Defaults to `false`. */
  exposeErrors?: boolean;
  onFallback?: OnFallback;
} & ApplicationOptions<E>;

export default class WebRouter<E extends Env = Env> extends Application<E> {
  constructor(options: StartOptions<E> = {}) {
    super(options);
  }

  static fromManifest<E extends Env = Env>(
    manifest: Partial<Manifest>,
    options: StartOptions<E> = {}
  ) {
    const middlewares = manifest.middlewares ?? [];
    const actions = manifest.actions ?? [];
    const routes = manifest.routes ?? [];
    const layout = manifest.layout ?? {
      module: async () => defaultLayoutModule as LayoutModule,
    };
    const fallbacks = manifest.fallbacks ?? [];
    const defaultBaseAsset = options.baseAsset ?? '/';
    const defaultMeta = rebaseMeta(
      options.defaultMeta ?? {
        lang: 'en',
        meta: [
          {
            charset: 'utf-8',
          },
          {
            name: 'viewport',
            content: 'width=device-width, initial-scale=1.0',
          },
        ],
      },
      defaultBaseAsset
    );
    const defaultRenderer: RouteRenderOptions = {
      progressive: false,
      ...structuredClone(
        options.defaultRenderer ?? options.defaultRenderOptions ?? {}
      ),
    };
    const onFallback =
      options.onFallback ??
      ((error, context) => {
        const status = Reflect.get(error, 'status') ?? 500;
        const expose = Reflect.get(error, 'expose');

        if (status >= 500 && !expose) {
          const message = (error.stack || error.toString()).replace(
            /^/gm,
            '  '
          );
          if (context) {
            console.error(
              `${context.request.method} ${context.request.url}\n${message}\n`
            );
          } else {
            console.error(`\n${message}\n`);
          }
        }
      });

    const runtime = new ModuleRuntime({
      layoutModule: layout.module,
      defaultMeta,
      defaultBaseAsset,
      defaultRenderer,
      onFallback,
      exposeErrors: manifest.exposeErrors ?? options.exposeErrors ?? false,
    });

    const router = new WebRouter<E>(options);
    router.useModuleRuntime(runtime);

    routes.forEach((item) => {
      router.use(item.pathname, runtime.createRouteContextHandler(item.module));
    });

    router.use('*', callContext);

    middlewares.forEach((item) => {
      router.use(item.pathname, runtime.createMiddlewareHandler(item.module));
    });

    actions.forEach((item) => {
      router.use(item.pathname, runtime.createActionHandler(item.module));
    });

    routes.forEach((item) => {
      router.use(item.pathname, runtime.createRouteHandler(item.module));
    });

    // Create a status code to fallback mapping for efficient lookups
    const fallbackMap = new Map<number, () => Promise<RouteModule>>();

    // Populate the map with user-defined fallbacks
    fallbacks.forEach((fallback) => {
      const normalizedModule =
        typeof fallback.module === 'function'
          ? fallback.module
          : async () => fallback.module as RouteModule;
      fallbackMap.set(fallback.status, normalizedModule);
    });

    // Create fallback resolver using the extracted function
    const getFallbackHandler = createFallbackResolver(
      fallbackMap,
      runtime,
      defaultFallbackModule as RouteModule
    );

    // Setup 404 handler with the new system
    const notFoundHandler = getFallbackHandler(404);
    router.notFound(async (context) => {
      return notFoundHandler(
        createHttpError(404),
        context as unknown as RouteContext
      );
    });

    // Setup generic error handler with smart status code routing
    router.onError(async (error, context) => {
      try {
        const status = (error as { status?: number })?.status ?? 500;
        const handler = getFallbackHandler(status);
        return await handler(error, context as unknown as RouteContext);
      } catch (cause) {
        console.error(
          new Error('Custom error page throws an error.', {
            cause,
          })
        );
        const message = 'Internal Server Error';
        return new Response(message, {
          status: 500,
        });
      }
    });

    return router;
  }
}

/**
 * Helper function to get appropriate fallback handler for a status code
 */
function createFallbackResolver(
  fallbackMap: Map<number, () => Promise<RouteModule>>,
  runtime: ModuleRuntime,
  defaultFallbackModule: RouteModule
) {
  return (status: number) => {
    // First try exact status match (highest priority)
    let fallbackModule = fallbackMap.get(status);

    if (!fallbackModule) {
      // For 4xx errors, use 400 as default fallback for all client errors
      // If no 400 page is defined, fallback to 404 for backward compatibility
      if (status >= 400 && status < 500) {
        fallbackModule = fallbackMap.get(400) || fallbackMap.get(404);
      }
      // For 5xx and above errors, all treat as 500 (server errors)
      else if (status >= 500) {
        fallbackModule = fallbackMap.get(500);
      }
    }

    // Ultimate fallback to default module
    if (!fallbackModule) {
      fallbackModule = async () => defaultFallbackModule;
    }

    return runtime.createErrorHandler(fallbackModule);
  };
}
