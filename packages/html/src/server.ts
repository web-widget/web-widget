import { unsafeHTML, fallback, html, HTML, Fallback } from "@worker-tools/html";
import {
  asyncIterToStream,
  streamToAsyncIter,
} from "whatwg-stream-to-async-iter";
import { defineRender } from "@web-widget/schema/server";

export type * from "@web-widget/schema/server";
export { unsafeHTML, fallback, html, HTML, Fallback };

export const streamToHTML = (stream: ReadableStream<string>) =>
  async function* () {
    // TODO 这样处理流是否正确？
    // @ts-ignore
    for await (const part of stream) {
      yield unsafeHTML(new TextDecoder().decode(part));
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

const supportNonBinaryTransformStreams = async () => {
  try {
    maybeAsyncIterToStream(html`<test />`);
    return true;
  } catch (e) {
    return false;
  }
};

const stringStreamToByteStream: (body: HTML) => ReadableStream<Uint8Array> =
  (await supportNonBinaryTransformStreams())
    ? (body) => {
        const encoder = new TextEncoder();
        return asyncIterToStream(
          aMap(maybeStreamToAsyncIter(body), (x: string) => encoder.encode(x))
        );
      }
    : (body) =>
        maybeAsyncIterToStream(body).pipeThrough(new TextEncoderStream());

export const render = defineRender(async (context, component, props) =>
  stringStreamToByteStream(component(props))
);
