# @web-widget/web-router

基于 Web Workers 标准的服务器。

## 📚 文档

- **[贡献指南](./CONTRIBUTING.md)** - 包含架构设计和贡献工作流程的完整指南
- **[重构总结](./REFACTOR_SUMMARY.md)** - 架构重构详情和改进
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

web-router 采用**领域驱动设计**，具有清晰的关注点分离：

- **Application** - HTTP 请求/响应生命周期管理
- **Router** - URL 模式匹配和路由注册
- **Engine** - 核心业务逻辑和统一处理管道
- **Context** - 增强的请求状态和渲染方法

## 🤝 贡献

我们欢迎贡献！请查看我们的[贡献指南](./CONTRIBUTING.md)了解详情：

- 设置开发环境
- 代码标准和最佳实践
- 测试策略
- 常见贡献场景

贡献指南包含详细的架构信息和设计原则。

## 🙏 致谢

web-router 项目受到以下项目启发：

- [Fresh](https://fresh.deno.dev)
- [Hono](https://hono.dev)
