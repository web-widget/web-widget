type _IntrinsicAttributes = IntrinsicAttributes;

declare namespace JSX {
  interface IntrinsicAttributes extends _IntrinsicAttributes {
    as?: "web-widget" | "web-widget:server" | "web-widget:client" | any;
    loading?: "lazy" | any;
  }
}
