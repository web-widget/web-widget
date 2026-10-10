---
'@web-widget/helpers': patch
---

Fix metadata merging to preserve repeatable Open Graph values, replace singleton canonical, charset, and HTTP-equivalent declarations, and avoid retaining references to input descriptors. Harden metadata rendering against invalid attribute names and raw-text closing tags, and prevent duplicate basic metadata declarations.
