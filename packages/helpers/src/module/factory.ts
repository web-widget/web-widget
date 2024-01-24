import type {
  HttpError,
  Meta,
  MiddlewareHandler,
  MiddlewareHandlers,
  RouteComponent,
  RouteComponentProps,
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
} from "@web-widget/schema";

export /*#__PURE__*/ function defineMeta(meta: Meta) {
  return meta;
}

export /*#__PURE__*/ function defineRender<
  Data = unknown,
  Params = Record<string, string>,
  Options = unknown,
>(
  render: (
    context: WidgetRenderContext<Data> | RouteRenderContext<Data, Params>,
    renderOptions: WidgetRenderOptions<Options> | RouteRenderOptions<Options>
  ) => Promise<WidgetRenderResult | RouteRenderResult>
) {
  return render;
}

export /*#__PURE__*/ function defineWidgetRender<
  Data = unknown,
  Options = unknown,
>(render: WidgetRender<Data, Options>) {
  return render;
}

export /*#__PURE__*/ function defineRouteRender<
  Data = unknown,
  Params = Record<string, string>,
  Options = unknown,
>(render: RouteRender<Data, Params, Options>) {
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

export /*#__PURE__*/ function defineRouteHandler<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
>(
  handler:
    | RouteHandler<Data, Params, State>
    | RouteHandlers<Data, Params, State>
) {
  return handler;
}

export /*#__PURE__*/ function defineMiddlewareHandler(
  handler: MiddlewareHandler | MiddlewareHandlers
) {
  return handler;
}

export function getComponent(
  context: WidgetRenderContext | RouteRenderContext
):
  | RouteFallbackComponent
  | RouteComponent
  | WidgetFallbackComponent
  | WidgetComponent {
  if (context?.error) {
    const component = context.module?.fallback;

    if (component === undefined) {
      throw new Error(`No renderable fallback-component.`);
    }

    return component;
  } else {
    const component = context?.module?.default;
    if (component === undefined) {
      throw new Error("No renderable component.");
    }

    return component;
  }
}

export function getComponentProps(
  context: WidgetRenderContext | RouteRenderContext
) {
  let props:
    | RouteFallbackComponentProps
    | RouteComponentProps
    | WidgetFallbackComponentProps
    | WidgetComponentProps;
  const error = context.error;

  if (isRouteRenderContext(context)) {
    const { data, params, pathname, request } = context as RouteRenderContext;

    if (error) {
      props = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        status: (error as HttpError).status,
        statusText: (error as HttpError).statusText,
      } as RouteFallbackComponentProps;
    } else {
      props = {
        data,
        params,
        pathname,
        request,
      } as RouteComponentProps;
    }
  } else {
    if (error) {
      props = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as WidgetFallbackComponentProps;
    } else {
      props = context.data as WidgetComponentProps;
    }
  }

  return props;
}

export function isRouteRenderContext(
  context: WidgetRenderContext | RouteRenderContext
) {
  return Reflect.has(context, "request");
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
