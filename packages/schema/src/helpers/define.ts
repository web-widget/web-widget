import type {
  ClientRouteHandler,
  ClientRouteHandlers,
  ClientRouteRenderContext,
  ClientRouteRenderResult,
  ClientWidgetRenderContext,
  ClientWidgetRenderResult,
  Meta,
  RouteComponent,
  ServerRouteHandler,
  ServerRouteHandlers,
  ServerRouteRenderContext,
  ServerRouteRenderResult,
  ServerWidgetRenderContext,
  ServerWidgetRenderResult,
} from "../types";

export function defineMeta(meta: Meta) {
  return meta;
}

export function defineServerRender<T = any>(
  render: (
    context: ServerWidgetRenderContext | ServerRouteRenderContext,
    renderOptions: ResponseInit & T
  ) => Promise<ServerWidgetRenderResult | ServerRouteRenderResult>
) {
  return render;
}

export function defineClientRender<T = any>(
  render: (
    context: ClientWidgetRenderContext | ClientRouteRenderContext,
    renderOptions: ResponseInit & T
  ) => Promise<ClientWidgetRenderResult | ClientRouteRenderResult>
) {
  return render;
}

export function defineRouteComponent<
  Data = unknown,
  Params = Record<string, string>,
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
