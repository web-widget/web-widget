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
import type { RoutePattern } from './router';
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

type ManifestModule<T> = {
  module: T | (() => Promise<T>);
};

type ManifestScope = {
  name?: string;
} & RoutePattern;

type ManifestStatus = {
  status: number;
};
export { RoutePattern };
export type ManifestRoute = ManifestModule<RouteModule> & ManifestScope;
export type ManifestAction = ManifestModule<ActionModule> & ManifestScope;
export type ManifestMiddleware = ManifestModule<MiddlewareModule> &
  ManifestScope;
export type ManifestFallback = ManifestModule<RouteModule> &
  ManifestStatus &
  ManifestScope;
export type ManifestLayout = ManifestModule<LayoutModule>;

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
  /** @deprecated Use `scope.pathname` instead. */
  pathname: string;
  request: Request;
  scope: RoutePattern;
  url: URL;
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
