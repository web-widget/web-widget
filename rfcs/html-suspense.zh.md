# RFC：HTML 模板 Suspense 渐进式渲染

状态：草案

## 摘要

为 `@web-widget/html` 实现类似 React Suspense 的渐进式渲染能力。当模板中包含异步内容时，不再阻塞整个流等待其完成，而是立即发送 fallback 占位符并继续流式传输后续内容；异步内容就绪后，通过 DOM 替换脚本将其注入正确位置。这使得页面的同步部分能够立即到达客户端，显著提升首屏性能。

## 背景

### 当前状态：顺序流

`@web-widget/html` 的 `HTML` 类是 `AsyncGenerator<string>`，消费方通过 `for await...of` 逐块拉取。遇到 Promise 类型的插值时，迭代器会 **await 并阻塞**，直到 Promise resolve 后才继续：

```
模板: <div>${slowA}${fastB}</div>

当前行为（顺序）:
  ──────────────────────► 时间
  <div>  [等待 slowA...]  slowA结果  fastB结果  </div>
                         ▲ fastB 被阻塞，直到 slowA 完成
```

页面上 `fastB` 后面的所有内容都要等 `slowA` 完成才能开始流式传输。当前虽有 `fallback()` 错误边界，但异步内容（Promise）没有"先占位、后替换"的机制。

### 目标：渐进式渲染

```
目标行为（渐进式）:
  ──────────────────────────────────────► 时间
  <div>  fallbackA  fastB  </div>  ...  [A resolve]  swapA脚本
                                        ▲ A 的结果通过脚本替换 fallback
```

## 设计方案

### 1. 核心原理：基于标记的 DOM 替换协议

这是 React 等框架广泛使用的成熟技术，核心分两阶段。

#### 阶段一：发送 Fallback 占位符

渲染遇到 Suspense 边界时，立即输出：

```html
<!--$H?--><template id="HB:0"></template>加载中...<!--/$H-->
```

- `<!--$H?-->`：Suspense 边界起始标记（HTML 注释，不影响渲染）
- `<template id="HB:0">`：占位锚点（`template` 元素本身不可见，但可作为位置标记）
- `加载中...`：fallback 内容（用户可见）
- `<!--/$H-->`：边界结束标记

#### 阶段二：发送解析后的内容 + 替换脚本

异步内容 resolve 后，在流末尾输出：

```html
<div hidden id="HS:0">真实内容</div>
<script>
  $HRC('HS:0', 'HB:0');
</script>
```

- `<div hidden id="HS:0">`：包含解析后内容的隐藏容器
- `$HRC` 脚本：在浏览器中执行 DOM 替换操作

#### `$HRC` 脚本的工作原理

```
替换前 DOM:
  <!--$H?--><template id="HB:0"></template>加载中...<!--/$H-->

调度中:
  <!--$H~--><template id="HB:0"></template>加载中...<!--/$H-->

替换后 DOM:
  真实内容
```

`$HRC(source, destination)` 的步骤：

1. 将 `(source, destination)` 推入批量缓冲区
2. 如果尚未调度，通过 `requestAnimationFrame` 注册批量执行
3. rAF 回调中，对每对 `(source, destination)`：
   a. 定位 `destination` 前面的注释节点 `<!--$H?-->`，改为 `<!--$H~-->`（标记为调度中，防止重入）
   b. 删除该注释和 `<!--/$H-->` 之间的所有 fallback 节点
   c. 将 `source` 的子节点插入到原来 fallback 的位置
   d. 清理 `source`、注释标记等无用节点
   e. 将 `<!--$H~-->` 改为 `<!--$H-->`（标记为已完成）

批量处理将多个 Suspense 边界的 DOM 操作合并到单次 rAF 回调，避免多次同步 reflow。

### 2. 两阶段渲染架构

```
                         ┌──────────────────────────────────┐
                         │       renderToStream(content)       │
                         └──────────┬───────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
              Phase 1:         Context        Phase 2:
              主模板流          (收集 deferred)  deferred 流
                    │                               │
                    ▼                               ▼
         ┌──────────────────┐          ┌──────────────────────┐
         │ 遇到 Suspense →  │          │ 并发 resolve 所有     │
         │ 立即输出 fallback │          │ deferred，输出结果    │
         │ + 注册 deferred  │          │ + swap 脚本           │
         └──────────────────┘          └──────────────────────┘
```

### 3. 流式上下文

`Suspense` 类根据是否存在 **流式上下文** 表现不同：

| 模式     | 条件                   | 行为                                  |
| -------- | ---------------------- | ------------------------------------- |
| 流式模式 | 在 `renderToStream` 内 | 输出 fallback + 标记，注册 deferred   |
| 直通模式 | 直接 `for await...of`  | 阻塞等待 content，出错则输出 fallback |

直通模式保证向后兼容——不使用 `renderToStream` 时，`Suspense` 的行为与普通的 try/catch fallback 一致。

通过模块级 **上下文栈** 管理：

```
renderToStream() 调用:
  1. push(ctx)        ← 压入上下文
  2. 迭代主模板        ← Suspense 检测到 ctx，走流式模式
  3. drain deferreds  ← 继续在 ctx 内，支持嵌套 Suspense
  4. pop()            ← 弹出上下文
```

**并发安全说明**：上下文栈在每个 `ReadableStream` 的 pull 消费中是串行的（一次只有一个 `next()` 在执行）。与参考实现（模块级数组）具有相同的并发语义，但隔离性更好。

### 4. 并发 Deferred 的顺序化（AsyncQueue）

Phase 2 中，多个 deferred 内容 **并发 resolve**，但 `ReadableStream` 需要 **顺序输出**。使用 AsyncQueue 桥接：

```
                    ┌─────────────┐
  deferred A ──────►│             │
  deferred B ──────►│  AsyncQueue │──────► 顺序输出 string chunks
  deferred C ──────►│             │
                    └─────────────┘
```

**AsyncQueue 原理**：

- `push(item)`：如果有等待的消费者，立即交付；否则入队
- `get()`：如果队列非空，立即返回；否则返回 Promise（等待 push）
- `done()`：标记结束，所有等待的 `get()` 返回 `undefined`

### 5. 嵌套 Suspense 处理

drain 采用 **批量循环**——处理完当前批次后，检查是否有新的 deferred 被注册（来自嵌套 Suspense），如果有则继续处理：

```
while (deferreds.length > 0) {
  batch = deferreds.splice(0)    // 取出当前所有
  并发处理 batch → 输出到 queue
  // 处理过程中可能产生新的 deferreds（嵌套）
}
```

## API 设计

### 关注点分离

参考 React 的 `<Suspense>` 与 `<ErrorBoundary>` 分离原则，`suspense` 和 `fallback` 各司其职：

| API                          | 职责                  | 对应 React            |
| ---------------------------- | --------------------- | --------------------- |
| `suspense(content, pending)` | 只管 pending → ready  | `<Suspense fallback>` |
| `fallback(content, errorFn)` | 只管 error → error UI | `<ErrorBoundary>`     |

两者自由组合：`fallback(suspense(content, pending), errorFn)`。

### 错误上下文传递

`fallback()` 在迭代时将 error handler 压入**错误上下文栈**。内层 `suspense()` 注册 deferred 时从栈顶捕获 handler 引用。Phase 2 中 deferred 报错时，使用捕获的 handler 渲染错误 UI 并通过 `$HRC` 替换 pending。

```
fallback 迭代开始
  → push errorFn 到错误上下文栈
  → 迭代 suspense
    → suspense 注册 deferred，捕获栈顶 errorFn
    → 输出 pending + 标记
  → 迭代结束（正常情况）
  → pop errorFn

Phase 2: deferred 报错
  → 用捕获的 errorFn 渲染错误 UI
  → $HRC 替换 pending → error UI
```

### 公共 API

```typescript
// html.ts
export function suspense(
  content: HTMLContent,   // 异步内容
  pending: HTML           // 加载中的占位内容
): Suspense;

export function fallback(
  content: HTMLContent,              // 可能出错的内容
  fallback: HTML | ((e: any) => HTML // 错误 UI（可为函数接收 error）
): Fallback;
```

### 与现有 API 的集成

- `renderToStream` 扩展为支持 Suspense 渐进式渲染，在 `runtime.ts` 的 `render` 函数中使用
- `Suspense` 和 `Fallback` 均继承 `AbstractHTML`，可嵌入模板

## 使用示例

### 基本用法

```typescript
import { html, suspense, fallback, renderToStream } from '@web-widget/html';

const slowData = new Promise<string>((r) =>
  setTimeout(() => r('真实内容'), 2000)
);

const page = html`<div>
  <h1>立即显示</h1>
  ${suspense(
    slowData.then((d) => html`<p>${d}</p>`),
    html`<p>加载中...</p>`
  )}
  <p>我也立即显示</p>
</div>`;

// 使用 renderToStream 启用渐进式渲染
const stream = renderToStream(page);
// → 立即输出: <div><h1>立即显示</h1><!--$H?-->...加载中...<!--/$H--><p>我也立即显示</p></div>
// → 2秒后输出: <div hidden id="HS:0"><p>真实内容</p></div><script>$HRC(...)</script>
```

### 错误恢复

```typescript
import { html, suspense, fallback } from '@web-widget/html';

const risky = fetch('/api/data').then((r) =>
  r.ok ? html`<p>${r.text()}</p>` : Promise.reject(new Error('fail'))
);

const page = html`<div>
  ${fallback(suspense(risky, html`<p>加载中...</p>`), html`<p>出错了</p>`)}
</div>`;
// → pending: <p>加载中...</p>
// → resolve: <p>data</p>  或  error: <p>出错了</p>
```

### 结合 Widget 使用

`container()` 内部自动组合 `suspense` + `fallback`：

```typescript
import { html } from '@web-widget/html';
// 构建工具自动注入 container，Chart 已是可调用组件
import Chart from './Chart@widget.tsx';

export default function Page() {
  return html`<div>
    <h1>Dashboard</h1>
    ${Chart({
      data: { type: 'bar' },
      widget: { fallback: html`<div aria-busy="true">加载图表...</div>` },
    })}
    <p>立即显示的页脚</p>
  </div>`;
}
```

## 实现清单

| 文件            | 变更                                                                              |
| --------------- | --------------------------------------------------------------------------------- |
| `html.ts`       | `Fallback` 增加错误上下文栈；`Suspense` 简化为双参数 + 从上下文捕获 error handler |
| `stream.ts`     | `renderToStream` 扩展支持 Suspense + AsyncQueue + `$HRC` 脚本常量                 |
| `components.ts` | `container()` 内部组合 `fallback(suspense(...), errorFn)`                         |
| `index.ts`      | 导出 `suspense`、`fallback`                                                       |
| `html.test.ts`  | Suspense + fallback 组合测试                                                      |

## 命名空间隔离

React 18 流式 SSR 使用了相同的标记协议（`$RC`、`<!--$?-->`、`B:` / `S:` 前缀）。当 HTML 模板与 React widget 共存于同一页面时，会产生全局变量和 DOM ID 冲突。

本设计使用 **`$H` 前缀**（HTML）隔离所有协议标记：

| 标记             | React        | 本设计        |
| ---------------- | ------------ | ------------- |
| 替换函数         | `window.$RC` | `window.$HRC` |
| 边界起始         | `<!--$?-->`  | `<!--$H?-->`  |
| 调度中           | —            | `<!--$H~-->`  |
| 边界结束         | `<!--/$-->`  | `<!--/$H-->`  |
| template 锚点 ID | `B:0`        | `HB:0`        |
| hidden div ID    | `S:0`        | `HS:0`        |
| 完成标记         | `<!--$-->`   | `<!--$H-->`   |

这样同一页面可以安全地同时使用 React 流式 SSR 和 HTML Suspense。

## 已知限制

### 需要 `renderToStream` 入口

`Suspense` 的渐进式渲染能力仅在 `renderToStream` 下生效。直接 `for await...of` 消费时走直通模式（阻塞等待），不产生 DOM 替换。

### 直通模式下错误传播

直通模式下 `suspense()` 不捕获错误，错误传播到外层 `fallback()` 边界（如果有）。这符合 React Suspense 的语义——`<Suspense>` 不处理错误，`<ErrorBoundary>` 才处理。

### `$HRC` 脚本依赖客户端 JavaScript

浏览器禁用 JavaScript 时，pending 内容会保留在页面上，异步内容无法替换。

## 与参考实现的对比

[html-tagged-template-stream](https://github.com/jacob-roling/html-tagged-template-stream) 实现了类似能力，使用模块级数组收集 deferred 模板，在主模板迭代完成后批量处理。本 RFC 在此基础上做了以下改进：

| 方面       | 参考实现                    | 本设计                                                 |
| ---------- | --------------------------- | ------------------------------------------------------ |
| 上下文管理 | 模块级数组（全局）          | 上下文栈（每次 `renderToStream` 独立）                 |
| 流式协议   | 自定义 `$swapFallback`      | `$H` 前缀隔离的 `$HRC` 协议（避免与 React `$RC` 冲突） |
| 异步处理   | `Promise.allSettled` 一次性 | 批量循环（支持嵌套 Suspense）                          |
| 脚本注入   | 每次渲染注入完整脚本        | 内联精简 `$HRC` 调用                                   |

## 参考

- [HTML 模板 Widget 孤岛设计](./html-widget-island.zh.md)
- [html-tagged-template-stream](https://github.com/jacob-roling/html-tagged-template-stream)
- [React Suspense SSR](https://github.com/facebook/react/blob/main/packages/react-dom/src/ServerReactStream.js)
