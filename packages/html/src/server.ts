import type { Fallback, HTML, UnsafeHTML } from "@worker-tools/html";
import {
  asyncIterToStream,
  streamToAsyncIter,
} from "whatwg-stream-to-async-iter";
import {
  defineRender,
  isRouteRenderContext,
} from "@web-widget/schema/server-helpers";
import { fallback, html, unsafeHTML } from "@worker-tools/html";

export * from "@web-widget/schema/server-helpers";
export * from "./web-widget";
export { unsafeHTML, fallback, html };
export type { HTML, Fallback };

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

export const render = defineRender(async (context, component, props) => {
  let content: HTML;
  if (
    typeof component === "function" &&
    component.constructor.name === "AsyncFunction"
  ) {
    if (isRouteRenderContext(context)) {
      // experimental
      content = await component(props);
    } else {
      throw new Error("Async widget components are not supported.");
    }
  } else {
    content = component(props);
  }

  await supportNonBinaryTransformStreams();
  return HTMLToStream(content);
});
