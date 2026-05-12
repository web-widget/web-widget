---
'@web-widget/middlewares': patch
'@web-widget/node': patch
---

Harden error handling so SSR / Vite dev is less likely to exit on business errors:

- Cache middleware: wrap `errorToResponse` in a safe fallback, and add a final `.catch` on the `next()` promise chain in `nextToFetch` to avoid unhandled promise rejections.
- Node adapter: wrap the Connect middleware handler in `try/catch` with a minimal 500 response when headers are not sent; attach `.catch` to handler/`toServerResponse` promises in `buildToNodeHandler`.
