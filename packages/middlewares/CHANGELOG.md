# @web-widget/middlewares

## 1.22.1

### Patch Changes

- @web-widget/helpers@1.22.1
- @web-widget/schema@1.22.1

## 1.22.0

### Minor Changes

- 3f90209: Upgrading `@web-widget/shared-cache`.

### Patch Changes

- @web-widget/helpers@1.22.0
- @web-widget/schema@1.22.0

## 1.21.2

### Patch Changes

- @web-widget/helpers@1.21.2
- @web-widget/schema@1.21.2

## 1.21.1

### Patch Changes

- a794c8c: `caches` is now optional.
  - @web-widget/helpers@1.21.1
  - @web-widget/schema@1.21.1

## 1.21.0

### Patch Changes

- @web-widget/helpers@1.21.0
- @web-widget/schema@1.21.0

## 1.20.0

### Patch Changes

- @web-widget/helpers@1.20.0
- @web-widget/schema@1.20.0

## 1.19.0

### Patch Changes

- Updated dependencies [bdd93b7]
  - @web-widget/helpers@1.19.0
  - @web-widget/schema@1.19.0

## 1.18.0

### Minor Changes

- f18bb94: `cache` Use a function to define all options.

### Patch Changes

- @web-widget/helpers@1.18.0
- @web-widget/schema@1.18.0

## 1.17.0

### Minor Changes

- 4612dcc: `cache`: `cacheName` and `ignoreRequestCacheControl` support set function.

### Patch Changes

- @web-widget/helpers@1.17.0
- @web-widget/schema@1.17.0

## 1.16.1

### Patch Changes

- @web-widget/helpers@1.16.1
- @web-widget/schema@1.16.1

## 1.16.0

### Minor Changes

- d6f5f0d: `cache`: An abort signal can be emitted during cache revalidate.

### Patch Changes

- @web-widget/helpers@1.16.0
- @web-widget/schema@1.16.0

## 1.15.1

### Patch Changes

- @web-widget/helpers@1.15.1
- @web-widget/schema@1.15.1

## 1.15.0

### Minor Changes

- a0eba60: - `cache`: `cacheControl` and `vary` support asynchronous functions.
  - `cache`: `cacheControl` will bypass caching if empty.

### Patch Changes

- @web-widget/helpers@1.15.0
- @web-widget/schema@1.15.0

## 1.14.1

### Patch Changes

- @web-widget/helpers@1.14.1
- @web-widget/schema@1.14.1

## 1.14.0

### Patch Changes

- @web-widget/helpers@1.14.0
- @web-widget/schema@1.14.0

## 1.13.0

### Patch Changes

- @web-widget/helpers@1.13.0
- @web-widget/schema@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [e4f9b73]
- Updated dependencies [e4f9b73]
  - @web-widget/schema@1.12.0
  - @web-widget/helpers@1.12.0

## 1.11.0

### Patch Changes

- Updated dependencies [6aef990]
  - @web-widget/helpers@1.11.0
  - @web-widget/schema@1.11.0

## 1.10.42

### Patch Changes

- e53c42d: `cache`: Fix bug caused by working with `conditional-get`.
- 7373a82: `cache`: Avoid request's `pragma` header bypassing cache.
  - @web-widget/helpers@1.10.42
  - @web-widget/schema@1.10.42

## 1.10.41

### Patch Changes

- 4243572: `cache`: Allow forced cache bypass.
  - @web-widget/helpers@1.10.41
  - @web-widget/schema@1.10.41

## 1.10.40

### Patch Changes

- 5c51ad8: `cache`: Upgrade to the latest `@web-widget/shared-cache`.
  - @web-widget/helpers@1.10.40
  - @web-widget/schema@1.10.40

## 1.10.39

### Patch Changes

- 80c5f4c: `cache`: Refactor cache middleware using `@web-widget/shared-cache`.
  - @web-widget/helpers@1.10.39
  - @web-widget/schema@1.10.39

## 1.10.38

### Patch Changes

- 61bd811: `cache`: Not validating 304 response.
  - @web-widget/helpers@1.10.38
  - @web-widget/schema@1.10.38

## 1.10.37

### Patch Changes

- 5a167d8: `cache`: `options.vary` ignores case.
  - @web-widget/helpers@1.10.37
  - @web-widget/schema@1.10.37

## 1.10.36

### Patch Changes

- a788eea: - `cache`: `options.cacheControl` supports non-functions.
  - `cache`: `options.vary` supports non-functions.
  - `cache`: `options.parts` renamed to `options.cacheKeyPartDefiners`.
- Updated dependencies [a788eea]
  - @web-widget/helpers@1.10.36
  - @web-widget/schema@1.10.36

## 1.10.35

### Patch Changes

- 4d81279: `cache`: New, powerful caching middleware that fully respects HTTP standards.
- Updated dependencies [4d81279]
  - @web-widget/helpers@1.10.35
  - @web-widget/schema@1.10.35

## 1.10.34

### Patch Changes

- 07dbcf5: - `cache`: `methods` option renamed to `allowMethods`.
  - `cache`: `status` option renamed to `allowStatus`.
  - `hash`: `methods` option renamed to `key`.
  - @web-widget/helpers@1.10.34
  - @web-widget/schema@1.10.34

## 1.10.33

### Patch Changes

- 584571e: - `cache`: Add powerful cache control features.
  - Use seconds as the unit, consistent with the HTTP specification.
  - `setCachedHeader` renamed to `setCacheControlHeader`.
  - The status codes that allow caching are changed to: 200, 206, 301, 302, 303, 404 and 410.
  - @web-widget/helpers@1.10.33
  - @web-widget/schema@1.10.33

## 1.10.32

### Patch Changes

- @web-widget/helpers@1.10.32
- @web-widget/schema@1.10.32

## 1.10.31

### Patch Changes

- c5911a4: - `cache`: Same concept using [service worker caching strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview).
  - `cache`: Add cache refresh feature.
  - `cache`: Add the feature of adding `CacheControl` headers.
  - `cache`: Add the feature of adding `Age` headers.
  - @web-widget/helpers@1.10.31
  - @web-widget/schema@1.10.31

## 1.10.30

### Patch Changes

- 7413828: `cache`: Add caching strategies.
  - @web-widget/helpers@1.10.30
  - @web-widget/schema@1.10.30

## 1.10.29

### Patch Changes

- @web-widget/helpers@1.10.29
- @web-widget/schema@1.10.29

## 1.10.28

### Patch Changes

- 42ccff5: Optimize the headers generated by `trailing-slash`.
  - @web-widget/helpers@1.10.28
  - @web-widget/schema@1.10.28

## 1.10.27

### Patch Changes

- @web-widget/helpers@1.10.27
- @web-widget/schema@1.10.27

## 1.10.26

### Patch Changes

- Updated dependencies [58f7229]
  - @web-widget/schema@1.10.26
  - @web-widget/helpers@1.10.26

## 1.10.25

### Patch Changes

- @web-widget/helpers@1.10.25
- @web-widget/schema@1.10.25

## 1.10.24

### Patch Changes

- Updated dependencies [068ee0e]
  - @web-widget/helpers@1.10.24
  - @web-widget/schema@1.10.24

## 1.10.23

### Patch Changes

- 74e5738: `conditional-get` adds `retainedHeaders` option.
  - @web-widget/helpers@1.10.23
  - @web-widget/schema@1.10.23

## 1.10.22

### Patch Changes

- 6954431: Adjust dependencies.
- Updated dependencies [6954431]
  - @web-widget/helpers@1.10.22
  - @web-widget/schema@1.10.22

## 1.10.21

### Patch Changes

- 646fe4e: Refactor `etag` generation method.
- f00cd98: Export default path, compatible with some build tools.
- Updated dependencies [646fe4e]
  - @web-widget/helpers@1.10.21

## 1.10.20

### Patch Changes

- 4e29cbb: Export default path, compatible with some build tools.
  - @web-widget/helpers@1.10.20

## 1.10.19

### Patch Changes

- @web-widget/helpers@1.10.19

## 1.10.18

### Patch Changes

- b640111: The first parameter of `hash` of `cache` middleware is changed to `Request`.
  - @web-widget/helpers@1.10.18

## 1.10.17

### Patch Changes

- 6f9e4f1: `cache` middleware supports `disable` option.
- Updated dependencies [6f9e4f1]
  - @web-widget/helpers@1.10.17

## 1.10.16

### Patch Changes

- @web-widget/helpers@1.10.16

## 1.10.15

### Patch Changes

- 3d04412: Added `etag` and `conditional-get` middleware.
- Updated dependencies [3d04412]
  - @web-widget/helpers@1.10.15

## 1.10.14

### Patch Changes

- bdee8f6: Options for refactoring middleware.
  - @web-widget/helpers@1.10.14

## 1.10.13

### Patch Changes

- 4e38c8c: Add `cache` middleware.
- 3cbfa1d: Refactoring type definitions.
- Updated dependencies [3cbfa1d]
- Updated dependencies [4e38c8c]
- Updated dependencies [3cbfa1d]
  - @web-widget/helpers@1.10.13
