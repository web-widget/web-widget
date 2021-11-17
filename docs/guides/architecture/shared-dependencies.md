# 容器化 >> 共享依赖 || 30

为了提高性能，你的 Web 应用程序只加载一次大型 JavaScript 库至关重要。你选择的框架（React、Vue、Angular 等）应该只在页面上加载一次。

不建议将所有内容都设置为共享依赖项，过多的浏览器请求将会影响性能。对于小型库，在每个 Web Widget 应用中复制它们可能是可以接受的。例如，`lit` 可能小到足以复制。但是，对于像 `react`、`vue`、`rxjs` 等大型库，你可以考虑让它们共享依赖项。

## 最佳实践

共享依赖有两种主流方法：

1. [导入映射](https://github.com/WICG/import-maps)
2. [模块联邦](https://webpack.js.org/concepts/module-federation/)

你可以使用其中之一，也可以同时使用两者。我们目前只推荐使用[导入映射](https://github.com/WICG/import-maps)映射，原因：

1. 它是浏览器标准，并且能够通过 `system` 格式以及对应的加载器 [SystemJS](https://github.com/systemjs/systemjs) 来做到在生产环境中使用
2. [模块联邦](https://webpack.js.org/concepts/module-federation/)是 Webpack5 私有格式，并且目前为止它还处于一个不稳定的状态中，我们担心它不具备长远的生命力

不得不承认，共享依赖并不是一个非常高深的技术话题，通过构建工具的帮助你可以找到很多种实践，但当我们深入了解后发现似乎没有比 `system` 更好的方式了，虽然这很违反直觉——毕竟 Webpack 解决了几乎一切的问题，而 [SystemJS](https://github.com/systemjs/systemjs) 还不为人知。

Web Widget 提供了在生产环境中部署导入映射的指南：[部署导入映射](import-maps.md)