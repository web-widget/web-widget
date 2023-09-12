# @web-widget/schema

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
