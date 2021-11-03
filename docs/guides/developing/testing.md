# 应用开发 >> 测试 ||30

如果你在项目生成器中选择测试选项，它将为您的小挂件构建一些示例测试。

## Web Test Runner

我们推荐使用 [@web/test-runner](https://modern-web.dev/docs/test-runner/overview/) 来测试 Web Widget。它基于 `@web/dev-server`，遵循相同的方法使用原生 es modules，并在真实浏览器中运行测试。

## 运行测试

要运行测试，请执行以下命令：

```
npm run test
```

这将在本地安装的 Chrome 浏览器中运行测试。Web Test Runner 中还有许多其他浏览器选项。

要在监视模式下运行测试，请执行以下命令：

```
npm run test:watch
```

这将使测试运行器保持打开状态。编辑文件将重新运行相关的测试。

## 分步指南

[按照本指南](https://modern-web.dev/guides/test-runner/getting-started/)获取有关使用 Web Test Runner 的完整分步指南。