---
'@web-widget/vite-plugin': minor
---

Respond to Chrome DevTools' `/.well-known/appspecific/com.chrome.devtools.json` request in the dev server, enabling **Automatic Workspace Folders**.

DevTools now automatically maps network resources to local source files without manual "Add folder to workspace" setup, and AI-assisted CSS edits can be persisted directly to disk. The workspace UUID is generated once and cached in the Vite cache directory so it survives dev server restarts.
