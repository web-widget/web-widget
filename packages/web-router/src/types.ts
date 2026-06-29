/**
 * @fileoverview TypeScript type definitions for web-router
 */
import type {
  ActionModule,
  FetchEventLike,
  HTTPException,
  MiddlewareModule,
  RouteComponentProps,
  RouteContext,
  RouteModule,
  ServerRender,
  ServerRenderResult,
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

export type NotFoundHandler<E extends Env = Env> = (
  context: Context<E>
) => Response | Promise<Response>;

export type ErrorHandler<E extends Env = Env> = (
  error: HTTPException,
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
  /**
   * Route module source path resolver injected by `@web-widget/vite-plugin`
   * during dev. The returned path is written to the
   * {@link DEV_MODULE_SOURCE_HEADER} response header so dev tooling can
   * locate the source file. Not intended for application code.
   */
  moduleSource?: (context: RouteContext) => string | void;
  /**
   * Whether to expose full error details, injected by
   * `@web-widget/vite-plugin` during dev so server error pages always
   * include the underlying error. Takes precedence over
   * {@link StartOptions.exposeErrors}. Not intended for application code.
   */
  exposeErrors?: boolean;
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
  (props: LayoutComponentProps): unknown;
}
export interface LayoutRender extends ServerRender<
  LayoutComponent,
  LayoutComponentProps
> {}

/** Response header name for the active route module source path in dev. */
export const DEV_MODULE_SOURCE_HEADER = 'x-module-source';
