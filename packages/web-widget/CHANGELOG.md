# CHANGELOG

## 1.0.1

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.1.2

## 1.0.0

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.1.1

## 1.0.0-alpha.12

### Patch Changes

- Updated dependencies
  - @web-widget/schema@0.1.0

## 1.0.0-alpha.11

### Patch Changes

- refactor: Lazy registration of definition elements so users can override lifecycle functions.

## 1.0.0-beta.3 - 1.0.0-beta.10

此版本为破坏性升级。

- 采用 [WidgetModule](https://github.com/web-widget/web-widget/tree/dev/packages/schema) 格式
- `rendertarget` 更名为 `renderTarget`
- `application` 更名为 `loader`
- `properties` 更名为 `context`
- `createProperties` 更名为 `createContext`
- 删除 `customContext`
- 删除 `createParameters` 与 `parameters`
- 删除 `createData`
- `hydrateonly` 更名为 `recovering`
- `state` 更名为 `status`
- 删除 `fallback` 元素
- 删除 `placeholder` 元素
- 增加 `base` 设置，用于确定相对路径的 `import`
- 删除 `type`
- 删除 `src`
- `loading` 默认值变更为 `eager`

## 1.0.0-beta.3

- 修复超时错误消息没有正确显示的问题

## 1.0.0-beta.2

- 修复 `<fallback>` 元素没有按照预期工作的问题
- 删除超时的控制台警告特性

## 1.0.0-beta.1

重构钩子机制。

- 恢复应用格式 `parameters` 成员
- 增加 `customProperties` 用于自定义生命周期的成员
- 删除 `WebWidgetDependencies` 类（使用 `createProperties()` 代替）
- `createDependencies()` 更名为 `createProperties()`
- `createRenderRoot()` 更名为 `createContainer()`
- 增加 `createData()`
- 增加 `createParameters()`
- `createLoader()` 更名为 `createApplication()`
- 增加 `update` 事件用于获取更新后的数据
- 应用无法修改容器元素上的 `data` 属性，必须使用 `update` 事件来获取应用修改后的 `data`

## 1.0.0-beta.0 (2022-07-18)

对应用格式与容器进行精简，删除实验性特性，只保留核心功能。

- 应用格式变更：
  - 删除 `context` 接口，将 `context` 的 `mount`、`udate`、`unmount` 成员迁移到 `container`
  - `parameters` 更名为 `env`
  - 删除 `name`
  - 删除 `sandboxed`
  - 删除 `createPortal`
- 容器功能变更：
  - 无需插入 DOM 即可以调用 `bootstrap()` 函数，方便进行手动预加载应用
  - `data` 默认值由空对象变更为 `null`
  - 删除容器的别名功能
  - 删除沙箱功能， `sandboxed`、`csp`、`createSandbox`（沙箱功能留给后续版本）
  - 删除运行动态字符串的功能 `text`
  - 删除 `name` 属性

## 0.0.27 (2022-06-09)

- 支持 hydrateonly 属性，为 SSR 做准备

## 0.0.26 (2022-05-26)

- 修复 "this.movedCallback is not a function" 的错误

## 0.0.24 (2022-03-15)

- 优化 es-module-shims 环境下的性能

## 0.0.23 (2022-03-07)

- 支持 https://github.com/guybedford/es-module-shims

## 0.0.22 (2022-02-14)

- 增加 `rendertarget` 试验性特性

## 0.0.21 (2022-02-09)

- 修复 ES module loader 某些情况无法工作的问题

## 0.0.20 (2021-12-02)

- 修复 `createLoader()` 钩子的设计错误，它应当返回 `function` 而不是 `Promise`
- 修复生命周期函数的 `this` 不一致的问题

## 0.0.19 (2021-11-25)

- 修复了全局错误可能会重复抛出的问题

## 0.0.18 (2021-11-24)

- 增加 [Application parameters](./rfcs/0005-application-parameters.md) 特性

## 0.0.14 (2021-11-18)

- Web Widget 应用自身也支持支持[导入映射](https://github.com/WICG/import-maps)

## 0.0.11 (2021-11-13)

- 导出 `bootstrap()` 接口，可以手动的控制 `customElements.define('web-widget', HTMLWebWidgetElement)` 时机，以便解决插件可能没有在预期的时间生效的问题
- 可以将任意未注册的标签升级为 Web Widget [#33](https://github.com/web-widget/web-widget/pull/33)

## 0.0.8 (2021-10-31)

- 增加 `createRenderRoot()` 勾子

## 0.0.7 (2021-10-21)

- umd-loader 支持在不知道 name 的情况下获取到 umd 模块

## 0.0.6 (2021-10-20)

- 增加 sandbox 插件

## 0.0.5 (2021-10-19)

- 使用 lerna 管理项目

## 0.0.4-beta (2021-09-30)

- `<web-widget>` 的 `type` 默认值更改为 `"module"`。[#24](https://github.com/web-widget/web-widget/issues/24)
- UMD 格式的加载器不再内置，改用插件支持 extensions/WebWidgerUmdLoader.js
- 通过插件支持 SystemJS 模块格式
- 为了保持对未来 `RealmShadow` 沙箱的兼容，暂时移除现有的沙箱实现
- 支持 `<fallback>` 特性
