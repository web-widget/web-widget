# CHANGELOG

## 0.0.11 (2012-11-13)

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

