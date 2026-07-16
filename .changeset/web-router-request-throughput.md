---
'@web-widget/node': patch
'@web-widget/web-router': patch
---

Improve Web Router request throughput across the Node adapter, middleware dispatch, and route matching hot paths.

- Lazily materialize Web `Request` and `Response` objects for the common Node request path.
- Add synchronous single-handler dispatch and lazy per-request state allocation.
- Index static routes, bucket dynamic routes, and precompile common parameter matchers while preserving URLPattern fallbacks.
- Target ES2022 and avoid unnecessary URL parsing and parameter decoding work.

In the Node.js 22 benchmark, default Web Router throughput increases from 27,675 to 85,485 req/s (3.09x); Radix Tree and Manifest modes improve by 2.02x and 2.99x respectively.
