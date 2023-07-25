import {
  ClientRouteHandler,
  ClientRouteHandlers,
  ClientRouteRenderContext,
  ClientRouteRenderResult,
  ClientWidgetRenderContext,
  ClientWidgetRenderResult,
  Meta,
  RouteComponent,
  RouteComponentProps,
  RouteFallbackComponentProps,
  ServerRouteHandler,
  ServerRouteHandlers,
  ServerRouteRenderContext,
  ServerRouteRenderResult,
  ServerWidgetRenderContext,
  ServerWidgetRenderResult,
  WidgetComponent,
  WidgetComponentProps,
  WidgetFallbackComponentProps,
} from "../types";
import { getComponent, getComponentProps } from "./context";

// @ts-ignore
const DEV: boolean = import.meta.env?.DEV ?? false;

export function defineMeta(meta: Meta) {
  return meta;
}

export function defineServerRender(
  factory: (
    context: ServerWidgetRenderContext | ServerRouteRenderContext,
    component: WidgetComponent | RouteComponent | any,
    props:
      | RouteFallbackComponentProps
      | RouteComponentProps
      | WidgetFallbackComponentProps
      | WidgetComponentProps
  ) => Promise<ServerWidgetRenderResult | ServerRouteRenderResult>,
  options: {
    dev?: boolean;
  } = {}
) {
  return function render(
    context: ServerWidgetRenderContext | ServerRouteRenderContext
  ) {
    const component = getComponent(context);
    const props = getComponentProps(context, options);

    return factory(context, component, props);
  };
}

export function defineClientRender(
  factory: (
    context: ClientWidgetRenderContext | ClientRouteRenderContext,
    component: WidgetComponent | RouteComponent | any,
    props:
      | RouteFallbackComponentProps
      | RouteComponentProps
      | WidgetFallbackComponentProps
      | WidgetComponentProps
  ) => Promise<ClientWidgetRenderResult | ClientRouteRenderResult>,
  options: {
    dev?: boolean;
  } = {}
) {
  return function render(
    context: ClientWidgetRenderContext | ClientRouteRenderContext
  ) {
    const component = getComponent(context);
    const props = getComponentProps(context, {
      dev: options.dev ?? DEV,
    });

    return factory(context, component, props);
  };
}

export function defineRouteComponent<
  Data = unknown,
  Params = Record<string, string>
>(component: RouteComponent<Data, Params>) {
  return component;
}

export function defineServerRouteHandler<Data = unknown>(
  handler: ServerRouteHandler<Data> | ServerRouteHandlers<Data>
) {
  return handler;
}

export function defineClientRouteHandler<Data = unknown>(
  handler: ClientRouteHandler<Data> | ClientRouteHandlers<Data>
) {
  return handler;
}
