import type {
  Loader,
  WebWidgetRendererOptions,
  WebWidgetElementProps,
} from "./types";
import { getClientModuleId, unsafePropsToAttrs } from "./utils/render";

export type * from "./types";
export * from "./element";
export * from "./event";

function unsafeAttrsToHtml(attrs: Record<string, string>) {
  return Object.entries(attrs)
    .map(
      ([attrName, attrValue]) =>
        `${attrName}${attrValue === "" ? "" : '="' + attrValue + '"'}`
    )
    .join(" ");
}

export class WebWidgetRenderer {
  #clientImport: string;
  #options: WebWidgetElementProps;
  localName = "web-widget";

  constructor(
    loader: Loader,
    { children = "", renderStage, ...options }: WebWidgetRendererOptions
  ) {
    if (children && options.renderTarget !== "shadow") {
      throw new Error(
        `Rendering content in a slot requires "renderTarget: 'shadow'".`
      );
    }

    if (renderStage === "server") {
      throw new Error(
        `"renderStage: 'server'" usually comes from server-side rendering,` +
          ` it doesn't make sense to enable it on the client side.`
      );
    }

    this.#clientImport = getClientModuleId(loader, options);
    this.#options = options;
  }

  get attributes(): Record<string, string> {
    const clientImport = this.#clientImport;
    const options = this.#options;

    const attrs = unsafePropsToAttrs({
      ...options,
      base: options.base?.startsWith("file://") ? undefined : options.base,
      data: JSON.stringify(options.data),
      import: clientImport,
      recovering: false,
    });

    if (attrs.data === "{}") {
      delete attrs.data;
    }

    return attrs;
  }

  async renderInnerHTMLToString() {
    return "";
  }

  async renderOuterHTMLToString() {
    const tag = this.localName;
    const attributes = this.attributes;
    const children = await this.renderInnerHTMLToString();
    return `<${tag} ${unsafeAttrsToHtml(attributes)}>${children}</${tag}>`;
  }
}
