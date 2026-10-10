---
'@web-widget/middlewares': minor
'@web-widget/web-router': patch
---

Upgrade to `@web-widget/shared-cache` 2.x and adopt `createCacheHandler` for cache middleware origin resolution.

### Fixes

- **Better error propagation** — server errors during cache miss now propagate to the router error handler; errors during background revalidation return 5xx responses instead of being swallowed.
- **Cleaner internals** — removed the `x-transform-error` workaround from web-router.
