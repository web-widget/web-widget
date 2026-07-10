import type { HTML, UnsafeHTML } from './html';
import { unsafeHTML } from './html';

export type ForAwaitable<T> = Iterable<T> | AsyncIterable<T>;
type ForAwaitableIterator<T> = AsyncIterator<T> | Iterator<T>;
type Awaitable<T> = T | Promise<T>;

const isAsyncIterable = <T>(x: unknown): x is AsyncIterable<T> =>
  x != null && typeof x === 'object' && Symbol.asyncIterator in x;

const isIterable = <T>(x: unknown): x is Iterable<T> =>
  x != null && typeof x === 'object' && Symbol.iterator in x;

const getIterator = <T>(x: unknown): ForAwaitableIterator<T> => {
  if (isAsyncIterable<T>(x)) return x[Symbol.asyncIterator]();
  if (isIterable<T>(x)) return x[Symbol.iterator]();
  throw new TypeError(
    'Not iterable: Neither Symbol.asyncIterator nor Symbol.iterator found.'
  );
};

/**
 * Convert a ReadableStream to an async iterable iterator.
 *
 * Uses `finally` to ensure the reader lock is always released and the stream
 * is cancelled on early termination (e.g. `break` in `for await...of`).
 */
export async function* streamToAsyncIter<T>(
  stream: ReadableStream<T>
): AsyncIterableIterator<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value as T;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Stream may already be errored; ignore.
    }
    reader.releaseLock();
  }
}

/**
 * Convert an async iterable to a ReadableStream using the ReadableStream
 * constructor (pull-based with proper backpressure).
 */
export function asyncIterToStream<T>(
  iterable: ForAwaitable<T>
): ReadableStream<T> {
  let iterator: ForAwaitableIterator<T>;
  return new ReadableStream<T>({
    start() {
      iterator = getIterator(iterable);
    },
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value as T);
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      try {
        await iterator.return?.(reason);
      } catch {
        // Ignore errors during cleanup.
      }
    },
  });
}

const maybeStreamToAsyncIter = <T>(x: ForAwaitable<T> | ReadableStream<T>) =>
  x instanceof ReadableStream ? streamToAsyncIter(x) : x;

async function* aMap<A, B>(
  iterable: ForAwaitable<A>,
  f: (a: A) => Awaitable<B>
): AsyncIterableIterator<B> {
  for await (const x of iterable) yield f(x);
}

/** Converts an HTML template result into a UTF-8 encoded ReadableStream. */
export const HTMLToStream = (html: HTML): ReadableStream => {
  const textEncoder = new TextEncoder();
  return asyncIterToStream(
    aMap(maybeStreamToAsyncIter(html), (x: string) => textEncoder.encode(x))
  );
};

/** Converts a byte stream into an async iterable of UnsafeHTML chunks. */
export const unsafeStreamToHTML = (
  stream: ReadableStream
): AsyncIterableIterator<UnsafeHTML> => {
  const textDecoder = new TextDecoder();
  return aMap(maybeStreamToAsyncIter(stream), (part) =>
    unsafeHTML(textDecoder.decode(part, { stream: true }))
  );
};

/** Converts a byte stream into an async iterable of string chunks. */
export const streamToHTML = (
  stream: ReadableStream
): AsyncIterableIterator<string> => {
  const textDecoder = new TextDecoder();
  return aMap(maybeStreamToAsyncIter(stream), (part) =>
    textDecoder.decode(part, { stream: true })
  );
};
