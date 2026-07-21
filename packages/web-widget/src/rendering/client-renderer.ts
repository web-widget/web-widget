import type { WidgetModuleLoader } from '@web-widget/schema';
import type {
  WebWidgetRendererOptions,
  WebWidgetRendererInterface,
  WebWidgetRendererConstructor,
} from './contracts';
import {
  createPendingBoundary,
  getClientModuleId,
  serializeAttributes,
  serializePendingBoundary,
  unsafePropsToAttrs,
} from './markup';
import { INNER_HTML_PLACEHOLDER } from '../element/web-widget';
import {
  omitDefaultWebWidgetRendererOptions,
  resolveWebWidgetRendererOptions,
} from './options';
import '../element/install';

export type * from './contracts';
export * from '../element/web-widget';

class ClientWebWidgetRenderer implements WebWidgetRendererInterface {
  #clientImport: string;
  #options: Omit<WebWidgetRendererOptions, 'children' | 'renderStage'>;
  localName = 'web-widget';

  get pendingBoundary() {
    return createPendingBoundary(this.#options.root);
  }

  constructor(
    loader: WidgetModuleLoader,
    { children = '', renderStage, ...options }: WebWidgetRendererOptions
  ) {
    const resolvedOptions = resolveWebWidgetRendererOptions(options);

    if (children && resolvedOptions.root !== 'shadow') {
      throw new Error(`Rendering content in a slot requires "root: 'shadow'".`);
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
