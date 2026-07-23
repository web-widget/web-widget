# @web-widget/html

## 3.0.0-beta.4

### Major Changes

- d2ccffa: Add `loading: 'auto'` and make it the default Widget loading strategy. Auto
  loading prioritizes visible and interactive Widgets and loads all remaining
  Widgets when the browser is idle, while leaving resource concurrency to the
  browser. Explicit `eager`, `lazy`, and `idle` strategies retain their existing
  behavior.
- 4e19787: Unify Widget render-mode configuration around the mutually exclusive
  `serverOnly` and `clientOnly` booleans.

  **Breaking:** `WidgetContainerOptions` and `WebWidgetRendererOptions` no longer
  accept `renderStage`. Pass `serverOnly: true` or `clientOnly: true` through the
  per-use `widget` prop instead. Render mode is no longer a definition-time
  `widget(loader, options)` default, so adapters can pass the mutually exclusive
  props directly to the renderer without a separate merge policy.

- d2ccffa: Rename the adapter widget wrapper API from `container()` to `widget()`.
  The `AdapterModule.container` contract field is now `AdapterModule.widget`,
  and generated imports use `widget` exclusively. This is a breaking change;
  there is no compatibility export for the old API.

### Minor Changes

- d2ccffa: Add experimental Shadow DOM SSR boundaries with declarative shadow roots,
  native slot projection, isolated widget styles, and an internal HTMLElement
  mount root shared by framework adapters.

  Widget `meta.style` and stylesheet links are installed in shadow boundaries on
  the server and client. Solid widgets conservatively fall back to client
  rendering inside isolated shadow roots until their hydration key namespace can
  be made root-local. Browsers without native Declarative Shadow DOM parsing use
  a client-side fallback before custom elements are registered.

  The new `webWidgetPlugin.defaults` option configures the default `loading` and
  `root` values for transformed Widget containers. In shadow mode, route
  asset collection omits Widget CSS from the document head and keeps it in each
  shadow boundary. Explicit container options override the injected defaults.

  In development, Vite-transformed Widget CSS is embedded in declarative shadow
  roots and tracked by stable style IDs for HMR. CSS updates invalidate the
  server importer chain so CSS Modules class maps and shadow-local selectors stay
  in sync after reloads.

### Patch Changes

- d2ccffa: Add `@web-widget/schema/testing`, a runner-neutral adapter conformance suite,
  and use it to verify the server and client lifecycle contracts of every built-in
  adapter.

  Server render streams may contain either string chunks or UTF-8 encoded byte
  chunks, allowing adapters to expose framework-native streams without decoding
  them first.

- Updated dependencies [d2ccffa]
- Updated dependencies [d2ccffa]
- Updated dependencies [b60f210]
- Updated dependencies [2e0fd18]
- Updated dependencies [d2ccffa]
- Updated dependencies [4e19787]
- Updated dependencies [d2ccffa]
  - @web-widget/schema@3.0.0-beta.4
  - @web-widget/web-widget@3.0.0-beta.4
  - @web-widget/helpers@3.0.0-beta.4

## 3.0.0-beta.3

### Minor Changes

- 2fe95e0: Support pending fallback UI for client-only widgets until client mounting begins.

### Patch Changes

- Updated dependencies [2fe95e0]
  - @web-widget/web-widget@3.0.0-beta.3
  - @web-widget/helpers@3.0.0-beta.3
  - @web-widget/schema@3.0.0-beta.3

## 3.0.0-beta.2

### Major Changes

- 1a47400: Add Preact, Solid, Svelte, Lit, and Web Components adapters. Preact, Solid, and Svelte support SSR and client hydration; Lit and Web Components provide client-side rendering adapters.

  Widget and route modules now accept either `@widget` / `@route` or `.widget` / `.route` markers. Adapter scopes are arrays of directory prefixes, and shared structural prop extraction improves cross-framework `container()` inference with an explicit `container<Props>()` fallback.

  The HTML adapter now matches `.ts` and `.js` under the directories configured in `scopes` instead of requiring `.html.ts` and `.html.js`.

### Patch Changes

- Updated dependencies [1a47400]
  - @web-widget/schema@3.0.0-beta.2
  - @web-widget/helpers@3.0.0-beta.2
  - @web-widget/web-widget@3.0.0-beta.2

## 3.0.0-beta.1

### Major Changes

- ef38a43: Rename rendering functions to align with React/Vue SSR conventions.

  | Old name       | New name         |
  | -------------- | ---------------- |
  | `HTMLToStream` | `renderToStream` |
  | `HTMLToString` | `renderToString` |

### Minor Changes

- 6bd5331: Container type inference: `container()` is now a generic function that
  automatically infers widget props types from the source module's default export,
  enabling cross-framework type interoperability without manual conversion
  functions.
- ef38a43: Add lit-html compatible directives for HTML templates. Five directive
  functions are now available with signatures matching their lit-html
  counterparts, easing migration from lit-html.

  - `classMap(classes)` — joins truthy class names into a space-separated string
  - `styleMap(styles)` — converts a style object to a CSS string, with
    camelCase → kebab-case conversion and CSS custom property (`--*`) support
  - `ifDefined(value)` — returns empty string for `undefined`, useful for
    optional attributes
  - `when(condition, trueCase, falseCase?)` — conditional rendering with
    optional else branch
  - `join(items, separator)` — renders an iterable with a separator between
    each pair

  Unlike lit-html's directives, these are stateless value transformers that
  work without any framework runtime.

- ef38a43: Add Suspense streaming for HTML templates. Async content now streams
  progressively — placeholders are replaced in-place when promises resolve,
  without blocking the rest of the page.

  - New `suspense(content, fallback, errorFallback?)` template function
  - `renderToStream` extended with Suspense boundary support
  - `render` respects the `progressive` option: streaming (Suspense active)
    when `true`, buffered string output when `false`
  - `container()` auto-wraps with `suspense()` when `fallback`
    is provided
  - Streaming protocol uses `$H` prefix (`$HRC`, `HS:0`, `HB:0`) to avoid
    conflicts with React's `$RC` — both can coexist on the same page

- ef38a43: Implement the WidgetTransform protocol for @web-widget/html. HTML route files
  using `.html.ts` extension now get automatic `render` injection and widget
  `container` wrapping — no more manual `export { render }`.

  - Export the build definition from `./transform` with `.html.ts` matching and an explicit adapter module ID
  - `exportRenderPlugin` auto-injects `render` into `@route.html.ts` / `@widget.html.ts`
  - `importRenderPlugin` auto-wraps widget imports via `container()`
  - `deriveExports` provides default `handler` and `meta` (same as Vue adapter)

- 5ba2c6b: Streaming SSR now surfaces shell-level errors so the framework can return a
  500 response, matching React's `renderToReadableStream` semantics.

  Previously, shell errors during streaming were silently swallowed — the
  response started with status 200, leaving the client with a broken page.

  - **React**: removed the `RouteErrorBoundary` wrapper that intercepted shell
    errors; `renderToReadableStream` now rejects on shell failure, enabling the
    framework's 500 error page.
  - **HTML**: `renderToStream` now returns a `Promise<ReadableStream>` instead
    of a `ReadableStream`. The shell (everything before deferred content) is
    buffered; if it throws, the promise rejects. Deferred errors inside
    `suspense()` remain recoverable via `fallback()`.
  - **Vue**: `renderToWebStream` errors are now detected before the response is
    sent, by consuming the first stream chunk to flush Vue's async rendering
    pipeline.

- a7c8f36: Widget container API redesign: container props are now grouped under a single
  `widget` prop across all framework adapters (React, Vue, Vue2), isolating them
  from the widget's own props to prevent naming collisions.

  **Breaking**: container props are no longer passed flat — use the `widget` prop:

  ```diff
  - <Counter fallback={<Spinner />} experimental_loading="lazy" count={1} />
  + <Counter widget={{ fallback: <Spinner />, padding: 'lazy' }} count={1} />
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

### Patch Changes

- @web-widget/helpers@3.0.0-beta.1
- @web-widget/web-widget@3.0.0-beta.1

## 3.0.0-beta.0

### Minor Changes

- c2cbde5: Internalize the HTML templating and stream conversion utilities previously
  provided by `@worker-tools/html` and `whatwg-stream-to-async-iter`.

  ### Fixes
  - **Resource leak on early termination** — `streamToAsyncIter` now uses `finally`
    to always call `reader.cancel()` and `reader.releaseLock()`, so `break` /
    `return` / `throw` in a `for await…of` loop no longer leaks the reader lock
    or leaves the producer unaware that the consumer stopped.
  - **Backpressure in TransformStream fallback** — `asyncIterToStream` now
    `await`s `writer.write()`, preventing unbounded memory buffering when the
    producer outpaces the consumer.
  - **Correct stream cancellation** — `asyncIterToStream` (ReadableStream variant)
    now calls `iterator.return()` instead of `iterator.throw()` on cancellation,
    matching the WHATWG Streams spec.

  ### Changes
  - `@worker-tools/html` and `whatwg-stream-to-async-iter` are no longer direct
    dependencies of `@web-widget/html`. The `html`, `unsafeHTML`, `fallback`
    APIs and `HTML` / `UnsafeHTML` / `Fallback` types are now self-contained.

### Patch Changes

- @web-widget/helpers@3.0.0-beta.0

## 2.3.1

### Patch Changes

- @web-widget/helpers@2.3.1

## 2.3.0

### Patch Changes

- @web-widget/helpers@2.3.0

## 2.2.0

### Patch Changes

- @web-widget/helpers@2.2.0

## 2.1.1

### Patch Changes

- @web-widget/helpers@2.1.1

## 2.1.0

### Patch Changes

- Updated dependencies [fc3e100]
  - @web-widget/helpers@2.1.0

## 2.0.0

### Patch Changes

- @web-widget/helpers@2.0.0

## 1.72.3

### Patch Changes

- @web-widget/helpers@1.72.3

## 1.72.2

### Patch Changes

- @web-widget/helpers@1.72.2

## 1.72.1

### Patch Changes

- @web-widget/helpers@1.72.1

## 1.72.0

### Patch Changes

- @web-widget/helpers@1.72.0

## 1.71.2

### Patch Changes

- @web-widget/helpers@1.71.2

## 1.71.1

### Patch Changes

- @web-widget/helpers@1.71.1

## 1.71.0

### Patch Changes

- @web-widget/helpers@1.71.0

## 1.70.2

### Patch Changes

- @web-widget/helpers@1.70.2

## 1.70.1

### Patch Changes

- @web-widget/helpers@1.70.1

## 1.70.0

### Patch Changes

- @web-widget/helpers@1.70.0

## 1.69.0

### Patch Changes

- @web-widget/helpers@1.69.0

## 1.68.0

### Patch Changes

- @web-widget/helpers@1.68.0

## 1.67.0

### Patch Changes

- @web-widget/helpers@1.67.0

## 1.66.0

### Patch Changes

- @web-widget/helpers@1.66.0

## 1.65.0

### Patch Changes

- @web-widget/helpers@1.65.0

## 1.64.0

### Patch Changes

- @web-widget/helpers@1.64.0

## 1.63.0

### Patch Changes

- @web-widget/helpers@1.63.0

## 1.62.0

### Patch Changes

- @web-widget/helpers@1.62.0

## 1.61.2

### Patch Changes

- @web-widget/helpers@1.61.2

## 1.61.1

### Patch Changes

- ac2c5b2: Fixed render adapter not implementing default values ​​correctly.
  - @web-widget/helpers@1.61.1

## 1.61.0

### Minor Changes

- 0753fdd: The second parameter of the UI framework renderer will have a default value.

### Patch Changes

- @web-widget/helpers@1.61.0

## 1.60.1

### Patch Changes

- Updated dependencies [f548c2d]
  - @web-widget/helpers@1.60.1

## 1.60.0

### Patch Changes

- Updated dependencies [74d18f3]
  - @web-widget/helpers@1.60.0

## 1.59.0

### Patch Changes

- Updated dependencies [beb25af]
  - @web-widget/helpers@1.59.0

## 1.58.0

### Patch Changes

- Updated dependencies [c2db8f1]
  - @web-widget/helpers@1.58.0

## 1.57.0

### Minor Changes

- c2d1386: Updated the format specification for renderable modules.

### Patch Changes

- Updated dependencies [c2d1386]
  - @web-widget/helpers@1.57.0

## 1.56.1

### Patch Changes

- @web-widget/helpers@1.56.1

## 1.56.0

### Patch Changes

- @web-widget/helpers@1.56.0

## 1.55.0

### Minor Changes

- 8c58765: Add progressive rendering feature flags.

### Patch Changes

- @web-widget/helpers@1.55.0

## 1.54.1

### Patch Changes

- @web-widget/helpers@1.54.1

## 1.54.0

### Patch Changes

- @web-widget/helpers@1.54.0

## 1.53.1

### Patch Changes

- @web-widget/helpers@1.53.1

## 1.53.0

### Patch Changes

- @web-widget/helpers@1.53.0

## 1.52.1

### Patch Changes

- @web-widget/helpers@1.52.1

## 1.52.0

### Patch Changes

- @web-widget/helpers@1.52.0

## 1.51.1

### Patch Changes

- @web-widget/helpers@1.51.1

## 1.51.0

### Patch Changes

- @web-widget/helpers@1.51.0

## 1.50.1

### Patch Changes

- @web-widget/helpers@1.50.1

## 1.50.0

### Minor Changes

- e7e6b56: Delete the cjs entry of the package.

### Patch Changes

- Updated dependencies [e7e6b56]
  - @web-widget/helpers@1.50.0

## 1.49.2

### Patch Changes

- @web-widget/helpers@1.49.2

## 1.49.1

### Patch Changes

- @web-widget/helpers@1.49.1

## 1.49.0

### Patch Changes

- @web-widget/helpers@1.49.0

## 1.48.0

### Patch Changes

- @web-widget/helpers@1.48.0

## 1.47.0

### Patch Changes

- @web-widget/helpers@1.47.0

## 1.46.0

### Patch Changes

- @web-widget/helpers@1.46.0

## 1.45.0

### Patch Changes

- Updated dependencies [58c8055]
  - @web-widget/helpers@1.45.0

## 1.44.0

### Patch Changes

- @web-widget/helpers@1.44.0

## 1.43.0

### Patch Changes

- @web-widget/helpers@1.43.0

## 1.42.0

### Patch Changes

- @web-widget/helpers@1.42.0

## 1.41.1

### Patch Changes

- @web-widget/helpers@1.41.1

## 1.41.0

### Patch Changes

- @web-widget/helpers@1.41.0

## 1.40.1

### Patch Changes

- @web-widget/helpers@1.40.1

## 1.40.0

### Patch Changes

- @web-widget/helpers@1.40.0

## 1.39.2

### Patch Changes

- Updated dependencies [1a75e88]
  - @web-widget/helpers@1.39.2

## 1.39.1

### Patch Changes

- Updated dependencies [39c5cf1]
  - @web-widget/helpers@1.39.1

## 1.39.0

### Patch Changes

- @web-widget/helpers@1.39.0

## 1.38.1

### Patch Changes

- @web-widget/helpers@1.38.1

## 1.38.0

### Patch Changes

- @web-widget/helpers@1.38.0

## 1.37.0

### Patch Changes

- @web-widget/helpers@1.37.0

## 1.36.0

### Patch Changes

- @web-widget/helpers@1.36.0

## 1.35.1

### Patch Changes

- @web-widget/helpers@1.35.1

## 1.35.0

### Patch Changes

- @web-widget/helpers@1.35.0

## 1.34.1

### Patch Changes

- @web-widget/helpers@1.34.1

## 1.34.0

### Patch Changes

- @web-widget/helpers@1.34.0

## 1.33.3

### Patch Changes

- @web-widget/helpers@1.33.3

## 1.33.2

### Patch Changes

- @web-widget/helpers@1.33.2

## 1.33.1

### Patch Changes

- @web-widget/helpers@1.33.1

## 1.33.0

### Patch Changes

- @web-widget/helpers@1.33.0

## 1.32.2

### Patch Changes

- @web-widget/helpers@1.32.2

## 1.32.1

### Patch Changes

- @web-widget/helpers@1.32.1

## 1.32.0

### Patch Changes

- @web-widget/helpers@1.32.0

## 1.31.0

### Patch Changes

- Updated dependencies [7806796]
  - @web-widget/helpers@1.31.0

## 1.30.2

### Patch Changes

- Updated dependencies [b58ba41]
  - @web-widget/helpers@1.30.2

## 1.30.1

### Patch Changes

- @web-widget/helpers@1.30.1

## 1.30.0

### Patch Changes

- @web-widget/helpers@1.30.0

## 1.29.1

### Patch Changes

- @web-widget/helpers@1.29.1

## 1.29.0

### Patch Changes

- @web-widget/helpers@1.29.0

## 1.28.0

### Patch Changes

- @web-widget/helpers@1.28.0

## 1.27.2

### Patch Changes

- @web-widget/helpers@1.27.2

## 1.27.1

### Patch Changes

- @web-widget/helpers@1.27.1

## 1.27.0

### Patch Changes

- Updated dependencies [6c8a04a]
  - @web-widget/helpers@1.27.0

## 1.26.0

### Patch Changes

- Updated dependencies [d35d205]
  - @web-widget/helpers@1.26.0

## 1.25.0

### Patch Changes

- Updated dependencies [748ca9f]
  - @web-widget/helpers@1.25.0

## 1.24.6

### Patch Changes

- @web-widget/helpers@1.24.6

## 1.24.5

### Patch Changes

- @web-widget/helpers@1.24.5

## 1.24.4

### Patch Changes

- @web-widget/helpers@1.24.4

## 1.24.3

### Patch Changes

- Updated dependencies [ccfef36]
  - @web-widget/helpers@1.24.3

## 1.24.2

### Patch Changes

- Updated dependencies [cdfcadb]
  - @web-widget/helpers@1.24.2

## 1.24.1

### Patch Changes

- @web-widget/helpers@1.24.1

## 1.24.0

### Patch Changes

- @web-widget/helpers@1.24.0

## 1.23.0

### Patch Changes

- @web-widget/helpers@1.23.0

## 1.22.1

### Patch Changes

- @web-widget/helpers@1.22.1

## 1.22.0

### Patch Changes

- @web-widget/helpers@1.22.0

## 1.21.2

### Patch Changes

- @web-widget/helpers@1.21.2

## 1.21.1

### Patch Changes

- @web-widget/helpers@1.21.1

## 1.21.0

### Patch Changes

- @web-widget/helpers@1.21.0

## 1.20.0

### Patch Changes

- @web-widget/helpers@1.20.0

## 1.19.0

### Minor Changes

- bdd93b7: 🎉 Server Action is born.

### Patch Changes

- Updated dependencies [bdd93b7]
  - @web-widget/helpers@1.19.0

## 1.18.0

### Patch Changes

- @web-widget/helpers@1.18.0

## 1.17.0

### Patch Changes

- @web-widget/helpers@1.17.0

## 1.16.1

### Patch Changes

- @web-widget/helpers@1.16.1

## 1.16.0

### Patch Changes

- @web-widget/helpers@1.16.0

## 1.15.1

### Patch Changes

- @web-widget/helpers@1.15.1

## 1.15.0

### Patch Changes

- @web-widget/helpers@1.15.0

## 1.14.1

### Patch Changes

- @web-widget/helpers@1.14.1

## 1.14.0

### Patch Changes

- @web-widget/helpers@1.14.0

## 1.13.0

### Patch Changes

- @web-widget/helpers@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [e4f9b73]
  - @web-widget/helpers@1.12.0

## 1.11.0

### Patch Changes

- Updated dependencies [6aef990]
  - @web-widget/helpers@1.11.0

## 1.10.42

### Patch Changes

- @web-widget/helpers@1.10.42

## 1.10.41

### Patch Changes

- @web-widget/helpers@1.10.41

## 1.10.40

### Patch Changes

- @web-widget/helpers@1.10.40

## 1.10.39

### Patch Changes

- @web-widget/helpers@1.10.39

## 1.10.38

### Patch Changes

- @web-widget/helpers@1.10.38

## 1.10.37

### Patch Changes

- @web-widget/helpers@1.10.37

## 1.10.36

### Patch Changes

- Updated dependencies [a788eea]
  - @web-widget/helpers@1.10.36

## 1.10.35

### Patch Changes

- Updated dependencies [4d81279]
  - @web-widget/helpers@1.10.35

## 1.10.34

### Patch Changes

- @web-widget/helpers@1.10.34

## 1.10.33

### Patch Changes

- @web-widget/helpers@1.10.33

## 1.10.32

### Patch Changes

- @web-widget/helpers@1.10.32

## 1.10.31

### Patch Changes

- @web-widget/helpers@1.10.31

## 1.10.30

### Patch Changes

- @web-widget/helpers@1.10.30

## 1.10.29

### Patch Changes

- @web-widget/helpers@1.10.29

## 1.10.28

### Patch Changes

- @web-widget/helpers@1.10.28

## 1.10.27

### Patch Changes

- @web-widget/helpers@1.10.27

## 1.10.26

### Patch Changes

- @web-widget/helpers@1.10.26

## 1.10.25

### Patch Changes

- @web-widget/helpers@1.10.25

## 1.10.24

### Patch Changes

- Updated dependencies [068ee0e]
  - @web-widget/helpers@1.10.24

## 1.10.23

### Patch Changes

- @web-widget/helpers@1.10.23

## 1.10.22

### Patch Changes

- Updated dependencies [6954431]
  - @web-widget/helpers@1.10.22

## 1.10.21

### Patch Changes

- Updated dependencies [646fe4e]
  - @web-widget/helpers@1.10.21

## 1.10.20

### Patch Changes

- @web-widget/helpers@1.10.20

## 1.10.19

### Patch Changes

- @web-widget/helpers@1.10.19

## 1.10.18

### Patch Changes

- @web-widget/helpers@1.10.18

## 1.10.17

### Patch Changes

- Updated dependencies [6f9e4f1]
  - @web-widget/helpers@1.10.17

## 1.10.16

### Patch Changes

- @web-widget/helpers@1.10.16

## 1.10.15

### Patch Changes

- Updated dependencies [3d04412]
  - @web-widget/helpers@1.10.15

## 1.10.14

### Patch Changes

- @web-widget/helpers@1.10.14

## 1.10.13

### Patch Changes

- Updated dependencies [3cbfa1d]
- Updated dependencies [4e38c8c]
- Updated dependencies [3cbfa1d]
  - @web-widget/helpers@1.10.13

## 1.10.12

### Patch Changes

- Updated dependencies [4c88f05]
  - @web-widget/helpers@1.10.12

## 1.10.11

### Patch Changes

- Updated dependencies [973c1a9]
  - @web-widget/helpers@1.10.11

## 1.10.10

### Patch Changes

- Updated dependencies [3279cdb]
  - @web-widget/helpers@1.10.10

## 1.10.9

### Patch Changes

- Updated dependencies [ea2a37f]
  - @web-widget/helpers@1.10.9

## 1.10.8

### Patch Changes

- Updated dependencies [6f37c0b]
  - @web-widget/helpers@1.10.8

## 1.10.7

### Patch Changes

- Updated dependencies [1dbb15b]
  - @web-widget/helpers@1.10.7

## 1.10.6

### Patch Changes

- Updated dependencies [145bda0]
  - @web-widget/helpers@1.10.6

## 1.10.5

### Patch Changes

- @web-widget/helpers@1.10.5

## 1.10.4

### Patch Changes

- @web-widget/helpers@1.10.4

## 1.10.3

### Patch Changes

- @web-widget/helpers@1.10.3

## 1.10.2

### Patch Changes

- @web-widget/helpers@1.10.2

## 1.10.1

### Patch Changes

- a399dc5: Rename `@web-widget/vite` to `@web-widget/vite-plugin`.
  Fixed Packages.
- Updated dependencies [c5d458e]
- Updated dependencies [a399dc5]
  - @web-widget/helpers@1.10.1

## 0.13.8

### Patch Changes

- @web-widget/helpers@0.13.8

## 0.13.7

### Patch Changes

- @web-widget/helpers@0.13.7

## 0.13.6

### Patch Changes

- @web-widget/helpers@0.13.6

## 0.13.5

### Patch Changes

- @web-widget/helpers@0.13.5

## 0.13.4

### Patch Changes

- Updated dependencies [96978b3]
  - @web-widget/helpers@0.13.4

## 0.13.3

### Patch Changes

- @web-widget/helpers@0.13.3

## 0.13.2

### Patch Changes

- Updated dependencies [b1e8655]
  - @web-widget/helpers@0.13.2

## 0.13.1

### Patch Changes

- 1f53f6e: Add default value `{}` for props.
- Updated dependencies [1f53f6e]
  - @web-widget/helpers@0.13.1

## 0.13.0

### Minor Changes

- Follow the version number of the monorepo.

## 0.1.9

### Patch Changes

- Fix package.json peer dependency bug.

## 0.1.8

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.4.3

## 0.1.7

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.4.2

## 0.1.6

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.4.1

## 0.1.5

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.4.0

## 0.1.4

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.3.0

## 0.1.3

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.2.0

## 0.1.2

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.1.1

## 0.1.0

### Patch Changes

- feat: Support setting rendering options.
- Updated dependencies
  - @web-widget/schema@0.1.0
