import type {
  HttpError,
  RouteComponent,
  RouteComponentProps,
  RouteFallbackComponent,
  RouteFallbackComponentProps,
  RouteRenderContext,
  WidgetComponent,
  WidgetComponentProps,
  WidgetFallbackComponent,
  WidgetFallbackComponentProps,
  WidgetRenderContext,
} from "../types";

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
