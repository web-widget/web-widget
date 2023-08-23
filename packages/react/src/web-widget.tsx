import type { Loader, WebWidgetContainerProps } from "@web-widget/web-widget";
import { parse } from "@web-widget/web-widget";
import { Suspense, createElement, lazy } from "react";
import type { ReactNode } from "react";

export const __ENV__ = {
  server: true,
};

export interface WebWidgetProps {
  base?: WebWidgetContainerProps["base"];
  children /**/?: ReactNode;
  data?: WebWidgetContainerProps["data"];
  import?: WebWidgetContainerProps["import"];
  loader /**/ : Loader;
  loading?: WebWidgetContainerProps["loading"];
  name?: WebWidgetContainerProps["name"];
  recovering: WebWidgetContainerProps["recovering"];
  renderTarget?: WebWidgetContainerProps["renderTarget"];
}

export /*#__PURE__*/ function WebWidget({
  children,
  loader,
  ...props
}: WebWidgetProps) {
  if (props.recovering && !loader) {
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
  base?: WebWidgetContainerProps["base"];
  import?: WebWidgetContainerProps["import"];
  loading?: WebWidgetContainerProps["loading"];
  name?: WebWidgetContainerProps["name"];
  recovering?: WebWidgetContainerProps["recovering"];
  renderTarget?: WebWidgetContainerProps["renderTarget"];
}

export interface WebWidgetSuspenseProps {
  children?: ReactNode;
  clientOnly?: boolean;
  fallback?: ReactNode;
}

export /*#__PURE__*/ function defineWebWidget(
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
