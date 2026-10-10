---
'@web-widget/node': patch
'@web-widget/vite-plugin': patch
---

Fix HTTP/2 HEAD request handling in Node adapter and Vite dev middleware.

### Fixes

- **Correct HTTP/2 response detection** — detect `Http2ServerResponse` via `stream` when `httpVersionMajor` is missing, and skip writing `statusMessage` on HTTP/2 responses.
- **No duplicate middleware calls** — avoid calling Connect `next()` after the response has already been sent.
- **HEAD requests in dev** — skip `transformIndexHtml` for HEAD requests in dev middleware.
