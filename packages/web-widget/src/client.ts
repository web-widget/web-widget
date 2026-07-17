import type { WidgetModuleLoader } from '@web-widget/schema';
import type {
  WebWidgetRendererOptions,
  WebWidgetRendererInterface,
  WebWidgetRendererConstructor,
} from './types';
import { WEB_WIDGET_PENDING_SLOT_NAME } from './constants';
import { WEB_WIDGET_PENDING_LOCAL_NAME } from './types';
import { getClientModuleId, unsafePropsToAttrs } from './utils/render';
import { INNER_HTML_PLACEHOLDER } from './element';
import { resolveWebWidgetRendererOptions } from './options';
import './install';

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
  #options: Omit<WebWidgetRendererOptions, 'children' | 'renderStage'>;
  localName = 'web-widget';

  get pendingBoundary() {
    return {
      ariaBusy: true as const,
      display: 'contents' as const,
      localName: WEB_WIDGET_PENDING_LOCAL_NAME,
      slot:
        this.#options.renderTarget === 'shadow'
          ? WEB_WIDGET_PENDING_SLOT_NAME
          : '',
    };
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
    const boundary = this.pendingBoundary;
    const slot = boundary.slot ? ` slot="${boundary.slot}"` : '';
    const pending = pendingHTML
      ? `<${boundary.localName} aria-busy="true"${slot} style="display:contents">${pendingHTML}</${boundary.localName}>`
      : '';
    return `<${tag} ${unsafeAttrsToHtml(attributes)}>${children}${pending}</${tag}>`;
  }
}

export const WebWidgetRenderer: WebWidgetRendererConstructor =
  ClientWebWidgetRenderer;
