import { Application } from "./application";
import type { ApplicationOptions } from "./application";
import type {
  Env,
  LayoutModule,
  Manifest,
  Meta,
  RouteModule,
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
  middlewareModule,
  renderModule,
  createFallbackHandler,
} from "./modules";
import type { PageContext } from "./modules";
export type * from "./types";

export type StartOptions<E extends Env = {}> = {
  baseAsset?: string;
  baseModule?: string;
  defaultMeta?: Meta;
  dev?: boolean;
  origin?: string;
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

    middlewares.forEach((item) => {
      this.all(item.pathname, middlewareModule(item.module));
    });

    routes.forEach((item) => {
      this.all(
        item.pathname,
        renderModule(
          item.module,
          layout.module,
          defaultMeta,
          defaultBaseAsset,
          options.dev
        )
      );
    });

    const fallback404 = fallbacks.find(
      (page) => page.name === HttpStatus[404]
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
      options.dev
    );

    this.notFound(async (context) =>
      notFoundHandler(createHttpError(404), context)
    );

    const fallback500 = fallbacks.find(
      (page) => page.name === HttpStatus[500]
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
      options.dev
    );

    this.onError(errorHandler);
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
