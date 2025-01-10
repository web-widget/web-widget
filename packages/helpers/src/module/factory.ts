import type {
  ActionHandler,
  HTTPException,
  Meta,
  MiddlewareHandler,
  MiddlewareHandlers,
  RouteComponent,
  RouteComponentProps,
  RouteConfig,
  RouteFallbackComponent,
  RouteFallbackComponentProps,
  RouteHandler,
  RouteHandlers,
  RouteRender,
  RouteRenderContext,
  RouteRenderOptions,
  RouteRenderResult,
  WidgetComponent,
  WidgetComponentProps,
  WidgetFallbackComponent,
  WidgetFallbackComponentProps,
  WidgetRender,
  WidgetRenderContext,
  WidgetRenderOptions,
  WidgetRenderResult,
} from '@web-widget/schema';

export function defineConfig(config: RouteConfig) {
  return config;
}

export function defineMeta(meta: Meta) {
  return meta;
}

export function defineRender<Data = unknown>(
  render: (
    context: WidgetRenderContext<Data>,
    renderOptions: WidgetRenderOptions
  ) => Promise<WidgetRenderResult>
): typeof render;

export function defineRender<Data = unknown, Params = Record<string, string>>(
  render: (
    context: RouteRenderContext<Data, Params>,
    renderOptions: RouteRenderOptions
  ) => Promise<RouteRenderResult>
): typeof render;

export function defineRender<Data = unknown, Params = Record<string, string>>(
  render:
    | ((
        context: WidgetRenderContext<Data>,
        renderOptions: WidgetRenderOptions
      ) => Promise<WidgetRenderResult>)
    | ((
        context: RouteRenderContext<Data, Params>,
        renderOptions: RouteRenderOptions
      ) => Promise<RouteRenderResult>)
) {
  return render;
}

export function defineWidgetRender<Data = unknown>(render: WidgetRender<Data>) {
  return render;
}

export function defineRouteRender<
  Data = unknown,
  Params = Record<string, string>,
>(render: RouteRender<Data, Params>) {
  return render;
}

export function defineRouteComponent<
  Data = unknown,
  Params = Record<string, string>,
>(component: RouteComponent<Data, Params>) {
  return component;
}

export function defineRouteFallbackComponent(
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

export function defineRouteHandler<
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

export function defineMiddlewareHandler(
  handler: MiddlewareHandler | MiddlewareHandlers
) {
  return handler;
}

export function defineActionHandler(handler: ActionHandler) {
  return handler;
}

export function getComponent(
  context: WidgetRenderContext | RouteRenderContext
):
  | WidgetFallbackComponent
  | WidgetComponent
  | RouteFallbackComponent
  | RouteComponent {
  if (context?.error) {
    const component = context.module?.fallback;

    if (component === undefined) {
      throw new Error(`No renderable fallback-component.`);
    }

    return component;
  } else {
    const component = context?.module?.default;
    if (component === undefined) {
      throw new Error('No renderable component.');
    }

    return component;
  }
}

export function getComponentProps(
  context: WidgetRenderContext | RouteRenderContext
):
  | WidgetFallbackComponentProps
  | WidgetComponentProps
  | RouteFallbackComponentProps
  | RouteComponentProps {
  if (isRouteRenderContext(context)) {
    const routeContext = context as RouteRenderContext;
    const { error } = routeContext;

    if (error) {
      const props: RouteFallbackComponentProps = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        status: (error as HTTPException).status,
        statusText: (error as HTTPException).statusText,
      };
      return props;
    } else {
      const props: RouteComponentProps = routeContext;
      return props;
    }
  } else {
    const widgetContext = context as WidgetRenderContext;
    const { error } = widgetContext;
    if (error) {
      const props: WidgetFallbackComponentProps = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      return props;
    } else {
      const props: WidgetComponentProps = widgetContext.data;
      return props;
    }
  }
}

export function isRouteRenderContext(
  context: WidgetRenderContext | RouteRenderContext
) {
  return Reflect.has(context, 'request');
}

export interface ComponentDescriptor {
  component:
    | RouteFallbackComponent
    | RouteComponent
    | WidgetFallbackComponent
    | WidgetComponent;
  props:
    | RouteFallbackComponentProps
    | RouteComponentProps
    | WidgetFallbackComponentProps
    | WidgetComponentProps;
}

export function getComponentDescriptor(
  context: WidgetRenderContext | RouteRenderContext
): ComponentDescriptor {
  return {
    component: getComponent(context),
    props: getComponentProps(context),
  };
}
