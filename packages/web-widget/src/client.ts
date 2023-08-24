import type { Loader, WebWidgetContainerOptions } from "./types";
import { getClientModuleId, unsafePropsToAttrs } from "./utils/render";

export type * from "./types";
export * from "./element";
export * from "./event";

export /*#__PURE__*/ async function parse(
  loader: Loader,
  { children = "", renderStage, ...options }: WebWidgetContainerOptions
): Promise<[tag: string, attrs: Record<string, string>, children: string]> {
  if (children && options.renderTarget !== "shadow") {
    throw new Error(
      `Rendering content in a slot requires "renderTarget: 'shadow'".`
    );
  }

  if (renderStage === "server") {
    console.warn(
      `"renderStage: 'server'" usually comes from server-side rendering,` +
        ` it doesn't make sense to enable it on the client side.`
    );
  }

  let result = "";
  const clientImport = getClientModuleId(loader, options);

  const attrs = unsafePropsToAttrs({
    ...options,
    base: options.base?.startsWith("file://") ? undefined : options.base,
    data: JSON.stringify(options.data),
    import: clientImport,
    recovering: false,
  });

  return ["web-widget", attrs, result];
}
