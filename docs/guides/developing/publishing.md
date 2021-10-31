# 开发 >> 发布 ||60

当你准备好将包发布到 NPM 时，请确保你已解决以下建议，以确保你发布的代码尽可能易于用户使用。你的包应该已经有演示、文档、[测试](./testing.md)等，因为每一个都在为你的工作做出最清晰的例子中发挥作用，概述将工作集成到其他项目的最简单途径，并确保包总体而言，它具有适应时间变化的弹性。考虑到这一现实，下面将不直接讨论它们。如果你正在寻找有关在已发布的软件包中包含这些内容的信息，请查看我们的[指南](../index.md)。

## 提供标准 ES module 格式版本

从一开始就写好标准的 EcmaScript，自然而然就会发布标准的 EcmaScrip。但是，如果你选择使用 TypeScript 或各种新兴规范或 API 编写组件，请务必在发布前将代码转换为标准 EcmaScript。如果你使用非标准语法；将其（且仅此）转译为合理的现代水平（例如 [TC39 Stage 4](https://github.com/tc39/proposals/blob/master/finished-proposals.md) 和/或可用的跨浏览器），以减少在包含你的包的页面的任何最终生产交付中包含冗长或重复代码的可能性。


## 提供 `system` 格式版本

目前只有最新的 Chrome 浏览器支持 [import maps](https://github.com/WICG/import-maps)，而 Web Widget 沙盒模式也未能支持 ES module 格式，因此为了能够更好的兼容，应当额外准备一份 `system` 格式版本。

`system` 格式和构建工具无关，无论是 Webpack 或者 Rollup 都很好的支持它，它可以作为全面应用 ES module 之前的过度格式。`system` 支持使用[裸模块](https://github.com/WICG/import-maps)导入，Web Widget 沙盒模式也支持它。

## 打包好所有依赖

默认情况下，Web Widget 应用的使用者不应该关心依赖处理，而应该是直接可用，所以你应当尽可能的将依赖打包在一起，当然，这会要求你避免在 Web Widget 应用中引入大型依赖。

## package.json: 定义 `module` 与 `system` 字段

```json
{
  "main": "dist/cjs/app.widget.js",
  "module": "dist/esm/app.widget.js",
  "system": "dist/system/app.widget.js"
}
```

完整要求参考 Web Widget [应用清单文档](../../docs/manifest/overview.md)。

## 使用语义化版本管理

Web Widget 应用的宿主可能采用在公共 CDN 在浏览器上自动更新版本的方案，而不需要经过构建、测试等流程，这意味着要求 Web Widget 应用开发者必须严格遵循语义化版本：应用的外观发生重大变化应当升级主版本号。

## 可选：源映射

如果你选择在 TypeScript 中工作，或者使用比上述标准更新的语法，那么包含源映射可以有助于用户更好的理解它。

## 可选：共享依赖

如果 Web Widget 应用工作在特定环境下，你明确知道宿主提供公共包的名字，这样你可以通过裸模块的方式引入这些包，并且在构建工具中排除这些包，以便和宿主共享这些包。

```js
import Vue from 'vue';
```

宿主如何实现共享依赖？详情请前往[依赖共享文档](../architecture/shared-dependencies.md)。

