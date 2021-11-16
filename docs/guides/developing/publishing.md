# 应用开发 >> 发布 || 60

大多数情况下，我们推荐将 Web Widget 应用发布在 NPM 中，这样可以随时通过 CDN 集成。当你准备好将包发布到 NPM 时，请确保按照本文档提供的建议，以确保它具有适应时间变化的弹性。

你可以通过 [Web Widget CLI](./development.md) 来简化步骤，你只需要运行 `npm run build` 即可得到待发布的产物。

## 提供 esm 版本

从一开始就写好标准的 ECMAScript，自然而然就会发布标准的 ECMAScript。但是，如果你选择使用 TypeScript 或各种新兴规范或 API 编写组件，请务必在发布前将代码转换为标准 ECMAScript。如果你使用非标准语法；将其（且仅此）转译为合理的现代水平（例如 [TC39 Stage 4](https://github.com/tc39/proposals/blob/master/finished-proposals.md) 和/或可用的跨浏览器），以减少在包含你的包的页面的任何最终生产交付中包含冗长或重复代码的可能性。

## 提供 system 版本

由于目前只有最新的 Chrome 浏览器支持 [import maps](https://github.com/WICG/import-maps)，因此为了能够为了解决兼容问题，应当额外准备一份 `system` 格式版本。

`system` 格式和构建工具无关，无论是 Webpack 或者 Rollup 都内置了它，`system` 格式可以作为全面应用 ES module 之前的过度格式。`system` 支持使用[裸模块](https://github.com/WICG/import-maps)导入，并且 Web Widget 沙盒模式也支持它。

## 打包好所有依赖

默认情况下，Web Widget 应用的使用者不应该关心依赖处理，而应该是直接可用，所以你应当尽可能的将依赖打包在一起，避免宿主无法处理依赖的情况。

## 使用语义化版本管理

Web Widget 应用的宿主可能会允许使用 CDN 自动更新的功能，这意味着 Web Widget 应用都应当随时处于高可用、可预期的状态，因此开发者必须严格遵循语义化版本，应用的**外观**或者功能发生重大变化应当以升级主版本号来发布，以便用户能够做出符合预期的选择。

## 可选：源映射

如果你选择在 TypeScript 中工作，或者使用比上述标准更新的语法，那么包含源映射可以有助于开发者更好的理解它。

## 可选：共享依赖

如果 Web Widget 应用工作在特定环境下，你明确知道宿主提供公共包的名字，这样你可以通过裸模块的方式引入这些包，并且在构建工具中排除这些包，以便和宿主共享公共依赖的浏览器缓存。

详情请前往[依赖共享文档](../architecture/shared-dependencies.md)了解如何部署。

