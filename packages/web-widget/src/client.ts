import type { WidgetModuleLoader } from '@web-widget/schema';
import type {
  WebWidgetRendererOptions,
  WebWidgetRendererInterface,
  WebWidgetRendererConstructor,
} from './types';
import {
  createPendingBoundary,
  getClientModuleId,
  serializeAttributes,
  serializePendingBoundary,
  unsafePropsToAttrs,
} from './utils/render';
import { INNER_HTML_PLACEHOLDER } from './element';
import { resolveWebWidgetRendererOptions } from './options';
import './install';

export type * from './types';
export * from './element';

class ClientWebWidgetRenderer implements WebWidgetRendererInterface {
  #clientImport: string;
  #options: Omit<WebWidgetRendererOptions, 'children' | 'renderStage'>;
  localName = 'web-widget';

  get pendingBoundary() {
    return createPendingBoundary(this.#options.renderTarget);
  }

  constructor(
    loader: WidgetModuleLoader,
    { children = '', renderStage, ...options }: WebWidgetRendererOptions
  ) {
    const resolvedOptions = resolveWebWidgetRendererOptions(options);

    if (children && resolvedOptions.renderTarget !== 'shadow') {
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
    } = this.#options;

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

  async renderInnerHTMLToString() {
    return INNER_HTML_PLACEHOLDER;
  }

  async renderOuterHTMLToString({ pendingHTML = '' } = {}) {
    const tag = this.localName;
    const attributes = this.attributes;
    const children = await this.renderInnerHTMLToString();
    const pending = serializePendingBoundary(this.pendingBoundary, pendingHTML);
    return `<${tag} ${serializeAttributes(attributes)}>${children}${pending}</${tag}>`;
  }
}

export const WebWidgetRenderer: WebWidgetRendererConstructor =
  ClientWebWidgetRenderer;
