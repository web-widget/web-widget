# @web-widget/vite-plugin

Vite plugin for Web Router.

React components statically importing React `@widget` modules create independent
widget boundaries, including imports from ordinary components. A light-DOM
React widget used with `widget={{ serverOnly: true }}` renders as a native
component without an independent widget host or client mount. Other framework
transforms retain their existing import behavior.

## 文档

- [Vite 8 迁移与构建改进说明](./docs/vite8-migration-build.zh.md)
- [RFC：Widget Module 双环境反转构建](../../rfcs/widget-module-build.zh.md)
