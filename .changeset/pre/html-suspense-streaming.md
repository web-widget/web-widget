---
'@web-widget/html': minor
---

Add Suspense streaming for HTML templates. Async content now streams
progressively — placeholders are replaced in-place when promises resolve,
without blocking the rest of the page.

- New `suspense(content, fallback, errorFallback?)` template function
- `renderToStream` extended with Suspense boundary support
- `render` respects the `progressive` option: streaming (Suspense active)
  when `true`, buffered string output when `false`
- `container()` auto-wraps with `suspense()` when `fallback`
  is provided
- Streaming protocol uses `$H` prefix (`$HRC`, `HS:0`, `HB:0`) to avoid
  conflicts with React's `$RC` — both can coexist on the same page
