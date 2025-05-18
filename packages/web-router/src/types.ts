import type {
  ActionModule,
  FetchEventLike,
  MiddlewareModule,
  RouteModule,
  ServerRenderResult,
  ServerRender,
  RouteComponentProps,
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

export interface LayoutModule {
  render: LayoutRender;
  default: LayoutComponent;
}

export interface LayoutComponentProps extends RouteComponentProps {
  children: ServerRenderResult;
}

export interface LayoutComponent {
  (props: LayoutComponentProps): any;
}
export interface LayoutRender
  extends ServerRender<LayoutComponent, LayoutComponentProps> {}

////////////////////////////////////////
//////                            //////
//////             Dev            //////
//////                            //////
////////////////////////////////////////

export type DevRouteModule = RouteModule & {
  $source: string;
};

export type DevHttpHandler = 'x-module-source';
