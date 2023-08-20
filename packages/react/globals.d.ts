import type { ReactNode, ComponentProps } from "react";

type _IntrinsicAttributes = IntrinsicAttributes;

declare namespace JSX {
  interface IntrinsicAttributes extends _IntrinsicAttributes {
    as?: "web-widget" | "web-widget:server" | "web-widget:client" | any;
    clientOnly?: boolean;
    loading?: "lazy" | any;
    fallback?: ReactNode;
  }
}

interface ReactWidgetComponent extends ComponentProps<any> {
  (props: {
    children?: ReactNode;
    clientOnly?: boolean;
    fallback?: ReactNode;
  }): ReactNode;
}

declare module "*.widget.jsx" {
  const reactWidgetComponent: ReactWidgetComponent;
  export default reactWidgetComponent;
}

declare module "*.widget.tsx" {
  const reactWidgetComponent: ReactWidgetComponent;
  export default reactWidgetComponent;
}
