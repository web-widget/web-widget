import type { Loader, WebWidgetContainerOptions } from "@web-widget/web-widget";
import { parse } from "@web-widget/web-widget";
import { Suspense, createElement, lazy } from "react";
import type { ReactNode } from "react";
import { IS_BROWSER } from "@web-widget/schema/helpers";

export interface WebWidgetProps {
  base?: WebWidgetContainerOptions["base"];
  children /**/?: ReactNode;
  data?: WebWidgetContainerOptions["data"];
  import?: WebWidgetContainerOptions["import"];
  inactive?: WebWidgetContainerOptions["inactive"];
  loader /**/ : Loader;
  meta?: WebWidgetContainerOptions["meta"];
  loading?: WebWidgetContainerOptions["loading"];
  name?: WebWidgetContainerOptions["name"];
  renderStage?: WebWidgetContainerOptions["renderStage"];
  renderTarget?: WebWidgetContainerOptions["renderTarget"];
}

export /*#__PURE__*/ function WebWidget({
  children,
  loader,
  ...props
}: WebWidgetProps) {
  if (!loader) {
    throw new TypeError(`Missing loader.`);
  }

  if (children) {
    throw new TypeError(`No support children.`);
  }

  return /*#__PURE__*/ createElement(
    lazy<any>(async () => {
      const [tag, attrs, innerHTML] = await parse(loader, {
        ...props,
        // TODO Render children
        children: "",
      });

      if (IS_BROWSER) {
        throw new Error(
          `Loading WebWidget in react client component is not supported.`
        );
      }

      return {
        default: /*#__PURE__*/ function WebWidgetContainer() {
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
}

export interface DefineWebWidgetOptions {
  base?: WebWidgetContainerOptions["base"];
  import?: WebWidgetContainerOptions["import"];
  loading?: WebWidgetContainerOptions["loading"];
  name?: WebWidgetContainerOptions["name"];
  renderStage?: WebWidgetContainerOptions["renderStage"];
  renderTarget?: WebWidgetContainerOptions["renderTarget"];
}

export interface WebWidgetSuspenseProps {
  children?: ReactNode;
  fallback?: ReactNode;
  experimental_loading?: WebWidgetContainerOptions["loading"];
  renderStage?: WebWidgetContainerOptions["renderStage"];
  experimental_renderTarget?: WebWidgetContainerOptions["renderTarget"];
}

export /*#__PURE__*/ function defineWebWidget(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  return function WebWidgetSuspense({
    children,
    fallback,
    experimental_loading = options.loading ?? "lazy",
    renderStage = options.renderStage,
    experimental_renderTarget = options.renderTarget ?? "light",
    ...data
  }: WebWidgetSuspenseProps) {
    return createElement(Suspense, {
      fallback,
      children: createElement(WebWidget, {
        ...options,
        children,
        data,
        loader,
        loading: experimental_loading,
        renderStage,
        renderTarget: experimental_renderTarget,
      }),
    });
  };
}
