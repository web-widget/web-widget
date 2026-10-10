---
'@web-widget/react': minor
'@web-widget/html': minor
'@web-widget/vue': minor
---

Streaming SSR now surfaces shell-level errors so the framework can return a
500 response, matching React's `renderToReadableStream` semantics.

Previously, shell errors during streaming were silently swallowed — the
response started with status 200, leaving the client with a broken page.

- **React**: removed the `RouteErrorBoundary` wrapper that intercepted shell
  errors; `renderToReadableStream` now rejects on shell failure, enabling the
  framework's 500 error page.
- **HTML**: `renderToStream` now returns a `Promise<ReadableStream>` instead
  of a `ReadableStream`. The shell (everything before deferred content) is
  buffered; if it throws, the promise rejects. Deferred errors inside
  `suspense()` remain recoverable via `fallback()`.
- **Vue**: `renderToWebStream` errors are now detected before the response is
  sent, by consuming the first stream chunk to flush Vue's async rendering
  pipeline.
