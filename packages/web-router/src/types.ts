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
export type * from '@web-widget/helpers';

////////////////////////////////////////
//////                            //////
//////           Values           //////
//////                            //////
////////////////////////////////////////

export type StatusCode = number;
export type Bindings = Record<string, unknown>;
export type Variables = Record<string, unknown>;

export interface Env {
  Bindings?: Bindings;
  Variables?: Variables;
}

////////////////////////////////////////
//////                            //////
//////       Error Handlers       //////
//////                            //////
////////////////////////////////////////

export type NotFoundHandler<E extends Env = any> = (
  context: Context<E>
) => Response | Promise<Response>;

export type ErrorHandler<E extends Env = any> = (
  error: any,
  context: Context<E>
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

export interface Manifest {
  dev?: boolean;
  routes: {
    module: RouteModule | (() => Promise<RouteModule>);
    name?: string;
    pathname: string;
  }[];
  actions: {
    module: ActionModule | (() => Promise<ActionModule>);
    name?: string;
    pathname: string;
  }[];
  middlewares: {
    module: MiddlewareModule | (() => Promise<MiddlewareModule>);
    name?: string;
    pathname: string;
  }[];
  fallbacks: {
    module: RouteModule | (() => Promise<RouteModule>);
    name?: string;
    pathname?: string;
    status: number;
  }[];
  layout: {
    module: LayoutModule | (() => Promise<LayoutModule>);
  };
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
