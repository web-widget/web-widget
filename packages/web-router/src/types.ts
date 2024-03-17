import type {
  Meta,
  RouteModule,
  RouteRenderResult,
  WidgetComponent,
  WidgetComponentProps,
  ServerWidgetModule,
  ServerWidgetRender,
  ServerWidgetRenderContext,
  ServerWidgetRenderResult,
  MiddlewareModule,
} from '@web-widget/helpers';

import type { Context } from './context';
export * from '@web-widget/helpers';

////////////////////////////////////////
//////                            //////
//////           Values           //////
//////                            //////
////////////////////////////////////////

export type StatusCode = number;
export type Bindings = Record<string, unknown>;
export type Variables = Record<string, unknown>;

export type Env = {
  Bindings?: Bindings;
  Variables?: Variables;
};

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

export abstract class FetchEventLike {
  abstract readonly request: Request;
  abstract respondWith(promise: Response | Promise<Response>): void;
  abstract passThroughOnException(): void;
  abstract waitUntil(promise: Promise<void>): void;
}

////////////////////////////////////////
//////                            //////
//////          Manifest          //////
//////                            //////
////////////////////////////////////////

export interface Manifest {
  routes: {
    module: RouteModule | (() => Promise<RouteModule>);
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
    pathname: string;
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
