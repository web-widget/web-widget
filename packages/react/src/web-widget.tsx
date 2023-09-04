import type { Loader, WebWidgetContainerOptions } from "@web-widget/web-widget";
import { parse } from "@web-widget/web-widget";
import { Suspense, createElement, lazy } from "react";
import type { ReactNode } from "react";

export const __ENV__ = {
  server: true,
};

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

      if (!__ENV__.server) {
        console.warn(`Client components are experimental.`);
        await customElements.whenDefined(tag);
        const element = Object.assign(document.createElement(tag), props);
        // @ts-ignore
        await element.bootstrap();
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
  renderStage?: WebWidgetContainerOptions["renderStage"];
}

export /*#__PURE__*/ function defineWebWidget(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  options.renderTarget = "light"; // TODO shadow
  options.loading = "lazy";
  return function WebWidgetSuspense({
    children,
    fallback,
    renderStage = options.renderStage,
    ...data
  }: WebWidgetSuspenseProps) {
    return createElement(Suspense, {
      fallback,
      children: createElement(WebWidget, {
        ...options,
        children,
        data,
        loader,
        renderStage,
      }),
    });
  };
}
