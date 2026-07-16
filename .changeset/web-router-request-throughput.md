---
'@web-widget/node': patch
'@web-widget/web-router': patch
---

Improve Web Router request throughput across the Node adapter, middleware dispatch, and route matching hot paths.

- Lazily materialize Web `Request` and `Response` objects for the common Node request path.
- Add synchronous single-handler dispatch and lazy per-request state allocation.
- Index static routes, bucket dynamic routes, and precompile common parameter matchers while preserving URLPattern fallbacks.
- Target ES2022 and avoid unnecessary URL parsing and parameter decoding work.

On Node.js 22, the optimized three-round medians are 83,974 req/s for the default router, 84,051 req/s for Radix Tree, and 50,192 req/s for Manifest mode. Compared with the archived single-run baselines, these are approximately 3.03x, 1.99x, and 2.97x respectively. The ratios are directional because the historical baselines predate the warmup and multi-round benchmark methodology.
