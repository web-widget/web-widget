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

## Differences from lit-html

This library targets **server-side rendering** and aims to be a **subset of lit-html's template syntax** — not a full runtime replacement. The `html` tagged template call signature, auto-escaping, nested templates, and array spreading are compatible. The differences below stem from the server-only, string-based streaming model.

### Not supported (client-only features)

These lit-html features are intentionally omitted because they require a live DOM and a reactive update cycle, which do not exist on the server:

- Event binding: `@click=${handler}`
- Property binding: `.value=${v}`
- Boolean attribute binding: `?hidden=${bool}`
- Reactive update / diffing: `render(result, container)` re-renders on state change
- Stateful directives: `repeat`, `cache`, `guard`, `keyed`

### `ifDefined` — attribute is not removed

In lit-html, `ifDefined(undefined)` **removes the entire attribute**. Here the attribute is left as an empty string, because the static `attr="` fragment is already part of the template literal and cannot be retroactively removed:

```ts
html`<a href="${ifDefined(url)}">link</a>`;
// url === 'https://a.com'  =>  <a href="https://a.com">link</a>   (same as lit-html)
// url === undefined        =>  <a href="">link</a>                 (lit-html: <a>link</a>)
```

> Note: an empty `href` resolves to the current page URL in browsers. If you need to conditionally omit an attribute, branch the template with `when()` instead.

### Directives are pure functions (not interchangeable)

`classMap`, `styleMap`, `ifDefined`, `when`, and `join` are **stateless value transformers** that return plain strings or `HTMLContent`. They do not extend lit-html's `Directive` class, so directives from `lit-html`/`lit` cannot be used here, and vice versa.

### Superset: async values as first-class interpolations

lit-html requires directives to handle async content. Here, Promises, async iterables, and async generators can be interpolated directly:

```ts
html`<p>${fetch('/api').then((r) => r.text())}</p>`;
```

| This library                         | lit-html equivalent                        |
| ------------------------------------ | ------------------------------------------ |
| `${promise}` (blocks until resolved) | `until(promise, ...)`                      |
| `${asyncIterable}`                   | `asyncReplace(iter)` / `asyncAppend(iter)` |
| `suspense(content, pending)`         | `until(content, pending)`                  |

### Superset: function interpolation (no lit-html equivalent)

A function passed as an interpolation is invoked lazily during rendering. This has no lit-html counterpart — in lit-html a function value is coerced to a string. It exists here so that errors thrown inside the function body are caught by the enclosing `fallback()` boundary, and so async work inside the function runs within the render stream:

```ts
html`<div>
  ${() => {
    if (!user) throw new Error('no user');
    return html`<span>${user.name}</span>`;
  }}
</div>`;
```

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
