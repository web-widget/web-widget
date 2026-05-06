---
'@web-widget/vite-plugin': patch
---

Fix SSR CSS collection for widget modules imported with `?as=...` (for example `?as=jsx`) so dynamic widget styles are included consistently with non-query imports.
