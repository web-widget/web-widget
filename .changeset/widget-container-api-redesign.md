---
'@web-widget/react': minor
'@web-widget/vue': minor
'@web-widget/vue2': minor
'@web-widget/html': minor
---

Widget container API redesign: container props are now grouped under a single
`widget` prop across all framework adapters (React, Vue, Vue2), isolating them
from the widget's own props to prevent naming collisions.

**Breaking**: container props are no longer passed flat — use the `widget` prop:

```diff
- <Counter fallback={<Spinner />} experimental_loading="lazy" count={1} />
+ <Counter widget={{ fallback: <Spinner />, loading: 'lazy' }} count={1} />
```

`experimental_loading` → `loading`, `experimental_renderTarget` removed
(set via container options instead), and `renderStage` is replaced
by the mutually exclusive `serverOnly` / `clientOnly` booleans.

All framework adapters split their package entry. The `.` entry no longer
re-exports `@web-widget/helpers` — import user-facing APIs from
`@web-widget/helpers` and runtime code from `./runtime`. `asReactWidget`
remains available from the `.` entry of `@web-widget/vue` and `@web-widget/vue2`.

`@web-widget/html` also no longer re-exports `@web-widget/helpers` from its `.`
entry — import user-facing APIs from `@web-widget/helpers` directly. Runtime
APIs (`render`, `html`, `unsafeHTML`, etc.) remain available from
`@web-widget/html`.
