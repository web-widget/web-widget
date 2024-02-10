import { rebaseMeta } from '@web-widget/helpers';
import { createHttpError } from '@web-widget/helpers/http';
import { Application } from './application';
import type { ApplicationOptions } from './application';
import type {
  Env,
  LayoutModule,
  Manifest,
  Meta,
  RouteModule,
  RouteRenderOptions,
} from './types';
import * as defaultFallbackModule from './fallback';
import * as defaultLayoutModule from './layout';
import {
  createFallbackHandler,
  createRouteContext,
  renderRouteModule,
  callMiddlewareModule,
} from './modules';
import type { OnFallback } from './modules';
export type * from './types';

export type StartOptions<E extends Env = {}> = {
  baseAsset?: string;
  baseModule?: string;
  defaultMeta?: Meta;
  defaultRenderOptions?: RouteRenderOptions;
  dev?: boolean;
  origin?: string;
  onFallback?: OnFallback;
} & ApplicationOptions<E>;

export default class WebRouter<E extends Env = Env> extends Application<E> {
  #origin?: string;
  constructor(options: StartOptions<E> = {}) {
    super(options);
    this.#origin = options.origin;
  }

  get origin() {
    return this.#origin;
  }

  static fromManifest<E extends Env = Env>(
    manifest: Manifest,
    options: StartOptions<E> = {}
  ) {
    const router = new WebRouter<E>(options);
    const middlewares = manifest.middlewares ?? [];
    const routes = manifest.routes ?? [];
    const layout = manifest.layout ?? {
      module: () => defaultLayoutModule as LayoutModule,
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
    const defaultRenderOptions = options.defaultRenderOptions ?? {};
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
          options.dev
        )
      );
    });

    middlewares.forEach((item) => {
      router.use(item.pathname, callMiddlewareModule(item.module));
    });

    routes.forEach((item) => {
      router.use(item.pathname, renderRouteModule());
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
      options.dev
    );

    router.notFound(async (context) =>
      notFoundHandler(createHttpError(404), context)
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
      options.dev
    );

    router.onError(async (error, context) => {
      if (error?.status === 404) {
        return notFoundHandler(error, context);
      } else {
        return errorHandler(error, context);
      }
    });

    return router;
  }
}
