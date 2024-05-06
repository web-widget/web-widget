# @web-widget/helpers

## 1.14.0

### Patch Changes

- Updated dependencies [1c7136e]
  - @web-widget/lifecycle-cache@1.14.0
  - @web-widget/context@1.14.0

## 1.13.0

### Patch Changes

- Updated dependencies [de7a4da]
  - @web-widget/lifecycle-cache@1.13.0
  - @web-widget/context@1.13.0

## 1.12.0

### Minor Changes

- e4f9b73: - `headers`: Add `headers()`, `cookies()` and `searchParams()`.
  - `headers`: The first parameter of the `userAgent()` function is changed from `Request` to `Headers`.

### Patch Changes

- Updated dependencies [e4f9b73]
  - @web-widget/context@1.12.0
  - @web-widget/lifecycle-cache@1.12.0

## 1.11.0

### Patch Changes

- 6aef990: - `cache`: Add lifecycle cache features.
  - `context`: Use `context` instead of `useContext`.
  - `context`: Remove `allowExposedToClient` feature.
  - `navigation`: Use `params` instead of `useParams`.
  - `navigation`: Use `url` instead of `useLocation`.
  - `state`: Use `import { asyncCacheProvider } from '@web-widget/helpers/cache'` instead of `useWidgetAsyncState`.
  - `state`: Use `import { syncCacheProvider } from '@web-widget/helpers/cache'` instead of `useWidgetSyncState`.
- Updated dependencies [6aef990]
  - @web-widget/lifecycle-cache@1.11.0
  - @web-widget/context@1.11.0

## 1.10.42

### Patch Changes

- @web-widget/context@1.10.42
- @web-widget/schema@1.10.42

## 1.10.41

### Patch Changes

- @web-widget/context@1.10.41
- @web-widget/schema@1.10.41

## 1.10.40

### Patch Changes

- @web-widget/context@1.10.40
- @web-widget/schema@1.10.40

## 1.10.39

### Patch Changes

- @web-widget/context@1.10.39
- @web-widget/schema@1.10.39

## 1.10.38

### Patch Changes

- @web-widget/context@1.10.38
- @web-widget/schema@1.10.38

## 1.10.37

### Patch Changes

- @web-widget/context@1.10.37
- @web-widget/schema@1.10.37

## 1.10.36

### Patch Changes

- a788eea: - `headers`: Removed `buildCacheControl` method.
  - `headers`: Add `responseCacheControl` method.
  - `headers`: Add `requestCacheControl` method.
  - `headers:`: Add `stringifyResponseCacheControl` method.
  - `headers:`: Add `stringifyRequestCacheControl` method.
  - @web-widget/context@1.10.36
  - @web-widget/schema@1.10.36

## 1.10.35

### Patch Changes

- 4d81279: - `headers`: Add `vary` helper method.
  - `headers`: Add `deviceType` helper method.
  - `headers`: Add `buildCacheControl` helper method.
  - `headers`: `accepts` renamed to `matchAccepts`.
  - `headers`: `defaultMatch` renamed to `defaultMatchAccept`.
  - `crypto`: Add `crypto` module entry.
  - @web-widget/context@1.10.35
  - @web-widget/schema@1.10.35

## 1.10.34

### Patch Changes

- @web-widget/context@1.10.34
- @web-widget/schema@1.10.34

## 1.10.33

### Patch Changes

- @web-widget/context@1.10.33
- @web-widget/schema@1.10.33

## 1.10.32

### Patch Changes

- @web-widget/context@1.10.32
- @web-widget/schema@1.10.32

## 1.10.31

### Patch Changes

- @web-widget/context@1.10.31
- @web-widget/schema@1.10.31

## 1.10.30

### Patch Changes

- @web-widget/context@1.10.30
- @web-widget/schema@1.10.30

## 1.10.29

### Patch Changes

- @web-widget/context@1.10.29
- @web-widget/schema@1.10.29

## 1.10.28

### Patch Changes

- @web-widget/context@1.10.28
- @web-widget/schema@1.10.28

## 1.10.27

### Patch Changes

- @web-widget/context@1.10.27
- @web-widget/schema@1.10.27

## 1.10.26

### Patch Changes

- Updated dependencies [58f7229]
  - @web-widget/context@1.10.26
  - @web-widget/schema@1.10.26

## 1.10.25

### Patch Changes

- @web-widget/context@1.10.25
- @web-widget/schema@1.10.25

## 1.10.24

### Patch Changes

- 068ee0e: Fix the problem that `etag` will be repeated if `ReadableStream` is calculated differently.
  - @web-widget/context@1.10.24
  - @web-widget/schema@1.10.24

## 1.10.23

### Patch Changes

- @web-widget/context@1.10.23
- @web-widget/schema@1.10.23

## 1.10.22

### Patch Changes

- 6954431: Adjust dependencies.
  - @web-widget/context@1.10.22
  - @web-widget/schema@1.10.22

## 1.10.21

### Patch Changes

- 646fe4e: Refactor `etag` generation method.
  - @web-widget/context@1.10.21

## 1.10.20

### Patch Changes

- @web-widget/context@1.10.20

## 1.10.19

### Patch Changes

- @web-widget/context@1.10.19

## 1.10.18

### Patch Changes

- @web-widget/context@1.10.18

## 1.10.17

### Patch Changes

- 6f9e4f1: Add `statusText`.
  - @web-widget/context@1.10.17

## 1.10.16

### Patch Changes

- @web-widget/context@1.10.16

## 1.10.15

### Patch Changes

- 3d04412: Add `etag` helper method.
  - @web-widget/context@1.10.15

## 1.10.14

### Patch Changes

- @web-widget/context@1.10.14

## 1.10.13

### Patch Changes

- 3cbfa1d: Refactoring type definitions.
- 4e38c8c: Added `fresh`, `vary`, `defineConfig` and `cacheControl` helper methods.
- 3cbfa1d: Add `./env` module.
  - @web-widget/context@1.10.13

## 1.10.12

### Patch Changes

- 4c88f05: Use `@web-widget/context` to manage async context.
  - @web-widget/context@1.10.12

## 1.10.11

### Patch Changes

- 973c1a9: Avoid asynchronous context conflicts caused by repeated packaging by users.
  - @web-widget/schema@1.10.11

## 1.10.10

### Patch Changes

- 3279cdb: Optimize performance of async context.
  - @web-widget/schema@1.10.10

## 1.10.9

### Patch Changes

- ea2a37f: - Added `./error` module.
  - Added `./headers` module.
  - Added `./navigation` module.
  - Added `./state` module.
  - Added `./status` module.
  - @web-widget/schema@1.10.9

## 1.10.8

### Patch Changes

- 6f37c0b: Fix the problem that the previous version was not released correctly.
  - @web-widget/schema@1.10.8

## 1.10.7

### Patch Changes

- 1dbb15b: Export `@edge-runtime/cookies` and `@edge-runtime/user-agent` as helper methods.
  - @web-widget/schema@1.10.7

## 1.10.6

### Patch Changes

- 145bda0: Added `cookie` and `redirect` helper methods.
  - @web-widget/schema@1.10.6

## 1.10.5

### Patch Changes

- @web-widget/schema@1.10.5

## 1.10.4

### Patch Changes

- @web-widget/schema@1.10.4

## 1.10.3

### Patch Changes

- @web-widget/schema@1.10.3

## 1.10.2

### Patch Changes

- @web-widget/schema@1.10.2

## 1.10.1

### Patch Changes

- c5d458e: Add `composeMiddleware` helper method.
- a399dc5: Rename `@web-widget/vite` to `@web-widget/vite-plugin`.
  Fixed Packages.
- Updated dependencies [a399dc5]
  - @web-widget/schema@1.10.1

## 0.13.8

### Patch Changes

- @web-widget/schema@0.13.8

## 0.13.7

### Patch Changes

- Updated dependencies [82bb030]
  - @web-widget/schema@0.13.7

## 0.13.6

### Patch Changes

- @web-widget/schema@0.13.6

## 0.13.5

### Patch Changes

- @web-widget/schema@0.13.5

## 0.13.4

### Patch Changes

- 96978b3: Optimize the tag order of `renderMetaToString` output.
  - @web-widget/schema@0.13.4

## 0.13.3

### Patch Changes

- Updated dependencies [f700f18]
  - @web-widget/schema@0.13.3

## 0.13.2

### Patch Changes

- b1e8655: fix: exports error
  - @web-widget/schema@0.13.2

## 0.13.1

### Patch Changes

- 1f53f6e: Add default value `{}` for props.
- Updated dependencies [1f53f6e]
  - @web-widget/schema@0.13.1

## 0.13.0

### Minor Changes

- Follow the version number of the monorepo.
