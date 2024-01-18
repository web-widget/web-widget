import { Application } from "./application";
import type { ApplicationOptions } from "./application";
import type {
  Env,
  LayoutModule,
  Manifest,
  Meta,
  RouteModule,
  RouteRenderOptions,
  Schema,
} from "./types";
import {
  HttpStatus,
  createHttpError,
  rebaseMeta,
} from "@web-widget/schema/server-helpers";
import * as defaultFallbackModule from "./fallback";
import * as defaultLayoutModule from "./layout";
import {
  createFallbackHandler,
  createPageContext,
  renderRouteModule,
  callMiddlewareModule,
} from "./modules";
import type { OnFallback, PageContext } from "./modules";
export type * from "./types";

export type StartOptions<E extends Env = {}> = {
  baseAsset?: string;
  baseModule?: string;
  defaultMeta?: Meta;
  defaultRenderOptions?: RouteRenderOptions;
  dev?: boolean;
  origin?: string;
  onFallback?: OnFallback;
} & ApplicationOptions<E>;

export { PageContext };

export default class WebRouter<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = "/",
> extends Application<E, S, BasePath> {
  #origin?: string;
  constructor(manifest: Manifest, options: StartOptions<E> = {}) {
    super(options);

    notSupport(options, "experimental_render");
    notSupport(options, "defaultBootstrap");
    notSupport(options, "experimental_loader");

    const middlewares = manifest.middlewares ?? [];
    const routes = manifest.routes ?? [];
    const layout = manifest.layout ?? {
      module: () => defaultLayoutModule as LayoutModule,
    };
    const fallbacks = manifest.fallbacks ?? [];
    const defaultBaseAsset = options.baseAsset ?? "/";
    const defaultMeta = rebaseMeta(
      options.defaultMeta ?? {
        lang: "en",
        meta: [
          {
            charset: "utf-8",
          },
          {
            name: "viewport",
            content: "width=device-width, initial-scale=1.0",
          },
        ],
      },
      defaultBaseAsset
    );
    const defaultRenderOptions = options.defaultRenderOptions ?? {};
    const onFallback =
      options.onFallback ??
      ((error) => {
        const status = Reflect.get(error, "status") ?? 500;
        const expose = Reflect.get(error, "expose");

        if (status >= 500 && !expose) {
          const msg = error.stack || error.toString();
          console.error(`\n${msg.replace(/^/gm, "  ")}\n`);
        }
      });

    routes.forEach((item) => {
      this.all(
        item.pathname,
        createPageContext(
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
      this.all(item.pathname, callMiddlewareModule(item.module));
    });

    routes.forEach((item) => {
      this.all(item.pathname, renderRouteModule());
    });

    const fallback404 = fallbacks.find(
      (page) => page.status === 404 || page.name === HttpStatus[404]
    ) ?? {
      module: async () => defaultFallbackModule as RouteModule,
      name: HttpStatus[404],
      pathname: "*",
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

    this.notFound(async (context) =>
      notFoundHandler(createHttpError(404), context)
    );

    const fallback500 = fallbacks.find(
      (page) => page.status === 500 || page.name === HttpStatus[500]
    ) ?? {
      module: async () => defaultFallbackModule as RouteModule,
      name: HttpStatus[500],
      pathname: "*",
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

    this.onError(async (error, context) => {
      const status = Reflect.get(error, "status");

      if (status === 404) {
        return notFoundHandler(error, context);
      } else {
        return errorHandler(error, context);
      }
    });
    this.#origin = options.origin;
  }

  get origin() {
    return this.#origin;
  }
}

function notSupport(options: any, key: string) {
  if (Reflect.has(options, key)) {
    throw new TypeError(`"${key}" has been removed`);
  }
}
