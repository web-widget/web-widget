import type { ReactNode, ComponentProps } from "react";

interface WebWidgetSuspenseProps {
  fallback?: ReactNode;
  experimental_loading?: "lazy" | "eager";
  renderStage?: "server" | "client";
  experimental_renderTarget?: "light" | "shadow";
}

declare global {
  declare namespace JSX {
    interface IntrinsicAttributes extends WebWidgetSuspenseProps {
      key?: Key | null | undefined;
    }
  }
}

interface ReactWidgetComponent extends ComponentProps<any> {
  (
    props: {
      children?: ReactNode;
    } & WebWidgetSuspenseProps
  ): ReactNode;
}

declare module "*.widget.jsx" {
  const reactWidgetComponent: ReactWidgetComponent;
  export default reactWidgetComponent;
}

declare module "*.route.tsx" {
  const reactWidgetComponent: ReactWidgetComponent;
  export default reactWidgetComponent;
}
