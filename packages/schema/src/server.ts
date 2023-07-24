import {
  RouteComponent,
  RouteComponentProps,
  RouteFallbackComponentProps,
  ServerRouteRenderContext as RouteRenderContext,
  ServerRouteRenderResult as RouteRenderResult,
  ServerWidgetRenderContext as WidgetRenderContext,
  ServerWidgetRenderResult as WidgetRenderResult,
  WidgetComponent,
  WidgetComponentProps,
  WidgetFallbackComponentProps,
} from "./schema";
import { getComponent, getComponentProps } from "./helpers";

export * from "./helpers";
export type {
  // WIDGET
  ServerWidgetModule as WidgetModule,
  WidgetComponentProps,
  WidgetComponent,
  WidgetFallbackComponentProps,
  WidgetFallbackComponent,
  WidgetError,
  ServerWidgetRenderContext as WidgetRenderContext,
  ServerWidgetRenderResult as WidgetRenderResult,
  ServerWidgetRender as WidgetRender,
  // ROUTE
  ServerRouteModule as RouteModule,
  RouteConfig,
  RouteComponentProps,
  RouteComponent,
  RouteFallbackComponentProps,
  RouteFallbackComponent,
  RouteError,
  ServerRouteHandlers as RouteHandlers,
  ServerRouteHandler as RouteHandler,
  ServerRouteHandlerContext as RouteHandlerContext,
  ServerRouteRenderContext as RouteRenderContext,
  ServerRouteRenderResult as RouteRenderResult,
  ServerRouteHandlerResult as RouteHandlerResult,
  ServerRouteRender as RouteRender,
  // META: DESCRIPTOR
  LinkDescriptor,
  MetaDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
  // ROOT
  ServerModule as Module,
  Config,
  Handlers,
  Handler,
  ComponentProps,
  Component,
  Meta,
  ServerRender as Render,
} from "./schema";

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
