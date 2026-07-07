---
'@web-widget/html': minor
---

Internalize the HTML templating and stream conversion utilities previously
provided by `@worker-tools/html` and `whatwg-stream-to-async-iter`.

### Fixes

- **Resource leak on early termination** — `streamToAsyncIter` now uses `finally`
  to always call `reader.cancel()` and `reader.releaseLock()`, so `break` /
  `return` / `throw` in a `for await…of` loop no longer leaks the reader lock
  or leaves the producer unaware that the consumer stopped.
- **Backpressure in TransformStream fallback** — `asyncIterToStream` now
  `await`s `writer.write()`, preventing unbounded memory buffering when the
  producer outpaces the consumer.
- **Correct stream cancellation** — `asyncIterToStream` (ReadableStream variant)
  now calls `iterator.return()` instead of `iterator.throw()` on cancellation,
  matching the WHATWG Streams spec.

### Changes

- `@worker-tools/html` and `whatwg-stream-to-async-iter` are no longer direct
  dependencies of `@web-widget/html`. The `html`, `unsafeHTML`, `fallback`
  APIs and `HTML` / `UnsafeHTML` / `Fallback` types are now self-contained.
