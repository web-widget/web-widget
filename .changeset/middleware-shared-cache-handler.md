---
'@web-widget/middlewares': minor
'@web-widget/web-router': patch
---

Upgrade to `@web-widget/shared-cache` 2.x and adopt `createCacheHandler` for cache middleware origin resolution. Server errors during cache miss propagate to the router error handler; errors during background revalidation return 5xx responses. Remove the `x-transform-error` workaround from web-router.
