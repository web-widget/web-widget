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
# 单元测试
npm test

# 集成测试
cd ../../playgrounds/router
npm test
```

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

### 设计原则

- **领域驱动设计** - 使用明确的领域对象替代函数式组合
- **统一处理管道** - 所有请求（正常/错误）都通过一致的处理流程
- **单一职责** - 每个组件有明确的职责边界
- **向后兼容** - 保持现有 API 不变

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
└── url.ts            # URL 处理工具
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
# 运行所有测试
npm test

# 类型检查
npx tsc --noEmit

# 代码规范检查
npm run lint
```

### 3. 提交 PR

1. 推送到您的分支
2. 创建 Pull Request
3. 等待代码审查
4. 根据反馈修改

## 📝 代码规范

### TypeScript 规范

```typescript
// ✅ 好的示例
interface MyModule {
  handler: MyHandler;
  config?: MyConfig;
}

class MyProcessor {
  async process(module: MyModule): Promise<MiddlewareHandler> {
    // 实现...
  }
}

// ❌ 避免的写法
function processModule(module: any): any {
  // 缺少类型安全
}
```

### 测试规范

```typescript
// ✅ 好的测试
describe('Engine', () => {
  it('should process route modules correctly', async () => {
    // Arrange
    const engine = new Engine(mockOptions);
    const mockModule = createMockRouteModule();

    // Act
    const handler = await engine.processRoute();

    // Assert
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });
});
```

### 文档规范

```typescript
/**
 * 处理路由模块
 *
 * @param route - 路由模块或模块加载函数
 * @returns 中间件处理器
 */
async processRoute(route: RouteModule | (() => Promise<RouteModule>)): Promise<MiddlewareHandler> {
  // 实现...
}
```

## 🎯 常见贡献场景

### 场景 1：添加新的模块类型

框架提供清晰的扩展点，如果您想支持新的模块类型：

1. **定义模块接口** (`types.ts`)
2. **在 Engine 中添加处理方法** (`engine.ts`)
3. **在 WebRouter 中集成** (`index.ts`)
4. **添加测试**
5. **更新文档**

扩展示例：

- **模块类型扩展**: 在 Engine 中添加新的处理方法
- **中间件开发**: 标准的中间件模式
- **自定义渲染器**: 扩展渲染选项
- **路由处理器**: 自定义路由逻辑

### 场景 2：优化渲染性能

渲染优化通常涉及：

1. **缓存策略改进** (`engine.ts` 中的 `MODULE_CACHE`)
2. **流式渲染优化** (`renderToResponse` 方法)
3. **元数据处理优化**

性能优化点：

- **模块缓存**: WeakMap 缓存渲染函数
- **流式渲染**: 支持渐进式响应
- **高效路由**: 原生 URLPattern API
- **延迟加载**: 支持异步模块加载

### 场景 3：增强错误处理

错误处理改进可能包括：

1. **新的错误类型支持** (`transformHTTPException`)
2. **错误页面模板增强** (`fallback.ts`)
3. **开发工具改进** (错误堆栈、源码映射)

### 场景 4：扩展中间件系统

中间件系统扩展：

1. **中间件生命周期钩子**
2. **中间件配置选项**
3. **中间件组合模式**

## 🧪 测试指南

### 单元测试策略

```typescript
// Engine 测试重点
describe('Engine', () => {
  describe('processRoute', () => {
    it('should handle sync modules', async () => {
      /* ... */
    });
    it('should handle async modules', async () => {
      /* ... */
    });
    it('should cache render functions', async () => {
      /* ... */
    });
  });

  describe('renderToResponse', () => {
    it('should render normal pages', async () => {
      /* ... */
    });
    it('should render error pages', async () => {
      /* ... */
    });
    it('should handle layout errors', async () => {
      /* ... */
    });
  });
});
```

### 集成测试策略

```typescript
// 完整流程测试
describe('WebRouter Integration', () => {
  it('should handle complete request cycle', async () => {
    const router = WebRouter.fromManifest({
      routes: [{ pathname: '/test', module: testModule }],
    });

    const response = await router.dispatch('/test');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('expected content');
  });
});
```

## 🔍 调试技巧

### 开发模式调试

```typescript
const router = WebRouter.fromManifest(manifest, {
  dev: true, // 启用开发模式
  onFallback: (error, context) => {
    console.error('🚨 Error details:', {
      error: error.message,
      stack: error.stack,
      url: context?.request.url,
      method: context?.request.method,
    });
  },
});
```

### 性能分析

```typescript
// 添加性能监控
const startTime = performance.now();
const response = await router.dispatch(request);
const endTime = performance.now();
console.log(`Request processed in ${endTime - startTime}ms`);
```

## 📚 深入学习

### 必读文档

1. **[README.md](./README.md)** - 项目概述和快速开始
2. **本文档** - 完整的贡献指南和架构设计

### 代码阅读路径

推荐按以下顺序阅读代码：

1. **`types.ts`** - 理解类型定义
2. **`context.ts`** - 了解上下文对象
3. **`router.ts`** - 掌握路由匹配
4. **`engine.ts`** - 🌟 **重点**：核心业务逻辑
5. **`application.ts`** - HTTP 层处理
6. **`index.ts`** - 整体集成

### 实践项目

在 `playgrounds/router` 中查看实际使用示例：

- 路由定义和处理
- 中间件使用
- 错误页面处理
- 流式渲染

## ❓ 获取帮助

### 常见问题

**Q: 如何添加新的 HTTP 方法支持？**  
A: 在 `application.ts` 的 `METHODS` 数组中添加，框架会自动生成对应方法。

**Q: 如何自定义错误页面？**  
A: 在 manifest 的 `fallbacks` 中定义自定义错误模块。

**Q: 如何优化渲染性能？**  
A: 检查 `MODULE_CACHE` 使用情况，考虑流式渲染 (`progressive: true`)。

### 联系我们

- **GitHub Issues** - 报告 Bug 或功能请求
- **Discussions** - 技术讨论和问答
- **Pull Request** - 直接提交代码贡献

## 🎉 贡献认可

所有贡献者都会在项目中得到认可！感谢您帮助 web-router 变得更好！

---

## 📋 检查清单

提交 PR 前请确认：

- [ ] 代码遵循项目规范
- [ ] 添加了必要的测试
- [ ] 所有测试通过
- [ ] 更新了相关文档
- [ ] 无 TypeScript 类型错误
- [ ] 向后兼容（如适用）

**Happy Coding! 🚀**
