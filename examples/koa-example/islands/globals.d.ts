type ReactJSXIntrinsicAttributes = JSX.IntrinsicAttributes;

declare namespace JSX {
  interface IntrinsicAttributes {
    client?: boolean | "only" | "visible";
  }
}