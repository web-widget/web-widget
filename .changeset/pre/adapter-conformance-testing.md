---
'@web-widget/schema': minor
'@web-widget/html': patch
'@web-widget/lit': patch
'@web-widget/preact': patch
'@web-widget/react': patch
'@web-widget/solid': patch
'@web-widget/svelte': patch
'@web-widget/vue': patch
'@web-widget/vue2': patch
'@web-widget/web-components': patch
---

Add `@web-widget/schema/testing`, a runner-neutral adapter conformance suite,
and use it to verify the server and client lifecycle contracts of every built-in
adapter.

Server render streams may contain either string chunks or UTF-8 encoded byte
chunks, allowing adapters to expose framework-native streams without decoding
them first.
