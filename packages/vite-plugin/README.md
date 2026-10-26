# @web-widget/vite-plugin

Vite plugin for Web Router.

In ordinary component modules, same-framework static `@widget` imports render
as native components. Use the existing `widget(() => import(...))` adapter API
when an independent widget boundary is needed. Static imports in route and
widget modules continue to create widget boundaries automatically.

## 文档

- [Vite 8 迁移与构建改进说明](./docs/vite8-migration-build.zh.md)
- [RFC：Widget Module 双环境反转构建](../../rfcs/widget-module-build.zh.md)
