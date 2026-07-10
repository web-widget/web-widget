---
'@web-widget/react': minor
'@web-widget/vue': minor
'@web-widget/vue2': minor
---

React Widget island error recovery: widget rendering failures are now
contained within their own island via integrated ErrorBoundary and Suspense.
The `fallback` prop supports `{ loading?, error? }` to differentiate states.

**Breaking**: all framework adapters split their package entry. The `.` entry
no longer re-exports `@web-widget/helpers` — import user-facing APIs from
`@web-widget/helpers` and runtime code from `./runtime`. `asReactWidget`
remains available from the `.` entry of `@web-widget/vue` and `@web-widget/vue2`.
