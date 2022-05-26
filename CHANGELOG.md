# CHANGELOG

## 0.0.25 (2022-05-26)

* 修复 "this.movedCallback is not a function" 的错误

## 0.0.24 (2022-03-15)

* 优化 es-module-shims 环境下的性能

## 0.0.23 (2022-03-07)

* 支持 https://github.com/guybedford/es-module-shims

## 0.0.22 (2022-02-14)

* 增加 `rendertarget` 试验性特性

## 0.0.21 (2022-02-09)

* 修复 ES module loader 某些情况无法工作的问题

## 0.0.20 (2021-12-02)

* 修复 `createLoader()` 钩子的设计错误，它应当返回 `function` 而不是 `Promise`
* 修复生命周期函数的 `this` 不一致的问题

## 0.0.19 (2021-11-25)

* 修复了全局错误可能会重复抛出的问题

## 0.0.18 (2021-11-24)

* 增加 [Application parameters](./rfcs/0005-application-parameters.md) 特性

## 0.0.14 (2021-11-18)

* Web Widget 应用自身也支持支持[导入映射](https://github.com/WICG/import-maps)

## 0.0.11 (2021-11-13)

* 导出 `bootstrap()` 接口，可以手动的控制 `customElements.define('web-widget', HTMLWebWidgetElement)` 时机，以便解决插件可能没有在预期的时间生效的问题
* 可以将任意未注册的标签升级为 Web Widget [#33](https://github.com/web-widget/web-widget/pull/33)

## 0.0.8 (2021-10-31)

* 增加 `createRenderRoot()` 勾子

## 0.0.7 (2021-10-21)

* umd-loader 支持在不知道 name 的情况下获取到 umd 模块

## 0.0.6 (2021-10-20)

* 增加 sandbox 插件

## 0.0.5 (2021-10-19)

* 使用 lerna 管理项目

## 0.0.4-beta (2021-09-30)

* `<web-widget>` 的 `type` 默认值更改为 `"module"`。[#24](https://github.com/web-widget/web-widget/issues/24)
* UMD 格式的加载器不再内置，改用插件支持 extensions/WebWidgerUmdLoader.js
* 通过插件支持 SystemJS 模块格式
* 为了保持对未来 `RealmShadow` 沙箱的兼容，暂时移除现有的沙箱实现
* 支持 `<fallback>` 特性

