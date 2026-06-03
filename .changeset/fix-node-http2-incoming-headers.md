---
'@web-widget/node': patch
---

Fix HTTP/2 dev server compatibility when converting Node `IncomingMessage` to Fetch `Request`: strip pseudo-headers (`:method`, `:path`, etc.) before building `Headers`, map `:authority` to `host`, and resolve request origin from `:authority` / `:scheme` with `defaultOrigin` protocol (e.g. Vite 8 HTTPS on non-443 ports). Workaround until upstream `@edge-runtime/node-utils` fixes land.
