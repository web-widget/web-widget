# 贡献指南 - Web-Router

欢迎为 web-router 项目贡献代码！本指南帮助您快速了解如何参与项目开发。

## 🚀 快速开始

### 环境准备

```bash
# 克隆项目
git clone https://github.com/web-widget/web-widget.git
cd web-widget

# 安装依赖
pnpm install

# 进入 web-router 目录
cd packages/web-router
```

### 运行测试

```bash
# 单元测试（使用 Vitest）
pnpm test

# 开发模式监听
pnpm run test:watch

# 覆盖率报告
pnpm run test:coverage

# 集成测试
cd ../../playgrounds/router
pnpm test
```

### 测试基础设施

项目使用 **Vitest** 配合 **@cloudflare/vitest-pool-workers** 以获得最佳的 Cloudflare Workers 环境兼容性：

- **测试运行器**: Vitest（比 Jest 更快，更好的 Workers 支持）
- **配置文件**: `vitest.config.ts`
- **运行环境**: Cloudflare Workers 运行时
- **测试覆盖**: 158 个全面测试，Engine 方法 100% 覆盖

## 📐 架构概览

web-router 采用**领域驱动设计**，核心组件：

```
┌─────────────┐    ┌────────────────┐    ┌─────────────────┐    ┌────────────┐
│ Application │───▶│ Router         │───▶│ Engine          │───▶│ Context    │
│ HTTP Layer  │    │ Route Matching │    │ Business Engine │    │ State Mgmt │
└─────────────┘    └────────────────┘    └─────────────────┘    └────────────┘
```

- **Application** (`application.ts`) - HTTP 请求/响应生命周期
- **Router** (`router.ts`) - URL 模式匹配和路由注册
- **Engine** (`engine.ts`) - 🌟 **核心**：统一的业务处理引擎
- **Context** (`context.ts`) - 增强的请求上下文

> 💡 **重点**：Engine 是核心组件，负责模块处理、渲染管道和错误处理

### 模块格式标准

web-router 遵循 **`@web-widget/schema`** 规范，该规范为 web 应用程序定义了技术无关的模块格式标准。这确保了整个框架的一致性、互操作性和类型安全。

**核心模块类型：**

- **路由模块** (`RouteModule`) - 处理 HTTP 请求并渲染页面
- **中间件模块** (`MiddlewareModule`) - 处理请求并修改上下文
- **动作模块** (`ActionModule`) - 可从客户端调用的服务器端函数（JSON-RPC）

**标准优势：**

- **类型安全** - 全面的 TypeScript 定义确保编译时类型检查
- **框架无关** - 模块格式适用于不同的前端技术
- **Web 标准合规** - 基于 Fetch API、ReadableStream 和标准 HTTP 方法构建
- **一致接口** - 所有模块遵循相同的结构和模式

**模块结构示例：**

```typescript
// 遵循 @web-widget/schema 的路由模块
interface RouteModule {
  handler?: RouteHandler | RouteHandlers; // HTTP 方法处理器
  render?: ServerRender; // 服务器端渲染函数
  meta?: Meta; // HTML head 元数据
  default?: RouteComponent; // 组件引用
}
```

> 📋 **参考**: 查看 `packages/schema/README.md` 获取完整的模块格式规范和类型定义。

### 设计原则

- **标准化模块格式** - 遵循 `@web-widget/schema` 规范，提供技术无关的模块定义
- **领域驱动设计** - 使用明确的领域对象替代函数式组合
- **统一处理管道** - 所有请求（正常/错误）都通过一致的处理流程
- **单一职责** - 每个组件有明确的职责边界
- **向后兼容** - 保持现有 API 不变
- **全面测试** - 100% 方法覆盖，企业级测试质量

### 文件结构

```
packages/web-router/src/
├── index.ts          # 入口文件，WebRouter 类定义
├── application.ts    # Application 领域对象
├── router.ts         # Router 领域对象
├── engine.ts         # Engine 领域对象（核心）
├── context.ts        # Context 领域对象
├── types.ts          # TypeScript 类型定义
├── layout.ts         # 默认布局模块
├── fallback.ts       # 默认错误页面模块
├── url.ts            # URL 处理工具
└── vitest.config.ts  # Vitest Cloudflare Workers 配置
```

### 数据流

#### 请求处理流程

1. **HTTP Request** → Application 接收请求
2. **Route Matching** → Router 匹配路由模式
3. **Context Creation** → 创建请求上下文
4. **Module Processing** → Engine 处理模块（Route/Middleware/Action）
5. **Render Pipeline** → 统一渲染管道处理
6. **HTTP Response** → 返回响应

#### 模块类型

- **Route Module**: 页面路由处理器
- **Middleware Module**: 中间件处理器
- **Action Module**: RPC 动作处理器

#### 渲染管道

所有响应类型（200/404/500）使用统一的渲染流程：

```
Handler → render() → Engine → Layout → Response
```

### 关键设计决策

#### 1. 统一渲染管道

让正常页面和错误页面使用相同的渲染流程，确保一致的用户体验和共享的布局系统。

#### 2. Engine 引擎模式

集中管理模块处理、缓存机制和错误处理，避免代码重复，提供一致的处理接口。

#### 3. 缓存机制

使用 WeakMap 缓存模块渲染函数，在开发模式禁用缓存支持热重载，生产模式启用缓存提升性能。

#### 4. 错误处理

统一错误处理流程，支持自定义错误页面，开发/生产环境差异化显示。

#### 5. 测试基础设施现代化

迁移到 Vitest 带来的优势：

- **3-5倍更快**的测试执行速度
- **原生 Cloudflare Workers** 环境支持
- **更好的 TypeScript** 集成和错误报告
- **现代测试特性**如全面的 async/await 支持

## 🔧 开发工作流

### 1. 功能开发

```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 开发...
# 测试...

# 提交代码
git add .
git commit -m "feat: add your feature description"
```

### 2. 测试验证

```bash
# 运行所有测试（158 个全面测试）
pnpm test

# TDD 监听模式
pnpm run test:watch

# 类型检查
npx tsc --noEmit

# 代码规范检查
pnpm run lint

# 覆盖率报告（验证 100% Engine 覆盖）
pnpm run test:coverage
```

### 3. 提交 PR

1. 推送到您的分支
2. 创建 Pull Request
3. 等待代码审查
4. 根据反馈修改

## 📚 深入学习

### 必读文档

1. **[README.md](./README.md)** - 项目概述和快速开始
2. **[packages/schema/README.md](../schema/README.md)** - 模块格式标准规范和类型定义
3. **本文档** - 完整的贡献指南和架构设计

### 代码阅读路径

推荐按以下顺序阅读代码：

1. **`types.ts`** - 理解类型定义
2. **`context.ts`** - 了解上下文对象
3. **`router.ts`** - 掌握路由匹配
4. **`engine.ts`** - 🌟 **重点**：核心业务逻辑
5. **`application.ts`** - HTTP 层处理
6. **`index.ts`** - 整体集成
7. **`*.test.ts`** - 学习全面的测试模式

### 实践项目

在 `playgrounds/router` 中查看实际使用示例：

- 路由定义和处理
- 中间件使用
- 错误页面处理
- 流式渲染

## 🎉 贡献认可

所有贡献者都会在项目中得到认可！感谢您帮助 web-router 变得更好！

---

## 📋 检查清单

提交 PR 前请确认：

- [ ] 代码遵循项目规范
- [ ] 添加了全面的测试（遵循 Engine 测试模式）
- [ ] 所有测试通过 Vitest
- [ ] 更新了相关文档
- [ ] 无 TypeScript 类型错误
- [ ] 向后兼容（如适用）
- [ ] 考虑了性能影响
- [ ] 保持 Cloudflare Workers 兼容性

**Happy Coding! 🚀**
