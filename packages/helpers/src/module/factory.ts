import type {
  ActionHandler,
  ClientRender,
  Meta,
  MiddlewareHandler,
  MiddlewareHandlers,
  RouteComponent,
  RouteConfig,
  RouteFallbackComponent,
  RouteHandler,
  RouteHandlers,
  ServerRender,
} from '@web-widget/schema';

export /*#__PURE__*/ function defineConfig(config: RouteConfig) {
  return config;
}

export /*#__PURE__*/ function defineMeta(meta: Meta) {
  return meta;
}

export /*#__PURE__*/ function defineServerRender<Component = unknown>(
  render: ServerRender<Component>
) {
  return render;
}

export /*#__PURE__*/ function defineClientRender<Component = unknown>(
  render: ClientRender<Component>
) {
  return render;
}

export /*#__PURE__*/ function defineRouteComponent<
  Data = unknown,
  Params = Record<string, string>,
>(component: RouteComponent<Data, Params>) {
  return component;
}

export /*#__PURE__*/ function defineRouteFallbackComponent(
  component: RouteFallbackComponent
) {
  return component;
}

export function defineRouteHandler<
  Data = unknown,
  Params = Record<string, string>,
>(handler: RouteHandler<Data, Params>): typeof handler;

export function defineRouteHandler<
  Data = unknown,
  Params = Record<string, string>,
>(handler: RouteHandlers<Data, Params>): typeof handler;

export /*#__PURE__*/ function defineRouteHandler<
  Data = unknown,
  Params = Record<string, string>,
>(handler: RouteHandler<Data, Params> | RouteHandlers<Data, Params>) {
  return handler;
}

export function defineMiddlewareHandler(
  handler: MiddlewareHandler
): typeof handler;

export function defineMiddlewareHandler(
  handler: MiddlewareHandlers
): typeof handler;

export /*#__PURE__*/ function defineMiddlewareHandler(
  handler: MiddlewareHandler | MiddlewareHandlers
) {
  return handler;
}

export /*#__PURE__*/ function defineActionHandler(handler: ActionHandler) {
  return handler;
}
