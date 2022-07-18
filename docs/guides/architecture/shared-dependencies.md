# 深入 >> 共享依赖 || 30

为了提高性能，你的 Web 应用程序只加载一次大型 JavaScript 库至关重要。你选择的框架（React、Vue、Angular 等）应该只在页面上加载一次。

不建议将所有内容都设置为共享依赖项，因为升级它们需要非常小心。对于小型库，在每个 Web Widget 应用中复制它们可能是可以接受的。例如，`lit` 可能小到足以复制。但是，对于像 `react`、`vue`、`rxjs` 等大型库，你可以考虑让它们共享依赖项。

## 最佳实践

共享依赖有两种主流方法：

1. [导入映射](https://github.com/WICG/import-maps)
2. [模块联邦](https://webpack.js.org/concepts/module-federation/)

你可以使用其中之一，也可以同时使用两者。我们目前只推荐使用[导入映射](https://github.com/WICG/import-maps)，原因：

1. 它是浏览器标准，经过精心的设计，具备更长远的生命力
2. [模块联邦](https://webpack.js.org/concepts/module-federation/)是 Webpack5 私有格式，并且目前为止它还处于一个不稳定的状态中

不幸的是当今[导入映射](https://github.com/WICG/import-maps)存在浏览器兼容问题，但是 Web Widget 提供了应对措施，请前往指南：[部署导入映射](import-maps.md)。