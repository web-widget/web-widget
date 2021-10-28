# 架构 >> 共享依赖 || 50

为了提高性能，你的 Web 应用程序只加载一次大型 JavaScript 库至关重要。你选择的框架（React、Vue、Angular 等）应该只在页面上加载一次。

不建议将所有内容都设置为共享依赖项，因为必须为每个使用它们的 Web Widget 应用立即升级共享依赖项。对于小型库，在使用它们的每个 Web Widget 应用中复制它们可能是可以接受的。例如，`react-router` 可能小到足以复制。但是，对于像 `react`、`momentjs`、`rxjs` 等大型库，你可以考虑让它们共享依赖项。

## 最佳实践

共享依赖有两种方法：

1. 导入地图映射
2. 模块联邦

你可以使用其中之一，也可以同时使用两者。我们目前只推荐使用导入地图映射，原因：

1. 它是浏览器标准，并且可以通过 `system` 格式的加载器来立即使用，未来可以随时被替换它而使用真正的 ES module
2. 模块联邦只有 Webpack5 才能使用，它和具体的构建工具绑定在一起，并且还处于不稳定的状态中

## 下一步

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