# @web-widget/vite-plugin

Vite plugin for Web Router.

In ordinary component modules, local widgets are composed inline by default.
Set `widgetComposition: 'island'` on a framework transform in
`webWidgetPlugin({ transforms: [...] })` to give them independent widget
boundaries and client hydration. Static imports in route and widget modules,
and explicit `widget(() => import(...))` calls, always create widget boundaries.

## 文档

- [Vite 8 迁移与构建改进说明](./docs/vite8-migration-build.zh.md)
- [RFC：Widget Module 双环境反转构建](../../rfcs/widget-module-build.zh.md)
