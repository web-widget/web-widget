import type {
  ServerWidgetModule,
  WidgetModule,
  WidgetRenderContext,
} from "@web-widget/schema";
import { rebaseMeta } from "@web-widget/schema/helpers";

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

type JSONProps = { [x: string]: JSONValue };

const ASSET_PLACEHOLDER = "asset://";
const MODULE_REG =
  /\b(?:import|__vite_ssr_dynamic_import__)\(["']([^"']*)["']\)/;

function getFilename(loader: Loader) {
  const match = String(loader).match(MODULE_REG);
  const id = match?.[1];
  if (!id) {
    throw new Error(`The url for the module was not found: ${loader}`);
  }
  return id;
}

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

function unsafePropsToAttrs(props: any) {
  return Object.entries(props).reduce(
    (attrs, [key, value]) => {
      if (typeof value === "string") {
        attrs[key.toLowerCase()] = value;
      } else if (typeof value === "number") {
        attrs[key.toLowerCase()] = String(value);
      } else if (value === true) {
        attrs[key.toLowerCase()] = "";
      }
      return attrs;
    },
    {} as Record<string, string>
  );
}

export type Loader = () => Promise<WidgetModule>;

export interface RenderOptions {
  base?: string;
  children /**/?: string;
  data?: JSONProps;
  import?: string;
  loading?: string;
  name?: string;
  recovering?: boolean;
  renderTarget?: "light" | "shadow";
}

// export async function renderToReadableStream() {}

export async function renderToJson(
  loader: Loader,
  { children = "", ...props }: RenderOptions
): Promise<[tag: string, attrs: Record<string, string>, children: string]> {
  const module = (await loader()) as ServerWidgetModule;
  const clientImport =
    props.import && !props.import.startsWith(ASSET_PLACEHOLDER)
      ? props.import
      : getFilename(loader);

  if (typeof module.render !== "function") {
    const url = getFilename(loader);
    throw new Error(`The module does not export a 'render' method: ${url}`);
  }

  if (children && props.renderTarget !== "shadow") {
    throw new Error(
      `"options.children" require "options.renderTarget = 'shadow'".`
    );
  }

  const meta = rebaseMeta(module.meta ?? {}, clientImport);
  const context: WidgetRenderContext = {
    // children, /* NOTE: has been consumed.*/
    data: props.data,
    meta,
    module,
  };
  const rawResult = await module.render(context);
  let result = "";

  if (rawResult instanceof ReadableStream) {
    result = await readableStreamToString(rawResult);
  } else if (typeof rawResult === "string") {
    result = rawResult;
  } else {
    const url = getFilename(loader);
    throw new Error(`Render results in an unknown format: ${url}`);
  }

  const attrs = unsafePropsToAttrs({
    ...props,
    data: JSON.stringify(props.data),
    import: clientImport,
  });

  if (props.renderTarget === "shadow") {
    /* @stringify >>> */
    const shimCode = `(${(
      a: (target: Element) => void,
      c = document.currentScript,
      p = c && c.parentElement,
      _ = c && c.remove()
    ) => a && p && a(p)})(window.attachShadowRoots)`.replace(/\s/g, "");
    /* <<< @stringify */

    // NOTE: Declarative Shadow DOM
    // @see https://developer.chrome.com/articles/declarative-shadow-dom/
    result =
      `<template shadowrootmode="open">${result}</template>` +
      children +
      `<script>${shimCode}</script>`;
  }

  return ["web-widget", attrs, result];
}

export async function renderToString(loader: Loader, options: RenderOptions) {
  const [tag, attrs, children] = await renderToJson(loader, options);

  return `<${tag} ${unsafeAttrsToHtml(attrs)}>${children}</tag>`;
}
