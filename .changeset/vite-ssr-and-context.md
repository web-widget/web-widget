---
'@web-widget/context': major
'@web-widget/react': major
'@web-widget/vite-plugin': major
'@web-widget/vue': major
'@web-widget/web-router': major
---

**BREAKING:** This release targets **Vite 8** and **Vitest 4**, and raises the **Node.js** baseline beyond **≥ Node 18** — use **`vite@^8`** and **`vitest@^4`** (this repo’s catalog uses `^8.0.12` and `^4.1.6`), **upgrade Node**, bump related packages as needed, and adjust build / test configs for Rolldown-oriented APIs (for example `build.rolldownOptions`), SSR resolution (`resolve.conditions` under `ssr`), and Vitest setup integration used by `@web-widget/vite-plugin`.

Details:

- Lazily load `AsyncLocalStorage` in `@web-widget/context` when `node:async_hooks` is missing so globals initialization does not hard-fail.
- Improve React edge SSR typings, export `RenderToStringOptions`, and normalize non-`Error` values passed to server `onError`.
- Align `@web-widget/vite-plugin` with **Vite 8** and **Vitest 4**: webworker SSR `resolve.conditions`, merge Vitest `setupFiles` with injected edge/node setups, Rolldown-focused build options (`rolldownOptions`), clearer transform/preview errors; **`engines.node`** is tightened beyond the old **≥ Node 18** minimum..
- Update `@web-widget/web-router` Vitest Cloudflare Workers pool setup for Vitest 4 and suppress spurious unhandled rejections from intentional async middleware errors.
