# @web-widget/vite-plugin

Vite plugin for Web Router.

In ordinary component modules, same-framework static `@widget` imports stay
native by default. To convert them into widget boundaries, set
`sameFrameworkImports: 'widget'` on that framework's transform in
`webWidgetPlugin({ transforms: [...] })`. Static imports in route and widget
modules, and explicit `widget(() => import(...))` calls, continue to create
widget boundaries without this option.

## 文档

- [Vite 8 迁移与构建改进说明](./docs/vite8-migration-build.zh.md)
- [RFC：Widget Module 双环境反转构建](../../rfcs/widget-module-build.zh.md)
