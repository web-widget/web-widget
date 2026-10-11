---
'@web-widget/web-widget': patch
---

Improve Widget loading reliability by cleaning up lazy visibility placeholders,
rescheduling deferred strategies when their source or inactive state changes,
and falling back to `auto` for invalid loading attributes. Auto loading now also
prioritizes pointer-down interactions, while idle loading uses a bounded wait.
