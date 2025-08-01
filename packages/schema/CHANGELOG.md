# @web-widget/schema

## 1.70.0

## 1.69.0

## 1.68.0

## 1.67.0

## 1.66.0

## 1.65.0

### Minor Changes

- 090d66f: feat: deprecate render method in favor of html method
  - Mark render() method as @deprecated in RouteContext interface
  - Update comments to reference html() method instead of render()
  - Mark renderOptions as @deprecated in favor of renderer
  - Mark RouteRenderOptions as @deprecated in favor of ServerRenderOptions
  - Remove @experimental tags from html() method and renderer property

  This is a breaking change as the render() method is now deprecated and will be removed in a future version. Users should migrate to the html() method for better type safety and clearer API.

## 1.64.0

## 1.63.0

### Minor Changes

- 0df6a09: New rendering method `html`, as a future replacement for the `render` method (experimental) (experimental).

## 1.62.0

### Minor Changes

- d6add51: New rendering method `renderWith`, as a future replacement for the `render` method (experimental).

## 1.61.2

## 1.61.1

## 1.61.0

## 1.60.1

## 1.60.0

## 1.59.0

## 1.58.0

## 1.57.0

### Minor Changes

- c2d1386: Updated the format specification for renderable modules.

## 1.56.1

### Patch Changes

- 34be0e1: Fix the missing issue when publishing.

## 1.56.0

## 1.55.0

### Minor Changes

- 8c58765: Add progressive rendering feature flags.

## 1.54.1

## 1.54.0

### Minor Changes

- 428f37b: Refactor large modules into smaller ones for easier reading.

## 1.53.1

## 1.53.0

## 1.52.1

## 1.52.0

## 1.51.1

## 1.51.0

## 1.50.1

## 1.50.0

## 1.49.2

## 1.49.1

## 1.49.0

## 1.48.0

## 1.47.0

## 1.46.0

## 1.45.0

### Minor Changes

- 58c8055: Support running background tasks `context.waitUntil(promise)`.

## 1.44.0

## 1.43.0

## 1.42.0

## 1.41.1

## 1.41.0

## 1.40.1

## 1.40.0

## 1.39.2

## 1.39.1

## 1.39.0

### Minor Changes

- 608e18f: Use `State` instead of `RouteState`.

## 1.38.1

## 1.38.0

## 1.37.0

## 1.36.0

## 1.35.1

## 1.35.0

## 1.34.1

## 1.34.0

## 1.33.3

## 1.33.2

## 1.33.1

## 1.33.0

## 1.32.2

## 1.32.1

## 1.32.0

## 1.31.0

## 1.30.2

## 1.30.1

## 1.30.0

## 1.29.1

## 1.29.0

## 1.28.0

## 1.27.2

## 1.27.1

## 1.27.0

## 1.26.0

## 1.25.0

## 1.24.6

## 1.24.5

## 1.24.4

## 1.24.3

## 1.24.2

## 1.24.1

## 1.24.0

### Minor Changes

- 13d1aba: Rename `RouteHandlerContext` to `RouteContext`.

## 1.23.0

## 1.22.1

## 1.22.0

## 1.21.2

## 1.21.1

## 1.21.0

## 1.20.0

## 1.19.0

### Minor Changes

- bdd93b7: 🎉 Server Action is born.

## 1.18.0

## 1.17.0

## 1.16.1

## 1.16.0

## 1.15.1

## 1.15.0

## 1.14.1

## 1.14.0

## 1.13.0

## 1.12.0

### Patch Changes

- e4f9b73: Mark types such as `Params` as read-only.

## 1.11.0

## 1.10.42

## 1.10.41

## 1.10.40

## 1.10.39

## 1.10.38

## 1.10.37

## 1.10.36

## 1.10.35

## 1.10.34

## 1.10.33

## 1.10.32

## 1.10.31

## 1.10.30

## 1.10.29

## 1.10.28

## 1.10.27

## 1.10.26

### Patch Changes

- 58f7229: Mark `context.pathname` as `deprecated`.

## 1.10.25

## 1.10.24

## 1.10.23

## 1.10.22

## 1.10.21

## 1.10.20

## 1.10.19

## 1.10.18

## 1.10.17

## 1.10.16

## 1.10.15

## 1.10.14

## 1.10.13

### Patch Changes

- 3cbfa1d: Refactoring type definitions.

## 1.10.12

## 1.10.11

## 1.10.10

## 1.10.9

## 1.10.8

## 1.10.7

## 1.10.6

## 1.10.5

## 1.10.4

## 1.10.3

## 1.10.2

## 1.10.1

### Patch Changes

- a399dc5: Rename `@web-widget/vite` to `@web-widget/vite-plugin`.
  Fixed Packages.

## 0.13.8

## 0.13.7

### Patch Changes

- 82bb030: (No change)

## 0.13.6

## 0.13.5

## 0.13.4

## 0.13.3

### Patch Changes

- f700f18: Fix test cases for @web-widget/web-widget.

## 0.13.2

## 0.13.1

### Patch Changes

- 1f53f6e: Add default value `{}` for props.

## 0.13.0

### Minor Changes

- Follow the version number of the monorepo.
- f84a9a9: Move helper methods into `@web-widget/helpers` package.
  Refactored module type definitions.
- 81f33f8: Refactor route error handling.

## 0.4.3

### Patch Changes

- Refactor components.

## 0.4.2

### Patch Changes

- Fixed an issue where status data serialized to the client may be duplicated.
- Also supports state serialization of react, vue3, and vue2.

## 0.4.1

### Patch Changes

- Fix the problem of accidentally losing meta content.

## 0.4.0

### Minor Changes

- Add `useWidgetState` hooks.

## 0.3.0

### Minor Changes

- Update types definition.

## 0.2.0

### Minor Changes

- feat: Support [`fetchPriority`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLinkElement/fetchPriority).

## 0.1.2

### Patch Changes

- fix: The content of the style tag was unexpectedly escaped.

## 0.1.1

### Patch Changes

- feat: The second parameter of the `rebaseMeta` method supports passing in `"/"`.

## 0.1.0

### Major Changes

- feat: `RouteComponentProps` removes `url` member.
- feat: `RouteRenderContext` removes `url` member.
- feat: `RouteComponentProps.route` is renamed to `RouteComponentProps.pathname`.
- feat: `RouteRenderContext.route` s renamed to `RouteRenderContext.pathname`.
- feat: `defineRender` parameter changes.

### Minor Changes

- feat: `RouteComponentProps` adds `request` member.
- feat: `RouteComponentProps` adds `pathname` member.
- feat: `RouteHandlerContext` adds `pathname` member.
