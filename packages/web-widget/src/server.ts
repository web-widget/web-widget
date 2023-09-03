import type {
  ServerWidgetModule,
  WidgetRenderContext,
} from "@web-widget/schema";
import type { Loader, WebWidgetContainerOptions } from "./types";
import {
  rebaseMeta,
  mergeMeta,
  renderMetaToString,
} from "@web-widget/schema/helpers";
import {
  getClientModuleId,
  getDisplayModuleId,
  unsafePropsToAttrs,
} from "./utils/render";
export type * from "./types";

const __FEATURE_INJECTING_STYLES__ = false;

// async function readableStreamToString(
//   readableStream: ReadableStream
// ) {
//   let result = "";
//   const textDecoder = new TextDecoder();
//   for await (const chunk of readableStream) {
//     result += textDecoder.decode(chunk, { stream: true });
//   }
//   return result;
// }

const getType = (obj: any) => Object.prototype.toString.call(obj).slice(8, -1);

async function readableStreamToString(stream: ReadableStream) {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let result = "";

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      result += chunk;
    }
  } finally {
    reader.releaseLock();
  }

  return result;
}

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
