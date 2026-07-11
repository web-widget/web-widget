---
'@web-widget/html': minor
---

Implement WebWidgetAdapter protocol for @web-widget/html. HTML route files
using `.html.ts` extension now get automatic `render` injection and widget
`container` wrapping — no more manual `export { render }`.

- Add `webWidget` field with `.html.ts` extension and `./runtime` subpath
- `exportRenderPlugin` auto-injects `render` into `@route.html.ts` / `@widget.html.ts`
- `importRenderPlugin` auto-wraps widget imports via `container()`
- `deriveExports` provides default `handler` and `meta` (same as Vue adapter)
