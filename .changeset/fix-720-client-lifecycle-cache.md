---
'@web-widget/web-widget': patch
---

Serialize the lifecycle cache layer when `renderStage` is `client`, so request-level state exposed via `lifecycleCache` (for example i18n) reaches the browser. Extract `tryRenderLifecycleCacheLayer()` for shared error handling with WebContainer.

Fixes [#720](https://github.com/web-widget/web-widget/issues/720).
