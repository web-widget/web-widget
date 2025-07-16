/**
 * @fileoverview Web-Router entry point - WebRouter class definition and exports
 */
import type {
  RouteContext,
  ServerRenderOptions,
  MiddlewareContext,
} from '@web-widget/helpers';
import { rebaseMeta } from '@web-widget/helpers';
import { createHttpError } from '@web-widget/helpers/error';

import type { ApplicationOptions } from './application';
import { Application } from './application';
import * as defaultFallbackModule from './fallback';
import * as defaultLayoutModule from './layout';
import { callContext } from '@web-widget/context/server';
import { Engine, type OnFallback } from './engine';
import type {
  Env,
  LayoutModule,
  Manifest,
  Meta,
  RouteModule,
  RouteRenderOptions,
  MiddlewareHandler,
} from './types';

export type * from './types';
export type { OnFallback } from './engine';

export type StartOptions<E extends Env = {}> = {
  baseAsset?: string;
  defaultMeta?: Meta;
  defaultRenderOptions?: RouteRenderOptions;
  /** @experimental */
  defaultRenderer?: ServerRenderOptions;
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
      let cachedHandler: MiddlewareHandler | null = null;
      router.use(item.pathname, async (context, next) => {
        if (!cachedHandler) {
          cachedHandler = await engine.createRouteContextHandler(item.module);
        }
        return cachedHandler(context, next);
      });
    });

    router.use('*', callContext);

    middlewares.forEach((item) => {
      let cachedHandler: MiddlewareHandler | null = null;
      router.use(item.pathname, async (context, next) => {
        if (!cachedHandler) {
          cachedHandler = await engine.processMiddleware(item.module);
        }
        return cachedHandler(context, next);
      });
    });

    actions.forEach((item) => {
      let cachedHandler: MiddlewareHandler | null = null;
      router.use(item.pathname, async (context, next) => {
        if (!cachedHandler) {
          cachedHandler = await engine.processAction(item.module);
        }
        return cachedHandler(context, next);
      });
    });

    routes.forEach((item) => {
      let cachedHandler: MiddlewareHandler | null = null;
      router.use(item.pathname, async (context, next) => {
        if (!cachedHandler) {
          cachedHandler = await engine.processRoute();
        }
        return cachedHandler(context, next);
      });
    });

    const fallback404 = fallbacks.find(
      (page) => page.status === 404 || page.name === 'NotFound'
    ) ?? {
      module: async () => defaultFallbackModule as RouteModule,
      pathname: '*',
    };

    // NOTE: Lazy creation to avoid async in sync context
    let notFoundHandler:
      | ((error: unknown, context: MiddlewareContext) => Promise<Response>)
      | undefined;
    const getNotFoundHandler = async () => {
      if (!notFoundHandler) {
        notFoundHandler = await engine.createErrorHandler(fallback404.module);
      }
      return notFoundHandler;
    };

    router.notFound(async (context) => {
      const handler = await getNotFoundHandler();
      return handler!(createHttpError(404), context as unknown as RouteContext);
    });

    const fallback500 = fallbacks.find(
      (page) => page.status === 500 || page.name === 'InternalServerError'
    ) ?? {
      module: async () => defaultFallbackModule as RouteModule,
      pathname: '*',
    };

    // NOTE: Lazy creation to avoid async in sync context
    let errorHandler:
      | ((error: unknown, context: MiddlewareContext) => Promise<Response>)
      | undefined;
    const getErrorHandler = async () => {
      if (!errorHandler) {
        errorHandler = await engine.createErrorHandler(fallback500.module);
      }
      return errorHandler;
    };

    router.onError(async (error, context) => {
      try {
        const handler =
          (error as { status?: number })?.status === 404
            ? await getNotFoundHandler()
            : await getErrorHandler();
        return await handler!(error, context as unknown as RouteContext);
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
