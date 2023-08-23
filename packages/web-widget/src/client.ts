import type { Loader, WebWidgetContainerProps } from "./types";
import { getClientModuleId, unsafePropsToAttrs } from "./utils/render";

export type * from "./types";
export * from "./element";
export * from "./event";

export /*#__PURE__*/ async function parse(
  loader: Loader,
  { children = "", ...props }: WebWidgetContainerProps
): Promise<[tag: string, attrs: Record<string, string>, children: string]> {
  if (children && props.renderTarget !== "shadow") {
    throw new Error(
      `Rendering content in a slot requires "options.renderTarget = 'shadow'".`
    );
  }

  if (props.recovering) {
    console.warn(
      `"options.recovering" usually comes from server-side rendering,` +
        ` it doesn't make sense to enable it on the client side.`
    );
  }

  let result = "";
  const clientImport = getClientModuleId(loader, props);

  const attrs = unsafePropsToAttrs({
    ...props,
    base: props.base?.startsWith("file://") ? undefined : props.base,
    data: JSON.stringify(props.data),
    import: clientImport,
  });

  return ["web-widget", attrs, result];
}
