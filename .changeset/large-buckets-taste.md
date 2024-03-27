---
'@web-widget/middlewares': patch
---

- `cache`: Add powerful cache control features.
- Use seconds as the unit, consistent with the HTTP specification.
- `setCachedHeader` renamed to `setCacheControlHeader`.
- The status codes that allow caching are changed to: 200, 206, 301, 302, 303, 404 and 410.
