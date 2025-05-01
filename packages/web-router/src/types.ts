import type {
  ActionModule,
  FetchEventLike,
  Meta,
  MiddlewareModule,
  RouteModule,
  RouteRenderResult,
  ServerWidgetModule,
  ServerWidgetRender,
  ServerWidgetRenderContext,
  ServerWidgetRenderResult,
  WidgetComponent,
  WidgetComponentProps,
} from '@web-widget/helpers';

import type { Context } from './context';
export type * from '@web-widget/helpers';

////////////////////////////////////////
//////                            //////
//////       Error Handlers       //////
//////                            //////
////////////////////////////////////////

export type NotFoundHandler = (
  context: Context
) => Response | Promise<Response>;

export type ErrorHandler = (
  error: any,
  context: Context
) => Response | Promise<Response>;

////////////////////////////////////////
//////                            //////
//////         FetchEvent         //////
//////                            //////
////////////////////////////////////////

export type ExecutionContext = FetchEventLike | CloudflareFetchContext;

/** [Cloudflare worker context](https://developers.cloudflare.com/workers/runtime-apis/context/) */
export type CloudflareFetchContext = {
  waitUntil: FetchEventLike['waitUntil'];
  passThroughOnException(): void;
};

////////////////////////////////////////
//////                            //////
//////          Manifest          //////
//////                            //////
////////////////////////////////////////

type ManifestEntry<T> = {
  module: T | (() => Promise<T>);
  name?: string;
} & URLPatternInit & {
    pathname: string;
  };

type FallbackManifestEntry = ManifestEntry<RouteModule> & { status: number };

type LayoutManifestEntry<T> = {
  module: T | (() => Promise<T>);
  name?: string;
};

export type ManifestRoute = ManifestEntry<RouteModule>;
export type ManifestAction = ManifestEntry<ActionModule>;
export type ManifestMiddleware = ManifestEntry<MiddlewareModule>;
export type ManifestFallback = FallbackManifestEntry;
export type ManifestLayout = LayoutManifestEntry<LayoutModule>;

export interface Manifest {
  dev?: boolean;
  routes: ManifestRoute[];
  actions: ManifestAction[];
  middlewares: ManifestMiddleware[];
  fallbacks: ManifestFallback[];
  layout: ManifestLayout;
}

////////////////////////////////////////
//////                            //////
//////       Layout Modules       //////
//////                            //////
////////////////////////////////////////

export interface LayoutModule extends ServerWidgetModule {}

export type LayoutComponentProps = WidgetComponentProps<{
  children: RouteRenderResult;
  meta: Meta;
  params: Record<string, string>;
  /** @deprecated */
  pathname: string;
  request: Request;
}>;

export interface LayoutComponent
  extends WidgetComponent<LayoutComponentProps> {}

export interface LayoutRenderContext
  extends ServerWidgetRenderContext<LayoutComponentProps> {}

export type LayoutRenderResult = ServerWidgetRenderResult;

export interface LayoutRender
  extends ServerWidgetRender<LayoutComponentProps> {}

export interface LayoutModuleDescriptor {
  module: LayoutModule;
  name?: string;
  render: LayoutRender;
}

/** @deprecated */
export type RootLayoutComponentProps = LayoutComponentProps;

////////////////////////////////////////
//////                            //////
//////             Dev            //////
//////                            //////
////////////////////////////////////////

export type DevRouteModule = RouteModule & {
  $source: string;
};

export type DevHttpHandler = 'x-module-source';
