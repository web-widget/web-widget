import type { Loader, RenderOptions } from "@web-widget/web-widget/server";
import { renderToJson } from "@web-widget/web-widget/server";
import { Suspense, createElement, lazy, useRef } from "react";
import type { ReactNode } from "react";

export const __ENV__ = {
  server: true,
};

export interface WebWidgetProps {
  base?: RenderOptions["base"];
  children /**/?: ReactNode;
  data?: RenderOptions["data"];
  import?: RenderOptions["import"];
  loader /**/ : Loader;
  loading?: RenderOptions["loading"];
  name?: RenderOptions["name"];
  recovering: RenderOptions["recovering"];
  renderTarget?: RenderOptions["renderTarget"];
}

export function WebWidget({ children, loader, ...props }: WebWidgetProps) {
  if (props.recovering && !loader) {
    throw new TypeError(`Missing loader.`);
  }

  if (children) {
    throw new TypeError(`No support children.`);
  }

  if (__ENV__.server) {
    return createElement(
      lazy<any>(async () => {
        const [tag, attrs, innerHTML] = await renderToJson(loader, {
          ...props,
          // TODO Render children
          children: "",
        });
        return {
          default: function WebWidgetContainer() {
            return createElement(tag, {
              ...attrs,
              dangerouslySetInnerHTML: {
                __html: innerHTML,
              },
            });
          },
        };
      })
    );
  } else {
    console.warn(`Client components are experimental.`);
    return createElement(
      lazy<any>(async () => {
        await customElements.whenDefined("web-widget");
        const element = Object.assign(
          document.createElement("web-widget"),
          props
        );
        // @ts-ignore
        await element.bootstrap();

        return {
          default: function WebWidgetContainer() {
            const element = useRef(null);
            return createElement("web-widget", {
              ...props, // TODO 检查 React 是否正确处理了 Boolean 类型
              ref: element,
              dangerouslySetInnerHTML: { __html: "" },
            });
          },
        };
      })
    );
  }
}

export interface DefineWebWidgetOptions {
  base?: string;
  import?: string;
  loading?: string;
  name?: string;
  recovering?: boolean;
  renderTarget?: "light" | "shadow";
}

export interface WebWidgetSuspenseProps {
  children?: ReactNode;
  clientOnly?: boolean;
  fallback?: ReactNode;
}

export function defineWebWidget(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  options.renderTarget = "light"; // TODO shadow
  return function WebWidgetSuspense({
    children,
    clientOnly = !options.recovering,
    fallback,
    ...data
  }: WebWidgetSuspenseProps) {
    return createElement(Suspense, {
      fallback,
      children: createElement(WebWidget, {
        ...options,
        children,
        data,
        loader,
        recovering: !clientOnly,
      }),
    });
  };
}
