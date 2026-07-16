---
'@web-widget/web-router': patch
---

Make Web Router error handling resilient to consumed responses, invalid status
values, circular objects, bigint values, and hostile thrown objects. Isolate
sync and async `onFallback` failures from error-page rendering, and cache
status fallback handlers. Isolate route render caches between router runtime
instances, and load shared async route modules once with retryable failures.
Split module activation, handler normalization, loading, and rendering into
focused runtime internals.
