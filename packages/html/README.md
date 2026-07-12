# @web-widget/html

HTML templating and streaming adapter for `@web-widget`.

## HTML Templating

Templating is done purely in JavaScript using tagged template strings, inspired by [hyperHTML](https://github.com/WebReflection/hyperhtml) and [lit-html](https://github.com/polymer/lit-html).

This library uses tagged template strings to create _streaming response bodies_ on the fly, using no special template syntax and giving you the full power of JS for composition.

### Examples

String interpolation works just like regular template strings, but all content is sanitized by default:

```ts
import { html } from '@web-widget/html';

const helloWorld = 'Hello World!';
const h1El = html`<h1>${helloWorld}</h1>`;
```

What is known as "partials" in string-based templating libraries are just functions here:

```ts
const timeEl = (ts = new Date()) => html`
  <time datetime="${ts.toISOString()}">${ts.toLocaleString()}</time>
`;
```

What is known as "layouts" are just functions as well:

```ts
import type { HTMLContent } from '@web-widget/html';

const baseLayout = (title: string, content: HTMLContent) => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
    </head>
    <body>
      ${content}
    </body>
  </html>
`;
```

Layouts can "inherit" from each other, again using just functions:

```ts
const pageLayout = (title: string, content: HTMLContent) =>
  baseLayout(
    title,
    html`
      <main>
        ${content}
        <footer>Powered by @web-widget/html</footer>
      </main>
    `
  );
```

Many more features of string-based templating libraries can be replicated using functions. Most satisfying should be the use of `map` to replace a whole host of custom looping syntax:

```ts
html`<ul>
  ${['Foo', 'Bar', 'Baz'].map((x) => html`<li>${x}</li>`)}
</ul>`;
```

### Streaming

As a side effect of this approach, results are async iterables by default. This means you can use async data, without delaying sending the headers and HTML content.

In the example below, everything up to and including `<p>The current time is` will be sent immediately, with the rest sent after the API request completes:

```ts
function handleRequest() {
  // NOTE: No `await` here!
  const timeElPromise = fetch('https://time.api/now')
    .then((r) => r.text())
    .then((t) => timeEl(new Date(t)));

  return new Response(
    renderToStream(
      pageLayout(
        'Hello World!',
        html`
          <h1>Hello World!</h1>
          <p>The current time is ${timeElPromise}.</p>
        `
      )
    )
  );
}
```

While there's ways around the lack of async/await in the above example (namely IIAFEs), `@web-widget/html` supports passing async functions as html content directly:

```ts
function handleRequest() {
  return new Response(
    renderToStream(
      pageLayout(
        'Hello World!',
        html`
          <h1>Hello World!</h1>
          ${async () => {
            const timeStamp = new Date(
              await fetch('https://time.api/now').then((r) => r.text())
            );
            return html`<p>The current time is ${timeEl(timeStamp)}.</p>`;
          }}
        `
      )
    )
  );
}
```

### Unsafe HTML

By default, all interpolated values are HTML-escaped. Use `unsafeHTML` to insert raw HTML without escaping:

```ts
import { unsafeHTML } from '@web-widget/html';

const rawHtml = '<div></div>';
const result = html`<div>${unsafeHTML(rawHtml)}</div>`;
// => '<div><div></div></div>'
```

### Fallback / Error Boundaries

Use `fallback` to catch errors during rendering and provide alternative content:

```ts
import { fallback } from '@web-widget/html';

const result = html`<div>
  ${fallback(
    html`<main>
      ${() => {
        throw Error('foo');
      }}
    </main>`,
    (e) => html`<span>An error occurred: ${e.message}</span>`
  )}
</div>`;
```

The `fallback` function accepts either a static `HTML` fallback or a function that receives the error and returns an `HTML`.

### Suspense / Progressive Rendering

Use `suspense` for progressive rendering — a placeholder is sent immediately, and the real content replaces it when ready, without blocking subsequent content:

```ts
import { suspense, fallback } from '@web-widget/html';

const result = html`<div>
  <h1>Dashboard</h1>
  ${fallback(
    suspense(fetchUserData(), html`<div>Loading...</div>`),
    html`<div>Failed to load</div>`
  )}
  <p>This renders immediately.</p>
</div>`;
```

`suspense` and `fallback` follow React's separation of concerns: `suspense(content, pending)` handles pending → ready, while `fallback(content, errorFn)` handles error → error UI. Combine them freely: `fallback(suspense(content, pending), errorFn)`.

### Directives

`@web-widget/html` provides lit-html compatible directive functions. They are stateless value transformers — no framework runtime required:

```ts
import {
  html,
  classMap,
  styleMap,
  ifDefined,
  when,
  join,
} from '@web-widget/html';

const result = html`<div>
  <span
    class="${classMap({ active: true, disabled: false })}"
    style="${styleMap({ color: 'red', fontSize: '14px' })}">
    Active
  </span>
  <a href="${ifDefined(user.url)}">Profile</a>
  ${when(isAdmin, html`<button>Admin Panel</button>`)}
  <ul>
    ${join(
    items.map((i) => html`<li>${i}</li>`),
    html`<hr />`
  )}
  </ul>
</div>`;
```

| Directive           | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `classMap(classes)` | Joins truthy class names into a space-separated string                         |
| `styleMap(styles)`  | Converts a style object to CSS text (camelCase → kebab-case, skips null/empty) |
| `ifDefined(value)`  | Returns empty string for `undefined` — useful for optional attributes          |
| `when(cond, a, b?)` | Renders `a` when truthy, `b` (or nothing) when falsy                           |
| `join(items, sep)`  | Renders an iterable with a separator between each pair                         |

All directives compose with streaming rendering, `fallback`, and `suspense`.

## API

### `html(strings, ...args): HTML`

Tagged template function. Creates an `HTML` instance that auto-escapes interpolated values.

### `unsafeHTML(content: string): UnsafeHTML`

Wraps a raw string without HTML escaping.

### `fallback(content, fallback): Fallback`

Creates an error boundary. On throw, renders `fallback` instead. Accepts either a static `HTML` or a function `(e) => HTML`.

### `suspense(content, pending): Suspense`

Creates a streaming boundary for progressive rendering. Sends `pending` immediately; replaces with real content when `content` resolves.

### `classMap(classes): string`

Converts an object of class names to a space-separated string, including only truthy values.

### `styleMap(styles): string`

Converts an object of CSS properties to a style string. CamelCase keys are converted to kebab-case.

### `ifDefined(value): string`

Returns the value if defined, otherwise empty string.

### `when(condition, trueCase, falseCase?): HTMLContent`

Renders `trueCase` when condition is truthy, otherwise `falseCase` (or nothing).

### `join(items, separator): HTMLContent`

Joins an iterable of items with a separator between each pair.

### `HTML`

An async iterable of string chunks. Interleaves literal strings with escaped interpolations. Supports nested `HTML`, promises, async iterables, arrays, and functions.

### `renderToStream(html: HTML): ReadableStream`

Converts an `HTML` instance to a `ReadableStream<Uint8Array>` for HTTP responses.

### `renderToString(html: HTML): Promise<string>`

Converts an `HTML` instance to a complete string.

### `streamToHTML(stream: ReadableStream): AsyncIterableIterator<string>`

Converts a `ReadableStream` to an async iterable of strings.

### `unsafeStreamToHTML(stream: ReadableStream): AsyncIterableIterator<UnsafeHTML>`

Converts a `ReadableStream` to an async iterable of `UnsafeHTML` chunks.

## Tooling

Since the use of tagged string literals for HTML is not new (see hyperHTML, lit-html), there exists tooling for syntax highlighting, such as [lit-html in VSCode](https://marketplace.visualstudio.com/items?itemName=bierner.lit-html).
