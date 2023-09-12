# @web-widget/web-router

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
