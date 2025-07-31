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
import { Engine, type OnFallback } from './engine';
import type {
  LayoutModule,
  Manifest,
  ManifestAction,
  ManifestFallback,
  ManifestMiddleware,
  ManifestRoute,
  Meta,
  RouteContext,
  RouteModule,
  RouteRenderOptions,
  RoutePattern,
  ServerRenderOptions,
} from './types';

export type * from './types';
export type { OnFallback } from './engine';

export type StartOptions = {
  baseAsset?: string;
  defaultMeta?: Meta;
  defaultRenderOptions?: RouteRenderOptions;
  /** @experimental */
  defaultRenderer?: ServerRenderOptions;
  /** @deprecated */
  dev?: boolean;
  onFallback?: OnFallback;
} & ApplicationOptions;

export default class WebRouter extends Application {
  constructor(options: StartOptions = {}) {
    super(options);
  }

  static fromManifest(manifest: Partial<Manifest>, options: StartOptions = {}) {
    const router = new WebRouter(options);
    const middlewares = manifest.middlewares ?? [];
    const actions = manifest.actions ?? [];
    const routes = manifest.routes ?? [];
    const layout = manifest.layout ?? {
      module: async () => defaultLayoutModule as LayoutModule,
    };
    const fallbacks = manifest.fallbacks ?? [];
    const dev = manifest.dev ?? options.dev ?? false;
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
      progressive: !dev,
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

    const engine = new Engine({
      layoutModule: layout.module,
      defaultMeta,
      defaultBaseAsset,
      defaultRenderer,
      onFallback,
      dev,
    });

    routes.forEach((item) => {
      router.use(
        normalizeRoute(item),
        engine.createRouteContextHandler(item.module)
      );
    });

    router.use('*', callContext);

    middlewares.forEach((item) => {
      router.use(
        normalizeRoute(item),
        engine.createMiddlewareHandler(item.module)
      );
    });

    actions.forEach((item) => {
      router.use(normalizeRoute(item), engine.createActionHandler(item.module));
    });

    routes.forEach((item) => {
      router.use(normalizeRoute(item), engine.createRouteHandler(item.module));
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
      engine,
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

const URL_PATTERN_INIT_KEYS: (keyof RoutePattern)[] = [
  'protocol',
  'hostname',
  'port',
  'pathname',
  'search',
  'hash',
];

function normalizeRoute(
  route: ManifestRoute | ManifestAction | ManifestMiddleware | ManifestFallback
): RoutePattern {
  return Object.fromEntries(
    Object.entries(route).filter(([key]) =>
      URL_PATTERN_INIT_KEYS.includes(key as keyof RoutePattern)
    )
  );
}

/**
 * Helper function to get appropriate fallback handler for a status code
 */
function createFallbackResolver(
  fallbackMap: Map<number, () => Promise<RouteModule>>,
  engine: Engine,
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

    return engine.createErrorHandler(fallbackModule);
  };
}
