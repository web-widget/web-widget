---
'@web-widget/web-router': major
'@web-widget/schema': major
---

The first parameter of `RouteContext['render']` is changed to `Data`.

Remove deprecated interfaces: `RouteContext['pathname']`、`RouteContext['name']`、 `RouteContext['renderOptions']`.

Added `RouteContext['config']` type.
