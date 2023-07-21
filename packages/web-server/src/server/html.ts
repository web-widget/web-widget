import { unsafeHTML, fallback, html, HTML, Fallback } from "@worker-tools/html";
import {
  asyncIterToStream,
  streamToAsyncIter,
} from "whatwg-stream-to-async-iter";
import {
  ComponentProps,
  ErrorComponentProps,
  Handlers,
  Meta,
  RenderContext,
  RenderResult,
  UnknownComponentProps,
} from "./types";

export type { ComponentProps, Handlers, Meta };
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
    await maybeAsyncIterToStream(html`<test />`);
    return true;
  } catch (e) {
    return false;
  }
};

export const stringStreamToByteStream: (
  body: HTML
) => ReadableStream<Uint8Array> = (await supportNonBinaryTransformStreams())
  ? (body) => {
      const encoder = new TextEncoder();
      return asyncIterToStream(
        aMap(maybeStreamToAsyncIter(body), (x: string) => encoder.encode(x))
      );
    }
  : (body) => maybeAsyncIterToStream(body).pipeThrough(new TextEncoderStream());

export async function render(
  opts: RenderContext<unknown>
): Promise<RenderResult> {
  if (opts.component === undefined) {
    throw new Error("This page does not have a component to render.");
  }

  if (
    typeof opts.component === "function" &&
    opts.component.constructor.name === "AsyncFunction"
  ) {
    throw new Error("Async components are not supported.");
  }

  if (Reflect.has(opts, "container") || Reflect.has(opts, "recovering")) {
    throw new Error("Client rendering is not supported.");
  }

  const isWidget = !opts.url;
  const props = isWidget
    ? opts.data
    : ({
        data: opts.data,
        error: opts.error,
        params: opts.params,
        route: opts.route,
        url: opts.url,
      } as ComponentProps<any> | UnknownComponentProps | ErrorComponentProps);

  return stringStreamToByteStream(opts.component(props));
}
