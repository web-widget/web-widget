import type { ServerWidgetModule } from '@web-widget/helpers';
import { mergeMeta, rebaseMeta, renderMetaToString } from '@web-widget/helpers';
import {
  renderLifecycleCacheLayer,
  callSyncCacheProvider,
} from '@web-widget/lifecycle-cache/server';
import type {
  Loader,
  WebWidgetElementProps,
  WebWidgetRendererOptions,
  WebWidgetRendererInterface,
  WebWidgetRendererConstructor,
  ServerWidgetRenderContext,
} from './types';
import {
  getClientModuleId,
  getDisplayModuleId,
  unsafePropsToAttrs,
} from './utils/render';
export type * from './types';

const __FEATURE_INJECTING_STYLES__ = false;
let showWebContainerWarning = true;

declare global {
  interface ReadableStream {
    [Symbol.asyncIterator](): AsyncIterator<ArrayBuffer | ArrayBufferView>;
  }
}

const getType = (obj: any) => Object.prototype.toString.call(obj).slice(8, -1);

function unsafeAttrsToHtml(attrs: Record<string, string>) {
  return Object.entries(attrs)
    .map(
      ([attrName, attrValue]) =>
        `${attrName}${attrValue === '' ? '' : '="' + attrValue + '"'}`
    )
    .join(' ');
}

class ServerWebWidgetRenderer implements WebWidgetRendererInterface {
  #children: string;
  #clientImport: string;
  #loader: Loader;
  #options: WebWidgetElementProps;
  #renderStage?: string;
  localName = 'web-widget';

  constructor(
    loader: Loader,
    { children = '', renderStage, ...options }: WebWidgetRendererOptions
  ) {
    if (children && options.renderTarget !== 'shadow') {
      throw new Error(
        `Rendering content in a slot requires "options.renderTarget = 'shadow'".`
      );
    }

    this.#children = children;
    this.#clientImport = getClientModuleId(loader, options);
    this.#loader = loader;
    this.#options = options;
    this.#renderStage = renderStage;
  }

  get attributes() {
    const clientImport = this.#clientImport;
    const { data: contextdata, meta: contextmeta, ...options } = this.#options;
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
      contextmeta: JSON.stringify(contextmeta),
      import: clientImport,
      recovering: renderStage !== 'client',
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
    const children = this.#children;
    const clientImport = this.#clientImport;
    const loader = this.#loader;
    const options = this.#options;
    const renderStage = this.#renderStage;

    let result = '';

    if (renderStage === 'client') {
      return result;
    }

    const module = (await loader()) as ServerWidgetModule;
    if (typeof module.render !== 'function') {
      throw new TypeError(
        `Module is missing export "render": ${getDisplayModuleId(
          loader,
          options
        )}`
      );
    }

    const meta = rebaseMeta(
      mergeMeta(module.meta ?? {}, options.meta ?? {}),
      clientImport
    );

    if (meta.script?.length) {
      console.warn(`Script tags in meta will be ignored.`);
    }

    const styleLinks = meta.link
      ? meta.link.filter(({ rel }) => rel === 'stylesheet')
      : [];
    const styles = meta.style || [];
    const hasStyle = styleLinks.length || styles.length;

    const context: ServerWidgetRenderContext = {
      children: options.renderTarget === 'light' ? children : undefined,
      data: options.data,
      meta,
    };
    const component = module.default;

    if (!component) {
      throw new TypeError(`Module is missing export "default".`);
    }

    const rawResult = await callSyncCacheProvider(() =>
      module.render!(component, context, {})
    );

    if (typeof rawResult === 'string') {
      result = rawResult;
    } else {
      throw new TypeError(
        `Render results in an unknown format: ${getType(rawResult)}: ${getDisplayModuleId(
          loader,
          options
        )}`
      );
    }

    if (hasStyle && __FEATURE_INJECTING_STYLES__) {
      result += renderMetaToString({
        link: styleLinks,
        style: styles,
      });
      result += `<web-widget.body>${result}</web-widget.body>`;
    }

    if (options.renderTarget === 'shadow') {
      /* @stringify >>> */
      const shimCode = `(${(
        a: (target: Element) => void,
        c = document.currentScript,
        p = c && c.parentElement,
        _ = c && c.remove()
      ) => a && p && a(p)})(window.attachShadowRoots)`.replace(/\s/g, '');
      /* @stringify <<< */

      // NOTE: Declarative Shadow DOM
      // @see https://developer.chrome.com/articles/declarative-shadow-dom/
      result += `<template shadowrootmode="open">${result}</template>`;
      result += `<script>${shimCode}</script>`;
      result += children;
    }

    try {
      result += renderLifecycleCacheLayer();
    } catch (error: any) {
      if (error?.message?.includes('Context is not available')) {
        if (isWebContainer()) {
          // NOTE: This is a temporary solution, it mainly avoids crashes in stackblitz environment.
          if (showWebContainerWarning) {
            console.warn(
              `WARN: LifecycleCache cannot be serialized.\n` +
                `WARN: This may be because the WebContainer environment does not support AsyncLocalStorage.\n` +
                `WARN: Please see https://github.com/stackblitz/webcontainer-core/issues/1169`
            );
            showWebContainerWarning = false;
          }
        } else {
          // NOTE: Since WebWidget can run independently of WebRouter,
          // it should not throw errors when lacking context.
          // throw error;
        }
      } else {
        throw error;
      }
    }

    return result;
  }

  async renderOuterHTMLToString() {
    const tag = this.localName;
    const attributes = this.attributes;
    const children = await this.renderInnerHTMLToString();
    return `<${tag} ${unsafeAttrsToHtml(attributes)}>${children}</${tag}>`;
  }
}

function isWebContainer() {
  return (
    typeof Reflect.get(globalThis, 'process')?.versions?.webcontainer ===
    'string'
  );
}

export const WebWidgetRenderer: WebWidgetRendererConstructor =
  ServerWebWidgetRenderer;
