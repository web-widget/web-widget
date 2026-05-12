---
'@web-widget/web-router': patch
---

When a thrown `Response` has JSON with a non-empty `stack` string, propagate it onto the normalized HTTP error so `onError` handlers can display server stacks.

Update the built-in fallback error page CSS to use `100dvh` and column flex alignment for more reliable vertical centering across viewports.
