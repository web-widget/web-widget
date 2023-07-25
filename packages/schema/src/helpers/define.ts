import {
  ClientRouteRenderContext,
  ClientRouteRenderResult,
  ClientWidgetRenderContext,
  ClientWidgetRenderResult,
  RouteComponent,
  RouteComponentProps,
  RouteFallbackComponentProps,
  ServerRouteRenderContext,
  ServerRouteRenderResult,
  ServerWidgetRenderContext,
  ServerWidgetRenderResult,
  WidgetComponent,
  WidgetComponentProps,
  WidgetFallbackComponentProps,
} from "../module";
import { getComponent, getComponentProps } from "./get-context";

export function defineServerRender(
  factory: (
    component: WidgetComponent | RouteComponent | any,
    props:
      | RouteFallbackComponentProps
      | RouteComponentProps
      | WidgetFallbackComponentProps
      | WidgetComponentProps
  ) => (
    options: ServerWidgetRenderContext | ServerRouteRenderContext
  ) => Promise<ServerWidgetRenderResult | ServerRouteRenderResult>
) {
  return function render(
    opts: ServerWidgetRenderContext | ServerRouteRenderContext
  ) {
    const component = getComponent(opts);
    const props = getComponentProps(opts);

    return factory(component, props)(opts);
  };
}

export function defineClientRender(
  factory: (
    component: WidgetComponent | RouteComponent | any,
    props:
      | RouteFallbackComponentProps
      | RouteComponentProps
      | WidgetFallbackComponentProps
      | WidgetComponentProps
  ) => (
    options: ClientWidgetRenderContext | ClientRouteRenderContext
  ) => Promise<ClientWidgetRenderResult | ClientRouteRenderResult>
) {
  return function render(
    opts: ClientWidgetRenderContext | ClientRouteRenderContext
  ) {
    const component = getComponent(opts);
    const props = getComponentProps(opts);

    return factory(component, props)(opts);
  };
}
