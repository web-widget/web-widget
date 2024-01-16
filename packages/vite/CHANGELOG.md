# @web-widget/vite

## 2.11.2

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.8.0

## 2.11.1

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.7.7

## 2.11.0

### Minor Changes

- Fix package.json peer dependency bug.
- The value of `IS_BROWSER` will be statically analyzed by build tools.
- Supports importing components in the `@widget` format file in the client.
- Make `webWidgetPlugin` configuration easier to understand: use `import` and `export` instead of `toComponents` and `toWebWidgets` respectively.
- Fix package.json peer dependency bug.

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.7.6
  - @web-widget/web-widget@1.8.0

## 2.10.0

### Minor Changes

- Eliminate whitespace characters in page script tags.

## 2.9.0

### Minor Changes

- Add file system routing feature.
- Improve vite performance.

## 2.8.5

### Patch Changes

- Updated dependencies
  - @web-widget/web-widget@1.7.2
  - @web-widget/schema@0.4.3
  - @web-widget/web-router@0.7.5

## 2.8.4

### Patch Changes

- Fix the error that $source may be undefined in dev mode.
- Updated dependencies
  - @web-widget/web-widget@1.7.1
  - @web-widget/schema@0.4.2
  - @web-widget/web-router@0.7.4

## 2.8.3

### Patch Changes

- Updated dependencies
  - @web-widget/web-widget@1.7.0

## 2.8.2

### Patch Changes

- Fix the problem of css not taking effect on page 500.
- Updated dependencies
- Updated dependencies
  - @web-widget/web-router@0.7.3
  - @web-widget/schema@0.4.1
  - @web-widget/web-widget@1.6.2

## 2.8.1

### Patch Changes

- Prevent server-side files from being exposed to clients.
- Fix the css loss problem of fallbacks module.
- Updated dependencies
  - @web-widget/web-router@0.7.2
  - @web-widget/web-widget@1.6.1

## 2.8.0

### Minor Changes

- Refactor web-widget-inspector using web components.

### Patch Changes

- Updated dependencies
  - @web-widget/web-widget@1.6.0

## 2.7.1

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.7.1

## 2.7.0

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.7.0
  - @web-widget/schema@0.4.0
  - @web-widget/node@0.5.0

## 2.6.0

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.6.0

## 2.5.5

### Patch Changes

- Avoid accidental loss of render method after rollup build.

## 2.5.4

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.5.2

## 2.5.3

### Patch Changes

- Collect the CSS to be injected to the HTML to avoid FLOUC.

## 2.5.2

### Patch Changes

- Updated dependencies
  - @web-widget/node@0.4.2

## 2.5.1

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.5.1
  - @web-widget/node@0.4.1

## 2.5.0

### Minor Changes

- Adaptation @web-widget/web-router@0.5.0

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.5.0
  - @web-widget/schema@0.3.0
  - @web-widget/node@0.4.0

## 2.4.4

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @web-widget/node@0.3.0
  - @web-widget/web-router@0.4.4

## 2.4.3

### Patch Changes

- Updated dependencies
  - @web-widget/node@0.2.0

## 2.4.2

### Patch Changes

- Updated dependencies
  - @web-widget/node@0.1.2

## 2.4.1

### Patch Changes

- Updated dependencies
  - @web-widget/node@0.1.1

## 2.4.0

### Minor Changes

- refactor: click to source.

## 2.3.0

### Minor Changes

- feat: Add "Click-To-Source" feature.

## 2.2.1

### Patch Changes

- fix: The problem of global configuration cache loss.

## 2.2.0

### Minor Changes

- feat: Support [`fetchPriority`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLinkElement/fetchPriority).

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.2.0
  - @web-widget/web-router@0.4.3

## 2.1.0

### Minor Changes

- feat: Display the name of the component.

## 2.0.2

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.1.2
  - @web-widget/web-router@0.4.2

## 2.0.1

### Patch Changes

- feat: Automatically set Web Router's `baseAsset` and `baseModule` options.
- Updated dependencies
  - @web-widget/schema@0.1.1
  - @web-widget/web-router@0.4.1

## 2.0.0

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.4.0
  - @web-widget/schema@0.1.0

## 1.1.2

### Patch Changes

- fix: Some files are not refreshed after changes.

## 1.1.1

### Patch Changes

- Updated dependencies
  - @web-widget/web-widget@1.0.0-alpha.11

## 1.1.0

### Minor Changes

- chore: Add cjs format to Node.js environment.

### Patch Changes

- Updated dependencies
  - @web-widget/node@0.1.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @web-widget/web-router@0.3.0

## 0.6.0

### Minor Changes

- fix: Compatibility issues between cjs and esm interoperability.
