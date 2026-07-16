---
'@web-widget/web-router': patch
---

Make Web Router error handling resilient to consumed responses, invalid status
values, circular objects, bigint values, and hostile thrown objects. Isolate
sync and async `onFallback` failures from error-page rendering, and cache
status fallback handlers.
