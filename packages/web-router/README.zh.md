# @web-widget/web-router

基于 Web 标准的服务器。

## 📚 文档

- **[贡献指南](./CONTRIBUTING.zh.md)** - 包含架构设计和贡献工作流程的完整指南
- **[中文文档](./README.zh.md)** - 中文文档
- **[中文贡献指南](./CONTRIBUTING.zh.md)** - 中文贡献指南

## 🚀 快速开始

```typescript
import WebRouter from '@web-widget/web-router';

const router = WebRouter.fromManifest({
  routes: [
    {
      pathname: '/hello',
      module: {
        handler: {
          GET() {
            return new Response('Hello World!');
          },
        },
      },
    },
  ],
});

// 处理请求
const response = await router.dispatch('http://localhost/hello');
```

## 🏗️ 架构概览

Web Router 将 manifest 装配、HTTP 调度、路由匹配、模块执行、渲染和错误处理分开：

- **WebRouter** 将 manifest 装配为执行管道。
- **Application** 管理 HTTP 生命周期、middleware 调度和 rewrite。
- **URLPatternRouter** 执行编译后的路由匹配。
- **ModuleRuntime** 协调模块加载、激活、handler 和渲染。
- **Context** 保存请求级状态和后台任务。
- **错误处理**归一化任意抛出值，并路由到 fallback module。

职责边界、请求与错误流程图、缓存所有权和内部模块结构见[中文贡献指南](./CONTRIBUTING.zh.md)。

## 🤝 贡献

我们欢迎贡献！请查看我们的[贡献指南](./CONTRIBUTING.zh.md)了解详情：

- 设置开发环境
- 代码标准和最佳实践
- 测试策略
- 常见贡献场景

贡献指南包含详细的架构信息和设计原则。

## 🙏 致谢

web-router 项目受到以下项目启发：

- [Fresh](https://fresh.deno.dev)
- [Hono](https://hono.dev)
