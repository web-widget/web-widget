/// <reference types="react" />

interface WebWidgetSuspenseProps {
  fallback?: ReactNode;
  experimental_loading?: "lazy" | "eager";
  renderStage?: "server" | "client";
  experimental_renderTarget?: "light" | "shadow";
}

interface ReactWidgetComponent<T = unknown> extends ComponentProps<any> {
  (
    props: {
      children?: ReactNode;
    } & WebWidgetSuspenseProps &
      T
  ): ReactNode;
}

declare namespace JSX {
  interface IntrinsicAttributes extends WebWidgetSuspenseProps {
    key?: Key | null | undefined;
  }
}

declare module "*.widget.jsx" {
  const reactWidgetComponent: ReactWidgetComponent;
  export default reactWidgetComponent;
}

declare module "*.widget.tsx" {
  const reactWidgetComponent: ReactWidgetComponent;
  export default reactWidgetComponent;
}

declare module "*?as=jsx" {
  const reactWidgetComponent: ReactWidgetComponent<any>;
  export default reactWidgetComponent;
}

declare module "*?as=tsx" {
  const reactWidgetComponent: ReactWidgetComponent<any>;
  export default reactWidgetComponent;
}
