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
  Env,
  LayoutModule,
  Manifest,
  Meta,
  RouteModule,
  RouteRenderOptions,
} from './types';

export type * from './types';

export type StartOptions<E extends Env = {}> = {
  baseAsset?: string;
  defaultMeta?: Meta;
  defaultRenderOptions?: RouteRenderOptions;
  /** @deprecated */
  dev?: boolean;
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
    const router = new WebRouter<E>(options);
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
        item.pathname,
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
      router.use(item.pathname, callMiddlewareModule(item.module));
    });

    actions.forEach((item) => {
      router.use(item.pathname, callActionModule(item.module));
    });

    routes.forEach((item) => {
      router.use(item.pathname, callRouteModule());
    });

    const fallback404 = fallbacks.find(
      (page) => page.status === 404 || page.name === 'NotFound'
    ) ?? {
      module: async () => defaultFallbackModule as RouteModule,
      pathname: '*',
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
      pathname: '*',
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
