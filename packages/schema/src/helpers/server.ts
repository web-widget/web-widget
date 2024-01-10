export const IS_BROWSER = false;
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
  WidgetRenderOptions,
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
  RouteRenderOptions,
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
  ServerRouteHandlers as Handlers,
  ServerRouteHandlers as Handler,
  ComponentProps,
  Component,
  Meta,
  ServerRenderContext as RenderContext,
  ServerRender as Render,
  HttpError,
} from "../types";

export {
  type ComponentDescriptor,
  defineMeta,
  defineServerRender as defineRender,
  defineRouteComponent,
  defineServerRouteHandler as defineRouteHandler,
  getComponent,
  getComponentDescriptor,
  getComponentProps,
  isRouteRenderContext,
} from "./modules";
export { createHttpError } from "./http-error";
export {
  Status as HttpStatus,
  STATUS_TEXT as HTTP_STATUS_TEXT,
} from "./http-status";
export { renderMetaToString, rebaseMeta, mergeMeta } from "./meta";
export { callContext, createContext, useContext } from "./context";
export {
  useAllWidgetState,
  useWidgetAsyncState,
  useWidgetSyncState,
} from "./state";
