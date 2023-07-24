import type {
  ClientRouteRenderContext as RouteRenderContext,
  ClientRouteRenderResult as RouteRenderResult,
  ClientWidgetRenderContext as WidgetRenderContext,
  ClientWidgetRenderResult as WidgetRenderResult,
  RouteComponent,
  RouteComponentProps,
  RouteFallbackComponentProps,
  WidgetComponent,
  WidgetComponentProps,
  WidgetFallbackComponentProps,
} from "./schema";

import { getComponent, getComponentProps } from "./helpers";

export * from "./helpers";
export type {
  // WIDGET
  ClientWidgetModule as WidgetModule,
  WidgetComponentProps,
  WidgetComponent,
  WidgetFallbackComponentProps,
  WidgetFallbackComponent,
  WidgetError,
  ClientWidgetRenderContext as WidgetRenderContext,
  ClientWidgetRenderResult as WidgetRenderResult,
  ClientWidgetRender as WidgetRender,
  // ROUTE
  ClientRouteModule as RouteModule,
  RouteConfig,
  RouteComponentProps,
  RouteComponent,
  RouteFallbackComponentProps,
  RouteFallbackComponent,
  RouteError,
  ClientRouteHandlers as RouteHandlers,
  ClientRouteHandler as RouteHandler,
  ClientRouteHandlerContext as RouteHandlerContext,
  ClientRouteRenderContext as RouteRenderContext,
  ClientRouteRenderResult as RouteRenderResult,
  ClientRouteHandlerResult as RouteHandlerResult,
  ClientRouteRender as RouteRender,
  // META: DESCRIPTOR
  LinkDescriptor,
  MetaDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
  // ROOT
  ClientModule as Module,
  Config,
  Handlers,
  Handler,
  ComponentProps,
  Component,
  Meta,
  ClientRender as Render,
} from "./schema";

export { getComponent, getComponentProps };

export function defineRender(
  factory: (
    component: WidgetComponent | RouteComponent | any,
    props:
      | RouteFallbackComponentProps
      | RouteComponentProps
      | WidgetFallbackComponentProps
      | WidgetComponentProps
  ) => (
    options: WidgetRenderContext | RouteRenderContext
  ) => Promise<WidgetRenderResult | RouteRenderResult>
) {
  return function render(opts: WidgetRenderContext | RouteRenderContext) {
    const component = getComponent(opts);
    const props = getComponentProps(opts);

    return factory(component, props)(opts);
  };
}
