import type { ReactNode, ComponentProps } from "react";

declare global {
  declare namespace JSX {
    interface IntrinsicAttributes {
      key?: Key | null | undefined;
      renderStage?: "server" | "client";
      fallback?: ReactNode;
    }
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

declare module "*.route.tsx" {
  const reactWidgetComponent: ReactWidgetComponent;
  export default reactWidgetComponent;
}
