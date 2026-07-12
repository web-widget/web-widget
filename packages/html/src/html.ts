/**
 * HTML tagged template literal with streaming support.
 *
 * Replaces the `@worker-tools/html` dependency. Provides:
 * - `html` tagged template function (auto-escapes interpolations)
 * - `unsafeHTML` for raw unescaped strings
 * - `fallback` for error-boundary style content
 * - `HTML`, `UnsafeHTML`, `Fallback` types (async iterables of strings)
 *
 * The result is an async iterable of string chunks, enabling streaming SSR.
 */

type Primitive = undefined | boolean | number | string | bigint | symbol;
type Callable<T> = T | (() => T);

/** Content that can be recursively unpacked into string chunks. */
export type Unpackable<T> =
  | T
  | Iterable<T>
  | Iterable<Promise<T>>
  | Promise<T>
  | Promise<Iterable<T>>
  | Promise<Iterable<Promise<T>>>
  | AsyncIterable<T>
  | AsyncIterable<Iterable<T>>
  | AsyncIterable<Iterable<Promise<T>>>
  | Promise<AsyncIterable<T>>
  | Promise<AsyncIterable<Iterable<T>>>
  | Promise<AsyncIterable<Iterable<Promise<T>>>>;

export type Renderable =
  null | Exclude<Primitive, symbol> | HTML | UnsafeHTML | Fallback | Suspense;

export type HTMLContentStatic = Unpackable<Renderable>;
export type HTMLContent = Callable<HTMLContentStatic>;

const isIterable = <T>(x: unknown): x is object & Iterable<T> =>
  typeof x === 'object' && x !== null && Symbol.iterator in x;

const isAsyncIterable = <T>(x: unknown): x is object & AsyncIterable<T> =>
  typeof x === 'object' && x !== null && Symbol.asyncIterator in x;

// Based on https://github.com/component/escape-html (MIT)
const MATCH_HTML_REGEXP = /["'&<>]/;

function escapeHtml(string: string): string {
  const str = '' + string;
  const match = MATCH_HTML_REGEXP.exec(str);
  if (!match) return str;

  let html = '';
  let lastIndex = 0;
  let index = match.index;

  for (; index < str.length; index++) {
    let escape: string | undefined;
    switch (str.charCodeAt(index)) {
      case 34:
        escape = '&quot;';
        break; // "
      case 38:
        escape = '&amp;';
        break; // &
      case 39:
        escape = '&#39;';
        break; // '
      case 60:
        escape = '&lt;';
        break; // <
      case 62:
        escape = '&gt;';
        break; // >
      default:
        continue;
    }
    if (lastIndex !== index) html += str.substring(lastIndex, index);
    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}

/** @internal A deferred async content item registered by a Suspense boundary. */
export interface DeferredItem {
  id: number;
  content: HTMLContent;
  errorFallback?: HTML | ((e: any) => HTML);
}

/**
 * @internal Per-renderToStream context (local, not global).
 *
 * Each `renderToStream` call creates its own `RenderContext` and threads it
 * down through the render tree via the `[RENDER]` symbol. This eliminates the
 * module-level global stacks that caused concurrency bugs when multiple
 * `renderToStream` calls interleaved at `await` points.
 */
export interface RenderContext {
  deferreds: DeferredItem[];
  nextId: number;
  /** Error handler stack — pushed by `Fallback`, captured by `Suspense`. */
  errorStack: (HTML | ((e: any) => HTML))[];
}

/** @internal Internal render entry point that accepts a context. */
export const RENDER = Symbol('render');

/** @internal Exported for renderToStream to resolve deferred content. */
export async function* unpack(
  content: HTMLContent,
  ctx?: RenderContext
): AsyncGenerator<string> {
  yield* unpackContent(
    typeof content === 'function' ? content() : content,
    ctx
  );
}

async function* unpackContent(
  content: HTMLContentStatic,
  ctx?: RenderContext
): AsyncGenerator<string> {
  const x = await content;
  if (x == null || x === '' || x === false) {
    yield '';
  } else if (x instanceof AbstractHTML) {
    yield* x[RENDER](ctx);
  } else if (isIterable(x)) {
    for (const xi of x) {
      yield* unpackContent(xi, ctx);
    }
  } else if (isAsyncIterable(x)) {
    for await (const xi of x) {
      yield* unpackContent(xi, ctx);
    }
  } else {
    yield escapeHtml(x as string);
  }
}

/** Abstract base class for HTML result types (async iterable of strings). */
export abstract class AbstractHTML {
  /** Standard async iterator — delegates to `[RENDER]` without a context. */
  [Symbol.asyncIterator](): AsyncGenerator<string> {
    return this[RENDER]();
  }

  /** @internal Render entry point. `ctx` is set only inside `renderToStream`. */
  abstract [RENDER](ctx?: RenderContext): AsyncGenerator<string>;
}

/** Result of `html` tagged template. Interleaves literal strings with escaped interpolations. */
export class HTML extends AbstractHTML {
  #strings: TemplateStringsArray;
  #args: HTMLContent[];

  constructor(strings: TemplateStringsArray, args: HTMLContent[]) {
    super();
    this.#strings = strings;
    this.#args = args;
  }

  async *[RENDER](ctx?: RenderContext): AsyncGenerator<string> {
    const stringsIt = this.#strings[Symbol.iterator]();
    const argsIt = this.#args[Symbol.iterator]();
    while (true) {
      const { done: stringDone, value: string } =
        stringsIt.next() as IteratorYieldResult<string>;
      if (stringDone) break;
      yield string;

      const { done: argDone, value: arg } =
        argsIt.next() as IteratorYieldResult<HTMLContent>;
      if (argDone) break;
      yield* unpack(arg, ctx);
    }
    const { done: stringDone, value: string } =
      stringsIt.next() as IteratorYieldResult<string>;
    if (!stringDone) yield string;
  }
}

/** Wraps a raw string without HTML escaping. */
export class UnsafeHTML extends AbstractHTML {
  #value: string;
  constructor(value: string) {
    super();
    this.#value = value || '';
  }
  async *[RENDER](): AsyncGenerator<string> {
    yield this.#value;
  }
  toString(): string {
    return this.#value;
  }
  toJSON(): string {
    return this.#value;
  }
}

/** Error boundary: tries `content`, falls back on throw.
 *
 * During iteration, pushes its error handler onto the context's error stack
 * (when streaming). Inner `Suspense` boundaries capture this handler so that
 * deferred errors (which occur after Phase 1 iteration) can be handled in
 * Phase 2.
 */
export class Fallback extends AbstractHTML {
  #content: HTMLContent;
  #fallback: HTML | ((e: any) => HTML);

  constructor(content: HTMLContent, fallback: HTML | ((e: any) => HTML)) {
    super();
    this.#content = content;
    this.#fallback = fallback;
  }

  async *[RENDER](ctx?: RenderContext): AsyncGenerator<string> {
    if (ctx) ctx.errorStack.push(this.#fallback);
    try {
      yield* unpack(this.#content, ctx);
    } catch (e) {
      yield* typeof this.#fallback === 'function'
        ? this.#fallback(e)
        : this.#fallback;
    } finally {
      if (ctx) ctx.errorStack.pop();
    }
  }
}

/** Tagged template function. Auto-escapes interpolated values. */
export function html(
  strings: TemplateStringsArray,
  ...args: HTMLContent[]
): HTML {
  return new HTML(strings, args);
}

/** Wraps a raw string without HTML escaping. */
export function unsafeHTML(content: string): UnsafeHTML {
  return new UnsafeHTML(content);
}

/** Creates an error boundary. On throw, renders `fallback` instead. */
export function fallback(
  content: HTMLContent,
  fallback: HTML | ((e: any) => HTML)
): Fallback {
  return new Fallback(content, fallback);
}

/**
 * Suspense boundary for progressive rendering.
 *
 * In streaming mode (inside `renderToStream`): immediately outputs `pending`
 * content wrapped in boundary markers, defers the async content to be
 * streamed (and swapped via `$HRC` script) when ready.
 *
 * In passthrough mode (direct `for await...of`): blocks until content
 * resolves; on error, defers to the nearest enclosing `fallback()` boundary.
 *
 * For error recovery, compose with `fallback()`:
 * ```ts
 * fallback(suspense(content, pendingUI), errorUI)
 * ```
 * The `fallback()` boundary's error handler is captured at registration time
 * and applied to deferred errors in Phase 2.
 */
export class Suspense extends AbstractHTML {
  #content: HTMLContent;
  #pending: HTML;

  constructor(content: HTMLContent, pending: HTML) {
    super();
    this.#content = content;
    this.#pending = pending;
  }

  async *[RENDER](ctx?: RenderContext): AsyncGenerator<string> {
    if (!ctx) {
      // Passthrough mode: block on content.
      // Errors propagate to enclosing fallback() boundary (if any).
      yield* unpack(this.#content);
      return;
    }
    // Streaming mode: output pending + markers, register deferred.
    // Capture nearest error handler from the context's error stack.
    const id = ctx.nextId++;
    ctx.deferreds.push({
      id,
      content: this.#content,
      errorFallback: ctx.errorStack[ctx.errorStack.length - 1],
    });
    yield `<!--$H?--><template id="HB:${id}"></template>`;
    yield* this.#pending[RENDER](ctx);
    yield `<!--/$H-->`;
  }
}

/** Creates a Suspense boundary for progressive rendering. */
export function suspense(content: HTMLContent, pending: HTML): Suspense {
  return new Suspense(content, pending);
}
