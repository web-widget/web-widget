import type { Fallback, HTML } from "@worker-tools/html";
import {
  asyncIterToStream,
  streamToAsyncIter,
} from "whatwg-stream-to-async-iter";
import { defineRender, isRouteRenderContext } from "@web-widget/schema/server";
import { fallback, html, unsafeHTML } from "@worker-tools/html";

export * from "@web-widget/schema/server";
export { unsafeHTML, fallback, html };
export type { HTML, Fallback };

export const streamToHTML = (stream: ReadableStream<string>) =>
  async function* () {
    const textDecoder = new TextDecoder();
    // TODO 这样处理流是否正确？
    // @ts-ignore
    for await (const part of stream) {
      yield unsafeHTML(textDecoder.decode(part));
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

  // stringStreamToByteStream
  return (await supportNonBinaryTransformStreams())
    ? asyncIterToStream(
        aMap(maybeStreamToAsyncIter(content), (x: string) =>
          new TextEncoder().encode(x)
        )
      )
    : maybeAsyncIterToStream(content).pipeThrough(new TextEncoderStream());
});
