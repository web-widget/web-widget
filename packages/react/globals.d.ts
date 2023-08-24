import type { ReactNode, ComponentProps } from "react";

type _IntrinsicAttributes = IntrinsicAttributes;

declare namespace JSX {
  interface IntrinsicAttributes extends _IntrinsicAttributes {
    renderStage?: "server" | "client";
    fallback?: ReactNode;
  }
}

interface ReactWidgetComponent extends ComponentProps<any> {
  (props: {
    children?: ReactNode;
    renderStage?: "server" | "client";
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
