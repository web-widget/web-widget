---
'@web-widget/web-router': patch
---

Re-enter request async context (`callContext`) when handling errors in `Application.handler`, so `onError` and custom fallback rendering can use `context()` and other ALS-backed APIs after a thrown error.

Fixes [#716](https://github.com/web-widget/web-widget/issues/716).
