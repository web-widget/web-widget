import type { WidgetModuleLoader } from '@web-widget/schema';
import { INNER_HTML_PLACEHOLDER } from '../shared/constants';
import type {
  WebWidgetRendererOptions,
  WebWidgetRendererInterface,
  WebWidgetRendererConstructor,
  WebWidgetRenderOptions,
  WebWidgetOuterRenderOptions,
} from './contracts';
import {
  createPendingBoundary,
  getClientModuleId,
  serializeAttributes,
  serializePendingBoundary,
  unsafePropsToAttrs,
} from './markup';
import {
  omitDefaultWebWidgetRendererOptions,
  resolveWebWidgetRendererOptions,
} from './options';
export type * from './contracts';
export * from '../element/web-widget';

class ClientWebWidgetRenderer implements WebWidgetRendererInterface {
  #clientImport: string;
  #options: Omit<WebWidgetRendererOptions, 'renderStage'>;
  localName = 'web-widget';
  opaqueInnerHTML = INNER_HTML_PLACEHOLDER;

  get pendingBoundary() {
    return createPendingBoundary();
  }

  constructor(
    loader: WidgetModuleLoader,
    { renderStage, ...options }: WebWidgetRendererOptions
  ) {
    const resolvedOptions = resolveWebWidgetRendererOptions(options);

    if (renderStage === 'server') {
      throw new Error(
        `"renderStage: 'server'" usually comes from server-side rendering,` +
          ` it doesn't make sense to enable it on the client side.`
      );
    }

    this.#clientImport = getClientModuleId(loader, resolvedOptions);
    this.#options = resolvedOptions;
  }

  get attributes() {
    const clientImport = this.#clientImport;
    const {
      data: contextdata,
      devStyles,
      meta: _meta,
      ...options
    } = omitDefaultWebWidgetRendererOptions(this.#options);

    const attrs = unsafePropsToAttrs({
      ...options,
      // base: options.base?.startsWith("file://") ? undefined : options.base,
      contextdata: JSON.stringify(contextdata),
      import: clientImport,
      recovering: false,
      devstyles: devStyles?.length
        ? JSON.stringify(devStyles.map(({ id }) => id))
        : undefined,
    });

    if (attrs.contextdata === '{}') {
      delete attrs.contextdata;
    }

    return attrs;
  }

  async renderInnerHTMLToString({
    children = '',
  }: WebWidgetRenderOptions = {}) {
    if (children && this.#options.root !== 'shadow') {
      throw new Error(`Rendering content in a slot requires "root: 'shadow'".`);
    }
    return INNER_HTML_PLACEHOLDER;
  }

  async renderOuterHTMLToString({
    children = '',
    pendingHTML = '',
  }: WebWidgetOuterRenderOptions = {}) {
    const tag = this.localName;
    const attributes = this.attributes;
    const innerHTML = await this.renderInnerHTMLToString({ children });
    const pending = serializePendingBoundary(this.pendingBoundary, pendingHTML);
    return `<${tag} ${serializeAttributes(attributes)}>${innerHTML}${pending}</${tag}>`;
  }
}

export const WebWidgetRenderer: WebWidgetRendererConstructor =
  ClientWebWidgetRenderer;
