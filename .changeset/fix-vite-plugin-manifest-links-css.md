---
'@web-widget/vite-plugin': patch
---

Fix `getLinks` dropping widget CSS when the client manifest reaches a `@widget` chunk through static `imports` first (for example a bridge chunk that `dynamicImport`s the widget). The dynamic-import filter is now propagated across static import edges; entering a matched dynamic chunk clears the predicate for nested expansion. Tests cover single- and multi-hop static chains.
