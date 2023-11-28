# @web-widget/web-router

## 0.5.1

### Patch Changes

- - Clean up unfinished features.

## 0.5.0

### Minor Changes

- Middleware has been enhanced. They are not only used to control HTTP, but also to control the rendering of the page, including access to meta, module, renderOptions, render
- Deployed the jset test framework and miniflare's Worker test environment in the project
- Test cases added, coverage now 72%
- Removed defaultBootstrap option as it can be replaced by meta concept or user-defined layout
- Removed the experimental_loader option because it is only for adapting to the dev server and is no longer needed.
- Removed experimental_render option as it has been replaced by middleware
- Removed csp feature support because it's not ready yet

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.3.0
  - @web-widget/html@0.1.4

## 0.4.4

### Patch Changes

- fix: Browser compatibility issues.

## 0.4.3

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.2.0
  - @web-widget/html@0.1.3

## 0.4.2

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.1.2
  - @web-widget/html@0.1.2

## 0.4.1

### Patch Changes

- feat: The `baseAsset` option supports the use of `"/"`.
- Updated dependencies
  - @web-widget/schema@0.1.1
  - @web-widget/html@0.1.1

## 0.4.0

### Major Changes

- feat: Support setting rendering options for front-end frameworks.
- refactor: API redesign.
  - `RouteComponentProps` removes `url` member.
  - `RouteRenderContext` removes `url` member.
  - `RouteComponentProps.route` is renamed to `RouteComponentProps.pathname`.
  - `RouteRenderContext.route` s renamed to `RouteRenderContext.pathname`.
  - `WebRouterOptions.experimental.loader` is renamed to `WebRouterOptions.experimental_loader`.
  - `WebRouterOptions.experimental.render` is renamed to `WebRouterOptions.experimental_render`.

### Minor Changes

- feat: `RouteComponentProps` adds `request` member.
- feat: `RouteComponentProps` adds `pathname` member.
- feat: `RouteHandlerContext` adds `pathname` member.

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.1.0
  - @web-widget/html@0.1.0

## 0.3.0

### Minor Changes

- refactor: The built-in client entry is no longer output.
