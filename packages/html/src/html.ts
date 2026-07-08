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
  null | Exclude<Primitive, symbol> | HTML | UnsafeHTML | Fallback;

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

async function* unpackContent(
  content: HTMLContentStatic
): AsyncGenerator<string> {
  const x = await content;
  if (x == null || x === '' || x === false) {
    yield '';
  } else if (x instanceof AbstractHTML) {
    yield* x;
  } else if (isIterable(x)) {
    for (const xi of x) {
      yield* unpackContent(xi);
    }
  } else if (isAsyncIterable(x)) {
    for await (const xi of x) {
      yield* unpackContent(xi);
    }
  } else {
    yield escapeHtml(x as string);
  }
}

async function* unpack(content: HTMLContent): AsyncGenerator<string> {
  try {
    yield* unpackContent(typeof content === 'function' ? content() : content);
  } catch (err) {
    if (err instanceof AbstractHTML) yield* err;
    else throw err;
  }
}

/** Abstract base class for HTML result types (async iterable of strings). */
export abstract class AbstractHTML {
  abstract [Symbol.asyncIterator](): AsyncGenerator<string>;
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

  async *[Symbol.asyncIterator](): AsyncGenerator<string> {
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
      yield* unpack(arg);
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
  async *[Symbol.asyncIterator](): AsyncGenerator<string> {
    yield this.#value;
  }
  toString(): string {
    return this.#value;
  }
  toJSON(): string {
    return this.#value;
  }
}

/** Error boundary: tries `content`, falls back on throw. */
export class Fallback extends AbstractHTML {
  #content: HTMLContent;
  #fallback: HTML | ((e: any) => HTML);

  constructor(content: HTMLContent, fallback: HTML | ((e: any) => HTML)) {
    super();
    this.#content = content;
    this.#fallback = fallback;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<string> {
    try {
      yield* unpack(this.#content);
    } catch (e) {
      yield* typeof this.#fallback === 'function'
        ? this.#fallback(e)
        : this.#fallback;
    }
  }
}

/** Tagged template function. Auto-escapes interpolated values. */
export function html(
  strings: TemplateStringsArray,
  ...args: HTMLContent[]
): HTML;
export function html(strings: TemplateStringsArray, ...args: any[]): HTML;
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
): Fallback;
export function fallback(
  content: any,
  fallback: HTML | ((e: any) => HTML)
): Fallback;
export function fallback(
  content: HTMLContent,
  fallback: HTML | ((e: any) => HTML)
): Fallback {
  return new Fallback(content, fallback);
}
