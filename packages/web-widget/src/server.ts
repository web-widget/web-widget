import type {
  ServerWidgetModule,
  WidgetRenderContext,
} from "@web-widget/schema";
import type { Loader, WebWidgetContainerProps } from "./types";
import { rebaseMeta } from "@web-widget/schema/helpers";
import {
  getClientModuleId,
  getDisplayModuleId,
  unsafePropsToAttrs,
} from "./utils/render";
export type * from "./types";

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
  { children = "", renderStage, ...props }: WebWidgetContainerProps
): Promise<[tag: string, attrs: Record<string, string>, children: string]> {
  if (children && props.renderTarget !== "shadow") {
    throw new Error(
      `Rendering content in a slot requires "options.renderTarget = 'shadow'".`
    );
  }

  let result = "";
  const clientImport = getClientModuleId(loader, props);

  if (renderStage !== "client") {
    const module = (await loader()) as ServerWidgetModule;
    if (typeof module.render !== "function") {
      throw new TypeError(
        `The module does not export a "render" method: ${getDisplayModuleId(
          loader,
          props
        )}`
      );
    }

    const meta = rebaseMeta(module.meta ?? {}, clientImport);
    const context: WidgetRenderContext = {
      children: props.renderTarget === "light" ? children : undefined,
      data: props.data,
      meta,
      module,
    };
    const rawResult = await module.render(context);

    if (rawResult instanceof ReadableStream) {
      result = await readableStreamToString(rawResult);
    } else if (typeof rawResult === "string") {
      result = rawResult;
    } else {
      throw new TypeError(
        `Render results in an unknown format: ${getDisplayModuleId(
          loader,
          props
        )}`
      );
    }
  }

  if (props.renderTarget === "shadow") {
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
      children,
      `<script>${shimCode}</script>`,
    ].join("");
  }

  const attrs = unsafePropsToAttrs({
    ...props,
    base: props.base?.startsWith("file://") ? undefined : props.base,
    data: JSON.stringify(props.data),
    import: clientImport,
    inactive: props.inactive ?? renderStage === "server",
    recovering: renderStage !== "client",
  });

  return ["web-widget", attrs, result];
}

export /*#__PURE__*/ async function renderToString(
  loader: Loader,
  options: WebWidgetContainerProps
) {
  const [tag, attrs, children] = await parse(loader, options);

  return `<${tag} ${unsafeAttrsToHtml(attrs)}>${children}</${tag}>`;
}

// TODO export async function renderToReadableStream() {}