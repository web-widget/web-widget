---
'@web-widget/web-widget': patch
---

Fix race condition in autoMount execution that caused "Cannot perform 'load' from 'loading' to 'loading'" errors when multiple triggers occurred simultaneously. Added Promise-based deduplication and comprehensive test coverage.
