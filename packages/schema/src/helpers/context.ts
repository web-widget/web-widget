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

import { isLikeHttpError } from "./http-error";

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
  context: WidgetRenderContext | RouteRenderContext,
  options: {
    dev?: boolean;
  } = {}
) {
  let props:
    | RouteFallbackComponentProps
    | RouteComponentProps
    | WidgetFallbackComponentProps
    | WidgetComponentProps;
  const isRoute = Reflect.has(context, "route");
  const error = context.error;

  if (isRoute) {
    const { data, params, route, url } = context as RouteRenderContext;

    if (error) {
      const isHttpError = isLikeHttpError(error);
      if (isHttpError) {
        props = {
          name: error.name,
          message: error.message,
          status: (error as HttpError).status,
          statusText: (error as HttpError).statusText,
        } as RouteFallbackComponentProps;
      } else {
        props = {
          name: (error as Error).name,
          message: (error as Error).message,
          stack: options.dev ? (error as Error).stack : undefined,
        } as RouteFallbackComponentProps;
      }
    } else {
      props = {
        data,
        params,
        route,
        url,
      } as RouteComponentProps;
    }
  } else {
    if (error) {
      props = {
        name: error.name,
        message: error.message,
        stack: (error as Error).stack,
      } as WidgetFallbackComponentProps;
    } else {
      props = context.data as WidgetComponentProps;
    }
  }

  return props;
}
