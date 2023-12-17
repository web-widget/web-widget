import type {
  ServerWidgetModule,
  WidgetRenderContext,
} from "@web-widget/schema";
import type { Loader, WebWidgetContainerOptions } from "./types";
import {
  mergeMeta,
  rebaseMeta,
  renderMetaToString,
  useAllState,
} from "@web-widget/schema/helpers";
import {
  getClientModuleId,
  getDisplayModuleId,
  unsafePropsToAttrs,
} from "./utils/render";
export type * from "./types";

const __FEATURE_INJECTING_STYLES__ = false;

declare global {
  interface ReadableStream {
    [Symbol.asyncIterator](): AsyncIterator<ArrayBuffer | ArrayBufferView>;
  }
}

const ESCAPE_LOOKUP: { [match: string]: string } = {
  ">": "\\u003e",
  "<": "\\u003c",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const ESCAPE_REGEX = /[><\u2028\u2029]/g;

// This utility is based on https://github.com/zertosh/htmlescape
// License: https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE
function htmlEscapeJsonString(str: string): string {
  return str.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}

async function readableStreamToString(readableStream: ReadableStream) {
  let result = "";
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
        `${attrName}${attrValue === "" ? "" : '="' + attrValue + '"'}`
    )
    .join(" ");
}

export /*#__PURE__*/ async function parse(
  loader: Loader,
  { children = "", renderStage, ...options }: WebWidgetContainerOptions
): Promise<[tag: string, attrs: Record<string, string>, children: string]> {
  if (children && options.renderTarget !== "shadow") {
    throw new Error(
      `Rendering content in a slot requires "options.renderTarget = 'shadow'".`
    );
  }

  let result = "";
  const clientImport = getClientModuleId(loader, options);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const state = useAllState();
  const keys = Object.keys(state);

  if (renderStage !== "client") {
    const module = (await loader()) as ServerWidgetModule;
    if (typeof module.render !== "function") {
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
      ? meta.link.filter(({ rel }) => rel === "stylesheet")
      : [];
    const styles = meta.style || [];
    const hasStyle = styleLinks.length || styles.length;

    const context: WidgetRenderContext = {
      children: options.renderTarget === "light" ? children : undefined,
      data: options.data,
      meta,
      module,
    };
    const rawResult = await module.render(context);

    if (getType(rawResult) === "ReadableStream") {
      result = await readableStreamToString(rawResult as ReadableStream);
    } else if (typeof rawResult === "string") {
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
      result = [
        renderMetaToString({
          link: styleLinks,
          style: styles,
        }),
        `<web-widget.body>${result}</web-widget.body>`,
      ].join("");
    }
  }

  if (options.renderTarget === "shadow") {
    /* @stringify >>> */
    const shimCode = `(${(
      a: (target: Element) => void,
      c = document.currentScript,
      p = c && c.parentElement,
      _ = c && c.remove()
    ) => a && p && a(p)})(window.attachShadowRoots)`.replace(/\s/g, "");
    /* @stringify <<< */

    // NOTE: Declarative Shadow DOM
    // @see https://developer.chrome.com/articles/declarative-shadow-dom/
    result = [
      `<template shadowrootmode="open">${result}</template>`,
      `<script>${shimCode}</script>`,
      children,
    ].join("");
  }

  let isEmpty = true;
  const local = Object.keys(state)
    .filter((key) => !keys.includes(key))
    .reduce((previousValue, currentValue) => {
      isEmpty = false;
      previousValue[currentValue] = state[currentValue];
      return previousValue;
    }, {} as any);

  if (!isEmpty) {
    result += `<script name="state:web-widget" type="application/json">${htmlEscapeJsonString(
      JSON.stringify(local)
    )}</script>`;
  }

  if (renderStage === "server") {
    return [
      "web-widget",
      unsafePropsToAttrs({
        name: options.name,
      }),
      result,
    ];
  }

  const attrs = unsafePropsToAttrs({
    ...options,
    base: options.base?.startsWith("file://") ? undefined : options.base,
    data: JSON.stringify(options.data),
    import: clientImport,
    recovering: renderStage !== "client",
  });

  return ["web-widget", attrs, result];
}

export /*#__PURE__*/ async function renderToString(
  loader: Loader,
  options: WebWidgetContainerOptions
) {
  const [tag, attrs, children] = await parse(loader, options);

  return `<${tag} ${unsafeAttrsToHtml(attrs)}>${children}</${tag}>`;
}

// TODO export async function renderToReadableStream() {}
