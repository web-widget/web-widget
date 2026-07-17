import type { ServerWidgetModule } from '@web-widget/helpers';
import { mergeMeta, rebaseMeta, renderMetaToString } from '@web-widget/helpers';
import {
  renderLifecycleCacheLayer,
  callSyncCacheProvider,
} from '@web-widget/lifecycle-cache/server';
import type { WidgetModuleLoader } from '@web-widget/schema';
import type {
  WebWidgetRendererOptions,
  WebWidgetRendererInterface,
  WebWidgetRendererConstructor,
  WidgetRenderParts,
} from './types';
import { WEB_WIDGET_PENDING_LOCAL_NAME } from './types';
import {
  WEB_WIDGET_PENDING_SLOT_NAME,
  WEB_WIDGET_ROOT_LOCAL_NAME,
  WEB_WIDGET_STATE_SLOT_NAME,
} from './constants';
import { resolveWidgetStyles } from './styles';
import { resolveWebWidgetRendererOptions } from './options';
import {
  getClientModuleId,
  getDisplayModuleId,
  unsafePropsToAttrs,
} from './utils/render';
export type * from './types';

let showWebContainerWarning = true;

const getType = (obj: any) => Object.prototype.toString.call(obj).slice(8, -1);

function isWebContainer() {
  return (
    typeof Reflect.get(globalThis, 'process')?.versions?.webcontainer ===
    'string'
  );
}

function tryRenderLifecycleCacheLayer(
  target: WidgetRenderParts['target']
): string {
  try {
    return renderLifecycleCacheLayer(
      undefined,
      target === 'shadow'
        ? { scriptAttributes: { slot: WEB_WIDGET_STATE_SLOT_NAME } }
        : undefined
    );
  } catch (error: unknown) {
    const msg =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message)
        : '';
    if (msg.includes('Context is not available')) {
      if (isWebContainer()) {
        if (showWebContainerWarning) {
          console.warn(
            `WARN: LifecycleCache cannot be serialized. This may be because the WebContainer environment does not support AsyncLocalStorage. See https://github.com/stackblitz/webcontainer-core/issues/1169`
          );
          showWebContainerWarning = false;
        }
      }
      return '';
    }
    throw error;
  }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function unsafeAttrsToHtml(attrs: Record<string, string>) {
  return Object.entries(attrs)
    .map(
      ([attrName, attrValue]) =>
        `${attrName}${attrValue === '' ? '' : '="' + escapeAttr(attrValue) + '"'}`
    )
    .join(' ');
}

function renderStylesToString(styles: WidgetRenderParts['styles']): string {
  return styles
    .map((descriptor) => {
      const marker = { 'data-web-widget-style': descriptor.id };
      return descriptor.href
        ? renderMetaToString({
            link: [
              {
                ...marker,
                href: descriptor.href,
                integrity: descriptor.integrity,
                media: descriptor.media,
                rel: 'stylesheet',
              },
            ],
          })
        : renderMetaToString({
            style: [
              {
                ...marker,
                content: descriptor.content ?? '',
                media: descriptor.media,
              },
            ],
          });
    })
    .join('');
}

function serializeInnerHTML(parts: WidgetRenderParts): string {
  const pendingSlot =
    parts.target === 'shadow' ? ` slot="${WEB_WIDGET_PENDING_SLOT_NAME}"` : '';
  const pendingHTML = parts.pendingHTML
    ? `<${WEB_WIDGET_PENDING_LOCAL_NAME} aria-busy="true"${pendingSlot} style="display:contents">${parts.pendingHTML}</${WEB_WIDGET_PENDING_LOCAL_NAME}>`
    : '';
  if (parts.target === 'light') {
    return parts.appHTML + pendingHTML + parts.transferHTML;
  }

  const shadowHTML =
    renderStylesToString(parts.styles) +
    (pendingHTML
      ? `<slot name="${WEB_WIDGET_PENDING_SLOT_NAME}"></slot>`
      : '') +
    `<${WEB_WIDGET_ROOT_LOCAL_NAME} style="display:contents">` +
    parts.appHTML +
    `</${WEB_WIDGET_ROOT_LOCAL_NAME}>`;

  return (
    `<template shadowrootmode="open">${shadowHTML}</template>` +
    pendingHTML +
    parts.lightChildrenHTML +
    parts.transferHTML
  );
}

class ServerWebWidgetRenderer implements WebWidgetRendererInterface {
  #children: string;
  #clientImport: string;
  #loader: WidgetModuleLoader;
  #options: Omit<WebWidgetRendererOptions, 'children' | 'renderStage'>;
  #renderStage?: string;
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
        `Rendering content in a slot requires "options.renderTarget = 'shadow'".`
      );
    }

    this.#children = children;
    this.#clientImport = getClientModuleId(loader, resolvedOptions);
    this.#loader = loader;
    this.#options = resolvedOptions;
    this.#renderStage = renderStage;
  }

  get attributes() {
    const clientImport = this.#clientImport;
    const {
      data: contextdata,
      devStyles,
      meta: _meta,
      ...options
    } = this.#options;
    const renderStage = this.#renderStage;

    if (renderStage === 'server') {
      return unsafePropsToAttrs({
        name: options.name,
      });
    }

    const attrs = unsafePropsToAttrs({
      ...options,
      // base: options.base?.startsWith("file://") ? undefined : options.base,
      contextdata: JSON.stringify(contextdata),
      import: clientImport,
      recovering: renderStage !== 'client',
      devstyles: devStyles?.length
        ? JSON.stringify(devStyles.map(({ id }) => id))
        : undefined,
    });

    if (attrs.contextdata === '{}') {
      delete attrs.contextdata;
    }

    return attrs;
  }

  async #renderParts(): Promise<WidgetRenderParts> {
    const children = this.#children;
    const clientImport = this.#clientImport;
    const loader = this.#loader;
    const options = this.#options;
    const renderStage = this.#renderStage;

    const target = options.renderTarget === 'shadow' ? 'shadow' : 'light';
    const attributes = this.attributes;

    if (renderStage === 'client') {
      const meta = rebaseMeta(options.meta ?? {}, clientImport);
      return {
        appHTML: '',
        attributes,
        lightChildrenHTML: children,
        styles:
          target === 'shadow'
            ? [
                ...resolveWidgetStyles(meta, clientImport),
                ...(options.devStyles ?? []),
              ]
            : [],
        target,
        transferHTML: tryRenderLifecycleCacheLayer(target),
      };
    }

    const module = (await loader()) as ServerWidgetModule;
    const { default: component, meta: _meta, render } = module;

    if (typeof render !== 'function') {
      throw new TypeError(
        `Module is missing export "render": ${getDisplayModuleId(
          loader,
          options
        )}`
      );
    }

    const meta = rebaseMeta(
      mergeMeta(_meta ?? {}, options.meta ?? {}),
      clientImport
    );

    if (meta.script?.length) {
      console.warn(`Script tags in meta will be ignored.`);
    }

    const rawResult = await callSyncCacheProvider(() =>
      render(component, options.data, {
        progressive: false,
      })
    );

    if (typeof rawResult !== 'string') {
      throw new TypeError(
        `Render results in an unknown format: ${getType(rawResult)}: ${getDisplayModuleId(
          loader,
          options
        )}`
      );
    }

    return {
      appHTML: rawResult,
      attributes,
      lightChildrenHTML: children,
      styles:
        target === 'shadow'
          ? [
              ...resolveWidgetStyles(meta, clientImport),
              ...(options.devStyles ?? []),
            ]
          : [],
      target,
      transferHTML: tryRenderLifecycleCacheLayer(target),
    };
  }

  async renderInnerHTMLToString() {
    return serializeInnerHTML(await this.#renderParts());
  }

  async renderOuterHTMLToString(options: { pendingHTML?: string } = {}) {
    const parts = await this.#renderParts();
    parts.pendingHTML = options.pendingHTML;
    const tag = this.localName;
    const children = serializeInnerHTML(parts);
    return `<${tag} ${unsafeAttrsToHtml(parts.attributes)}>${children}</${tag}>`;
  }
}

export const WebWidgetRenderer: WebWidgetRendererConstructor =
  ServerWebWidgetRenderer;
