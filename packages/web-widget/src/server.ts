import type {
  ServerWidgetModule,
  ServerWidgetRenderContext,
} from '@web-widget/helpers';
import { mergeMeta, rebaseMeta, renderMetaToString } from '@web-widget/helpers';
import { renderLifecycleCacheLayer } from '@web-widget/lifecycle-cache/server';
import type {
  Loader,
  WebWidgetElementProps,
  WebWidgetRendererOptions,
} from './types';
import {
  getClientModuleId,
  getDisplayModuleId,
  unsafePropsToAttrs,
} from './utils/render';
export type * from './types';

const __FEATURE_INJECTING_STYLES__ = false;

declare global {
  interface ReadableStream {
    [Symbol.asyncIterator](): AsyncIterator<ArrayBuffer | ArrayBufferView>;
  }
}

async function readableStreamToString(readableStream: ReadableStream) {
  let result = '';
  const textDecoder = new TextDecoder();
  for await (const chunk of readableStream) {
    result += textDecoder.decode(chunk, { stream: true });
  }
  return result;
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

async function suspense<T>(handler: () => T) {
  let result;
  try {
    result = await handler();
  } catch (error) {
    if (error instanceof Promise) {
      await error;
      result = await handler();
    } else {
      throw error;
    }
  }
  return result;
}

export class WebWidgetRenderer {
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

  get attributes(): Record<string, string> {
    const clientImport = this.#clientImport;
    const options = this.#options;
    const renderStage = this.#renderStage;

    if (renderStage === 'server') {
      return unsafePropsToAttrs({
        name: options.name,
      });
    }

    const attrs = unsafePropsToAttrs({
      ...options,
      // base: options.base?.startsWith("file://") ? undefined : options.base,
      data: JSON.stringify(options.data),
      import: clientImport,
      recovering: renderStage !== 'client',
    });

    if (attrs.data === '{}') {
      delete attrs.data;
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

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const module = (await loader()) as ServerWidgetModule;
    if (typeof module.render !== 'function') {
      throw new TypeError(
        `The module does not export a "render" method: ${getDisplayModuleId(
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
      module,
    };
    const rawResult = await suspense(() => module.render!(context));

    if (getType(rawResult) === 'ReadableStream') {
      result = await readableStreamToString(rawResult as ReadableStream);
    } else if (typeof rawResult === 'string') {
      result = rawResult;
    } else {
      throw new TypeError(
        `Render results in an unknown format: ${getDisplayModuleId(
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

    // eslint-disable-next-line react-hooks/rules-of-hooks
    result += renderLifecycleCacheLayer();

    return result;
  }

  async renderOuterHTMLToString() {
    const tag = this.localName;
    const attributes = this.attributes;
    const children = await this.renderInnerHTMLToString();
    return `<${tag} ${unsafeAttrsToHtml(attributes)}>${children}</${tag}>`;
  }
}
