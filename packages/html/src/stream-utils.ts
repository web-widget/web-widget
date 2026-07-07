/**
 * Utilities for converting between ReadableStream and async iterables.
 *
 * Replaces the `whatwg-stream-to-async-iter` dependency to fix:
 * - Resource leak: reader lock not released on early termination (break/return/throw)
 * - Resource leak: stream not cancelled when consumer stops early
 * - No backpressure in TransformStream fallback (unbounded memory buffering)
 * - Wrong cancellation method: used iterator.throw() instead of iterator.return()
 */

type ForAwaitable<T> = Iterable<T> | AsyncIterable<T>;
type ForAwaitableIterator<T> = AsyncIterator<T> | Iterator<T>;

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
    // Cancel the stream to signal the producer to stop on early termination.
    // On normal completion the stream is already closed (no-op).
    // On error the stream is errored (cancel rejects — hence the catch).
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
function asyncIterToStreamRS<T>(iterable: ForAwaitable<T>): ReadableStream<T> {
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
      // Use return() (not throw()) to signal normal completion per WHATWG spec.
      try {
        await iterator.return?.(reason);
      } catch {
        // Ignore errors during cleanup.
      }
    },
  });
}

/**
 * Fallback for environments without ReadableStream constructor support.
 * Uses TransformStream instead. Properly awaits writes for backpressure.
 */
function asyncIterToStreamTS<T>(iterable: ForAwaitable<T>): ReadableStream<T> {
  const { readable, writable } = new TransformStream<T, T>();
  (async () => {
    const writer = writable.getWriter();
    try {
      for await (const x of iterable) {
        await writer.write(x); // Await for backpressure
      }
      await writer.close();
    } catch (err) {
      try {
        await writer.abort(err);
      } catch {
        // Stream may already be errored; ignore.
      }
    }
  })();
  return readable;
}

const supportsReadableStreamConstructor = (() => {
  try {
    return !!new ReadableStream({});
  } catch {
    return false;
  }
})();

export const asyncIterToStream: <T>(
  iterable: ForAwaitable<T>
) => ReadableStream<T> = supportsReadableStreamConstructor
  ? asyncIterToStreamRS
  : asyncIterToStreamTS;
