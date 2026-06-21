---
'@web-widget/node': patch
'@web-widget/vite-plugin': patch
---

Fix HTTP/2 HEAD request handling in Node adapter and Vite dev middleware.

- Detect Http2ServerResponse via `stream` when `httpVersionMajor` is missing
- Skip writing `statusMessage` on HTTP/2 responses
- Avoid calling Connect `next()` after the response has already been sent
- Skip `transformIndexHtml` for HEAD requests in dev middleware
