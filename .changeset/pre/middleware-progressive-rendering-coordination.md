---
'@web-widget/middlewares': minor
'@web-widget/web-router': minor
---

Progressive (streaming) rendering is now coordinated with the cache and etag
middleware so streaming responses are no longer silently buffered.

- Progressive responses are declared non-cacheable via the standard
  `Cache-Control: no-store, no-transform`. `no-transform` prevents
  intermediaries from compressing the body, which would require buffering.
- The `cache` middleware marks such responses as `BYPASS` and never stores them.
- The `etag` middleware skips ETag calculation for non-cacheable responses.
