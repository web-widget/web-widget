---
'@web-widget/web-router': minor
'@web-widget/schema': patch
---

Add runtime internal URL rewrite ([RFC](https://github.com/web-widget/web-widget/blob/main/rfcs/rewrite.zh.md)):

- `context.rewrite(input, init?)` — switch the internal route within the same HTTP request; the browser URL is unchanged
- `context.originalRequest` — client request; `context.request` — readonly view used for routing
- Global `*` middleware runs once per request; rewrite loops respond with HTTP 508
- `HEAD` is normalized at the framework entry and returns an empty body

`@web-widget/schema`: `rewrite()` and `originalRequest` on `FetchContext`.
