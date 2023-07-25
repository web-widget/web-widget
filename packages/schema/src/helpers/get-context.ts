import type {
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
} from "../module";

import { isLikeHttpError } from "./http-error";

// @ts-ignore
const DEV = import.meta.env?.DEV;

export function getComponent(
  opts: WidgetRenderContext | RouteRenderContext
):
  | RouteFallbackComponent
  | RouteComponent
  | WidgetFallbackComponent
  | WidgetComponent {
  if (opts?.error) {
    const component = opts.module?.fallback;

    if (component === undefined) {
      throw new Error(`No renderable fallback-component.`);
    }

    return component;
  } else {
    const component = opts?.module?.default;
    if (component === undefined) {
      throw new Error("No renderable component.");
    }

    return component;
  }
}

export function getComponentProps(
  opts: WidgetRenderContext | RouteRenderContext
) {
  let props:
    | RouteFallbackComponentProps
    | RouteComponentProps
    | WidgetFallbackComponentProps
    | WidgetComponentProps;
  const isRoute = Reflect.has(opts, "route");
  const error = opts.error;

  if (isRoute) {
    const { data, params, route, url } = opts as RouteRenderContext;

    if (error) {
      const isHttpError = isLikeHttpError(error);
      props = (
        isHttpError
          ? {
              name: error.name,
              status: (error as Response).status,
              statusText: (error as Response).statusText,
            }
          : {
              name: (error as Error).name,
              message: (error as Error).message,
              stack: DEV ? (error as Error).stack : undefined,
            }
      ) as RouteFallbackComponentProps;
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
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      } as WidgetFallbackComponentProps;
    } else {
      props = opts.data as WidgetComponentProps;
    }
  }

  return props;
}
