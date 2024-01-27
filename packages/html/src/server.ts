import { defineRender, getComponentDescriptor } from "@web-widget/helpers";
import type { Fallback, HTML, UnsafeHTML } from "@worker-tools/html";
import { fallback, html, unsafeHTML } from "@worker-tools/html";
import {
  asyncIterToStream,
  streamToAsyncIter,
} from "whatwg-stream-to-async-iter";
import type { DefineHtmlRenderOptions } from "./types";

export * from "@web-widget/helpers";
export * from "./web-widget";
export { fallback, html, unsafeHTML };
export type { Fallback, HTML };

export const unsafeStreamToHTML = (
  stream: ReadableStream
): AsyncIterableIterator<UnsafeHTML> => {
  const textDecoder = new TextDecoder();
  return aMap(maybeStreamToAsyncIter(stream), (part) =>
    unsafeHTML(textDecoder.decode(part, { stream: true }))
  );
};

export const streamToHTML = (
  stream: ReadableStream
): AsyncIterableIterator<string> => {
  const textDecoder = new TextDecoder();
  return aMap(maybeStreamToAsyncIter(stream), (part) =>
    textDecoder.decode(part, { stream: true })
  );
};

export const HTMLToStream = (html: HTML): ReadableStream => {
  if (supportNonBinaryTransformStreamsCache) {
    const textEncoder = new TextEncoder();
    return asyncIterToStream(
      aMap(maybeStreamToAsyncIter(html), (x: string) => textEncoder.encode(x))
    );
  } else {
    return maybeAsyncIterToStream(html).pipeThrough(new TextEncoderStream());
  }
};

type ForAwaitable<T> = Iterable<T> | AsyncIterable<T>;
type Awaitable<T> = T | Promise<T>;

async function* aMap<A, B>(
  iterable: ForAwaitable<A>,
  f: (a: A) => Awaitable<B>
): AsyncIterableIterator<B> {
  for await (const x of iterable) yield f(x);
}

const maybeAsyncIterToStream = <T>(x: ForAwaitable<T> | ReadableStream<T>) =>
  x instanceof ReadableStream ? x : asyncIterToStream(x);

const maybeStreamToAsyncIter = <T>(x: ForAwaitable<T> | ReadableStream<T>) =>
  x instanceof ReadableStream ? streamToAsyncIter(x) : x;

let supportNonBinaryTransformStreamsCache: boolean;
const supportNonBinaryTransformStreams = async () => {
  if (supportNonBinaryTransformStreamsCache) {
    return true;
  }
  try {
    maybeAsyncIterToStream(html`<test />`);
    supportNonBinaryTransformStreamsCache = true;
    return true;
  } catch (e) {
    return false;
  }
};
supportNonBinaryTransformStreams();

export const defineHtmlRender = ({
  onPrefetchData,
}: DefineHtmlRenderOptions = {}) => {
  if (onPrefetchData) {
    throw new Error(`"onPrefetchData" is not supported.`);
  }
  return defineRender(async (context) => {
    const componentDescriptor = getComponentDescriptor(context);
    const { component, props } = componentDescriptor;

    let content: HTML;
    if (
      typeof component === "function" &&
      component.constructor.name === "AsyncFunction"
    ) {
      // experimental
      content = await component(props as any);
    } else {
      content = component(props as any);
    }

    await supportNonBinaryTransformStreams();
    return HTMLToStream(content);
  });
};

export const render = defineHtmlRender();
