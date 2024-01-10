import type { Loader, WebWidgetRendererOptions } from "@web-widget/web-widget";
import { WebWidgetRenderer } from "@web-widget/web-widget";
import { Suspense, createElement, lazy } from "react";
import type { ReactNode } from "react";
import { IS_BROWSER } from "@web-widget/schema/helpers";

export interface WebWidgetProps {
  base?: WebWidgetRendererOptions["base"];
  children /**/?: ReactNode;
  data?: WebWidgetRendererOptions["data"];
  import?: WebWidgetRendererOptions["import"];
  inactive?: WebWidgetRendererOptions["inactive"];
  loader /**/ : Loader;
  meta?: WebWidgetRendererOptions["meta"];
  loading?: WebWidgetRendererOptions["loading"];
  name?: WebWidgetRendererOptions["name"];
  renderStage?: WebWidgetRendererOptions["renderStage"];
  renderTarget?: WebWidgetRendererOptions["renderTarget"];
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
      const widget = new WebWidgetRenderer(loader as Loader, {
        ...props,
        // TODO children
        children: "",
      });
      const tag = widget.localName;
      const attrs = widget.attributes;
      const innerHTML = await widget.renderInnerHTMLToString();

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
  base?: WebWidgetRendererOptions["base"];
  import?: WebWidgetRendererOptions["import"];
  loading?: WebWidgetRendererOptions["loading"];
  name?: WebWidgetRendererOptions["name"];
  renderStage?: WebWidgetRendererOptions["renderStage"];
  renderTarget?: WebWidgetRendererOptions["renderTarget"];
}

export interface WebWidgetSuspenseProps {
  children?: ReactNode;
  fallback?: ReactNode;
  experimental_loading?: WebWidgetRendererOptions["loading"];
  renderStage?: WebWidgetRendererOptions["renderStage"];
  experimental_renderTarget?: WebWidgetRendererOptions["renderTarget"];
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
