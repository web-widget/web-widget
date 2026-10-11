---
'@web-widget/vite-plugin': patch
---

Resolve cross-framework widget imports from ordinary framework files and modules without default exports, including client asset URLs for explicit `widget()` calls. Preserve native same-framework imports, skip raw/direct requests, and avoid production asset imports during development.
