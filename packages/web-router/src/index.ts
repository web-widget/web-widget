import type { RouteContext } from '@web-widget/helpers';
import { rebaseMeta } from '@web-widget/helpers';
import { createHttpError } from '@web-widget/helpers/error';

import type { ApplicationOptions } from './application';
import { Application } from './application';
import * as defaultFallbackModule from './fallback';
import * as defaultLayoutModule from './layout';
import type { OnFallback } from './modules';
import {
  callActionModule,
  callMiddlewareModule,
  createAsyncContext,
  createFallbackHandler,
  createRouteContext,
  callRouteModule,
} from './modules';
import type {
  LayoutModule,
  Manifest,
  ManifestAction,
  ManifestFallback,
  ManifestMiddleware,
  ManifestRoute,
  Meta,
  RouteModule,
  RouteRenderOptions,
} from './types';

export type * from './types';

export type StartOptions = {
  baseAsset?: string;
  defaultMeta?: Meta;
  defaultRenderOptions?: RouteRenderOptions;
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
    const defaultRenderOptions: RouteRenderOptions = {
      progressive: !dev,
      ...structuredClone(options.defaultRenderOptions ?? {}),
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

    routes.forEach((item) => {
      router.use(
        normalizeRoute(item),
        createRouteContext(
          item.module,
          layout.module,
          defaultMeta,
          defaultBaseAsset,
          defaultRenderOptions,
          onFallback,
          dev
        )
      );
    });

    router.use('*', createAsyncContext);

    middlewares.forEach((item) => {
      router.use(normalizeRoute(item), callMiddlewareModule(item.module));
    });

    actions.forEach((item) => {
      router.use(normalizeRoute(item), callActionModule(item.module));
    });

    routes.forEach((item) => {
      router.use(normalizeRoute(item), callRouteModule());
    });

    const fallback404 = fallbacks.find(
      (page) => page.status === 404 || page.name === 'NotFound'
    ) ?? {
      module: async () => defaultFallbackModule as RouteModule,
      pathname: '/*',
    };

    const notFoundHandler = createFallbackHandler(
      fallback404.module,
      layout.module,
      defaultMeta,
      defaultBaseAsset,
      defaultRenderOptions,
      onFallback,
      dev
    );

    router.notFound(async (context) =>
      notFoundHandler(createHttpError(404), context as unknown as RouteContext)
    );

    const fallback500 = fallbacks.find(
      (page) => page.status === 500 || page.name === 'InternalServerError'
    ) ?? {
      module: async () => defaultFallbackModule as RouteModule,
      pathname: '/*',
    };

    const errorHandler = createFallbackHandler(
      fallback500.module,
      layout.module,
      defaultMeta,
      defaultBaseAsset,
      defaultRenderOptions,
      onFallback,
      dev
    );

    router.onError(async (error, context) => {
      try {
        const handler = error?.status === 404 ? notFoundHandler : errorHandler;
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

const URL_PATTERN_INIT_KEYS: (keyof URLPatternInit)[] = [
  'protocol',
  'hostname',
  'port',
  'pathname',
  'search',
  'hash',
];

function normalizeRoute(
  route: ManifestRoute | ManifestAction | ManifestMiddleware | ManifestFallback
): URLPatternInit {
  return Object.fromEntries(
    Object.entries(route).filter(([key]) =>
      URL_PATTERN_INIT_KEYS.includes(key as keyof URLPatternInit)
    )
  );
}
