# 架构 >> 共享依赖 || 30

为了提高性能，你的 Web 应用程序只加载一次大型 JavaScript 库至关重要。你选择的框架（React、Vue、Angular 等）应该只在页面上加载一次。

不建议将所有内容都设置为共享依赖项，因为必须为每个使用它们的 Web Widget 应用立即升级共享依赖项。对于小型库，在使用它们的每个 Web Widget 应用中复制它们可能是可以接受的。例如，`lit` 可能小到足以复制。但是，对于像 `react`、`vue`、`rxjs` 等大型库，你可以考虑让它们共享依赖项。

## 最佳实践

共享依赖有两种主流方法：

1. 导入地图映射
2. 模块联邦

你可以使用其中之一，也可以同时使用两者。我们目前只推荐使用导入地图映射，原因：

1. 它是浏览器标准，虽然目前支持它的浏览器不多，但现在可以通过 `system` 格式的加载器 [SystemJS](https://github.com/systemjs/systemjs) 来支持
2. 模块联邦最大的问题是它是具体构建工具的私有标准，且目前只有 Webpack5 才能使用，并且目前为止它还处于一个不稳定的状态中

不得不承认，共享依赖并不是一个非常高深的技术话题，通过构建工具可以有非常多的实践方式，但当我们深入了解后发现似乎没有比 `system` 更好的方式了，虽然这很违反直觉——毕竟 Webpack 解决了一切的问题，当我们试图离开它的时候总是会不安。

[SystemJS](https://github.com/systemjs/systemjs) 的导入地图映射示例：

```html
<script type="systemjs-importmap">
{
  "imports": {
    "lodash": "https://unpkg.com/lodash@4.17.10/lodash.js"
  }
}
</script>
```

了解如何在让 Web Widget 容器支持 `system` 格式：[System-loader 文档](../../docs/container/plugins/system-loader.md) 