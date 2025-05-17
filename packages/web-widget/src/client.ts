import type {
  ClientLoader,
  WebWidgetRendererOptions,
  WebWidgetElementProps,
  WebWidgetRendererInterface,
  WebWidgetRendererConstructor,
} from './types';
import { getClientModuleId, unsafePropsToAttrs } from './utils/render';
import { INNER_HTML_PLACEHOLDER } from './element';

export type * from './types';
export * from './element';

function unsafeAttrsToHtml(attrs: Record<string, string>) {
  return Object.entries(attrs)
    .map(
      ([attrName, attrValue]) =>
        `${attrName}${attrValue === '' ? '' : '="' + attrValue + '"'}`
    )
    .join(' ');
}

class ClientWebWidgetRenderer implements WebWidgetRendererInterface {
  #clientImport: string;
  #options: WebWidgetElementProps;
  localName = 'web-widget';

  constructor(
    loader: ClientLoader,
    { children = '', renderStage, ...options }: WebWidgetRendererOptions
  ) {
    if (children && options.renderTarget !== 'shadow') {
      throw new Error(
        `Rendering content in a slot requires "renderTarget: 'shadow'".`
      );
    }

    if (renderStage === 'server') {
      throw new Error(
        `"renderStage: 'server'" usually comes from server-side rendering,` +
          ` it doesn't make sense to enable it on the client side.`
      );
    }

    this.#clientImport = getClientModuleId(loader, options);
    this.#options = options;
  }

  get attributes() {
    const clientImport = this.#clientImport;
    const { data: contextdata, meta: contextmeta, ...options } = this.#options;

    const attrs = unsafePropsToAttrs({
      ...options,
      // base: options.base?.startsWith("file://") ? undefined : options.base,
      contextdata: JSON.stringify(contextdata),
      contextmeta: JSON.stringify(contextmeta),
      import: clientImport,
      recovering: false,
    });

    if (attrs.contextdata === '{}') {
      delete attrs.contextdata;
    }

    if (attrs.contextmeta === '{}') {
      delete attrs.contextmeta;
    }

    return attrs;
  }

  async renderInnerHTMLToString() {
    return INNER_HTML_PLACEHOLDER;
  }

  async renderOuterHTMLToString() {
    const tag = this.localName;
    const attributes = this.attributes;
    const children = await this.renderInnerHTMLToString();
    return `<${tag} ${unsafeAttrsToHtml(attributes)}>${children}</${tag}>`;
  }
}

export const WebWidgetRenderer: WebWidgetRendererConstructor<ClientLoader> =
  ClientWebWidgetRenderer;
