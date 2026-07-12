import type { HTML, UnsafeHTML, HTMLContent } from './html';
import { unsafeHTML, unpack, RENDER } from './html';
import type { RenderContext } from './html';

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

/** Converts a byte or string stream into an async iterable of UnsafeHTML chunks. */
export const unsafeStreamToHTML = (
  stream: ReadableStream
): AsyncIterableIterator<UnsafeHTML> => {
  const textDecoder = new TextDecoder();
  return aMap(maybeStreamToAsyncIter(stream), (part) =>
    unsafeHTML(
      typeof part === 'string'
        ? part
        : textDecoder.decode(part, { stream: true })
    )
  );
};

/** Converts a byte or string stream into an async iterable of string chunks. */
export const streamToHTML = (
  stream: ReadableStream
): AsyncIterableIterator<string> => {
  const textDecoder = new TextDecoder();
  return aMap(maybeStreamToAsyncIter(stream), (part) =>
    typeof part === 'string' ? part : textDecoder.decode(part, { stream: true })
  );
};

// ---------------------------------------------------------------------------
// Progressive rendering (Suspense)
// ---------------------------------------------------------------------------

/**
 * AsyncQueue: bridges concurrent producers with a sequential consumer.
 *
 * - `push(item)`: delivers to a waiting consumer, or enqueues.
 * - `get()`: returns queued item, or waits for next push.
 * - `done()`: signals completion; pending `get()` calls resolve to `undefined`.
 */
class AsyncQueue<T> {
  #items: T[] = [];
  #waiters: ((item: T | undefined) => void)[] = [];
  #done = false;

  push(item: T): void {
    if (this.#done) return;
    const waiter = this.#waiters.shift();
    if (waiter) {
      waiter(item);
    } else {
      this.#items.push(item);
    }
  }

  async get(): Promise<T | undefined> {
    if (this.#items.length > 0) {
      return this.#items.shift()!;
    }
    if (this.#done) {
      return undefined;
    }
    return new Promise<T | undefined>((resolve) => {
      this.#waiters.push(resolve);
    });
  }

  done(): void {
    this.#done = true;
    while (this.#waiters.length > 0) {
      this.#waiters.shift()!(undefined);
    }
  }
}

/**
 * `$HRC` (HTML Replace Content) client script.
 *
 * Injected once per stream when deferred content exists. Batches multiple
 * Suspense swaps into a single requestAnimationFrame to avoid redundant
 * reflows, and marks boundaries as `$H~` (scheduled) to prevent re-entry.
 */
const HRC_SOURCE = [
  '(function(){',
  // Batch buffer: pairs of [sourceId, boundaryId]
  'var b=[],s=!1;',
  // Flush: process all pending swaps in one DOM pass
  'function flush(){',
  's=!1;',
  'for(var i=0;i<b.length;i+=2){',
  // Lookup hidden source container and boundary template
  'var c=b[i],e=b[i+1],',
  'src=document.getElementById("HS:"+c),',
  'dst=document.getElementById("HB:"+e);',
  'if(!src||!dst)continue;',
  // Walk to boundary start marker <!--$H?--> or <!--$H~-->
  'var p=dst.parentNode,start=dst;',
  'while(start=start.previousSibling){',
  'if(start.nodeType===8&&(start.nodeValue==="$H?"||start.nodeValue==="$H~"))break',
  '}',
  // Walk to boundary end marker <!--/$H-->
  'var end=dst;',
  'while(end=end.nextSibling){',
  'if(end.nodeType===8&&end.nodeValue==="/$H")break',
  '}',
  'if(!start||!end)continue;',
  // Mark as scheduled to prevent re-entry
  'start.nodeValue="$H~";',
  // Remove fallback nodes between markers
  'var n=start.nextSibling;',
  'while(n&&n!==end){var nx=n.nextSibling;p.removeChild(n);n=nx}',
  // Move real content into place
  'while(src.firstChild){p.insertBefore(src.firstChild,end)}',
  // Clean up markers
  'src.remove();start.nodeValue="$H";end.remove()',
  '}',
  'b.length=0',
  '}',
  // Public API: queue a swap, schedule flush via rAF
  'window.$HRC=function(c,e){',
  'b.push(c,e);',
  'if(!s){s=!0;requestAnimationFrame(flush)}',
  '}})()',
].join('');

const RC_SCRIPT = `<script id="$HRC">${HRC_SOURCE}</script>`;

/**
 * Collects a deferred's resolved content into a single swap chunk.
 *
 * Wraps the content in a hidden `<div>` and appends the `$HRC` swap script
 * so the browser replaces the pending placeholder in-place.
 */
async function collectDeferred(
  id: number,
  content: HTMLContent,
  ctx: RenderContext
): Promise<string> {
  const chunks = [`<div hidden id="HS:${id}">`];
  for await (const chunk of unpack(content, ctx)) {
    chunks.push(chunk);
  }
  chunks.push(`</div><script>$HRC("${id}","${id}")</script>`);
  return chunks.join('');
}

/**
 * Drains deferreds (async content swapped via `$HRC` script).
 *
 * Resolves all deferreds concurrently, outputting each result atomically
 * in completion order. Supports nested Suspense (deferreds may register
 * more deferreds).
 */
async function* drainDeferreds(
  ctx: RenderContext,
  textEncoder: TextEncoder
): AsyncGenerator<Uint8Array> {
  let hasDeferred = false;
  while (ctx.deferreds.length > 0) {
    if (!hasDeferred) {
      hasDeferred = true;
      yield textEncoder.encode(RC_SCRIPT);
    }

    const batch = ctx.deferreds.splice(0);

    const queue = new AsyncQueue<Uint8Array>();

    const pending = batch.map(async ({ id, content: dc, errorFallback }) => {
      try {
        const out = await collectDeferred(id, dc, ctx);
        queue.push(textEncoder.encode(out));
      } catch (e) {
        // If an error fallback is provided, swap fallback → error UI.
        // Otherwise, skip swap — fallback remains visible.
        if (!errorFallback) return;
        const errorHtml =
          typeof errorFallback === 'function'
            ? errorFallback(e)
            : errorFallback;
        const out = await collectDeferred(id, errorHtml, ctx);
        queue.push(textEncoder.encode(out));
      }
    });

    Promise.all(pending)
      .then(() => queue.done())
      .catch(() => queue.done());

    while (true) {
      const item = await queue.get();
      if (item === undefined) break;
      yield item;
    }
  }
}

/**
 * Converts an HTML template result into a UTF-8 encoded ReadableStream.
 *
 * Supports Suspense progressive rendering: when the template contains
 * boundaries, fallback content is sent immediately and async content is
 * streamed (and swapped via `$HRC` script) when ready.
 *
 * To detect shell errors (enabling 500 responses), the first chunk is
 * consumed before the stream is returned. If the template throws before
 * producing any output, the returned Promise rejects — mirroring React's
 * `renderToReadableStream` shell error semantics. Subsequent content
 * (including nested streams and deferreds) is streamed progressively.
 */
export async function renderToStream(html: HTML): Promise<ReadableStream> {
  const ctx: RenderContext = { deferreds: [], nextId: 0, errorStack: [] };
  const textEncoder = new TextEncoder();

  const iterator = html[RENDER](ctx)[Symbol.asyncIterator]();

  // Consume chunks until we get a non-empty one (or the iterator completes).
  // If the template throws before producing any output, reject — this is
  // the shell error detection. Empty chunks (e.g. leading empty strings in
  // the template) are buffered but don't count as "output".
  const buffered: string[] = [];
  let firstResult: IteratorResult<string>;
  while (true) {
    firstResult = await iterator.next();
    if (firstResult.done) break;
    buffered.push(firstResult.value);
    if (firstResult.value !== '') break;
  }

  async function* generate(): AsyncGenerator<Uint8Array> {
    try {
      for (const chunk of buffered) {
        yield textEncoder.encode(chunk);
      }

      while (!firstResult.done) {
        const { value, done } = await iterator.next();
        if (done) break;
        yield textEncoder.encode(value);
      }

      yield* drainDeferreds(ctx, textEncoder);
    } finally {
      // Close the render iterator on early termination (e.g. stream cancel)
      // so any cleanup in the generator runs promptly.
      await iterator.return(undefined);
    }
  }

  return asyncIterToStream(generate());
}

/**
 * Fully renders an HTML template to a string (no streaming).
 *
 * Suspense boundaries block until resolved (passthrough mode).
 */
export async function renderToString(html: HTML): Promise<string> {
  let result = '';
  for await (const chunk of html) {
    result += chunk;
  }
  return result;
}
