type _IntrinsicAttributes = IntrinsicAttributes;
type loading = boolean | "lazy";

declare namespace JSX {
  interface IntrinsicAttributes extends _IntrinsicAttributes {
    client?: loading;
    clientOnly?: loading;
  }
}
