# @web-widget/schema

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
