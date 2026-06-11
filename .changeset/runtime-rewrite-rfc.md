---
'@web-widget/web-router': minor
'@web-widget/helpers': patch
'@web-widget/schema': patch
---

Implement runtime internal URL rewrite per RFC: `return context.rewrite(input, init?)` returns the target handler stack `Response`, keeps `originalRequest` as the client request, and maintains a readonly internal `request` for routing. Application normalizes `HEAD` to an internal `GET` and strips response bodies at the exit. ModuleRuntime owns route activation state and invalidates it when rewrite changes the internal path. Helpers `compose` replaces `wrapNext` with `wrapAdvance`; `methodsToHandler` no longer synthesizes `HEAD` handlers (framework entry handles `HEAD`).
