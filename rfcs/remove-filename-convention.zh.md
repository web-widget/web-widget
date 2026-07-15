# RFC：移除文件名约定，改用按需注入

状态：草案

## 摘要

当前架构依赖文件名标记（`@widget`）来标识 widget 模块，构建工具据此决定是否向模块注入 `render` 函数。本 RFC 提议将 `render` 的注入点从**目标模块自身**转移到**调用方**——由 `container()` 调用按需注入，从而消除 widget 对文件名约定的依赖。

## 背景

### 当前的文件名约定机制

构建工具通过文件名中的标记识别模块角色，触发两类转换：

**Export 侧（目标模块）**——文件名含 `@widget` 时，注入 `render` 函数，使模块符合 `ServerRender` / `ClientRender` 契约：

```javascript
// Counter@widget.vue → export-render 注入
import { render } from '@web-widget/vue/adapter';
export { render };
```

**Import 侧（调用方）**——文件名含 `@widget` 时，将静态导入转换为 `container` 调用，或向显式 `container()` 调用注入资产 URL：

```javascript
// 静态导入被转换为 container 调用
import Counter from './Counter@widget.vue';
// → const Counter = container(() => import('./Counter@widget.vue'), { import: url, name: 'Counter' });
```

### `@widget` 标记的双重职责

```
@widget 的两个作用面
├── Export 侧：标记模块需要注入 render 函数（使其可被跨框架渲染）
└── Import 侧：标记导入需要转换为 container 调用（使其可被跨框架消费）
```

随着 [跨框架类型互操作 RFC](./cross-framework-type-interoperability.zh.md) 的实现，Import 侧的 `@widget` 标记对类型推导已非必需——`container` 的泛型推导完全依赖模块默认导出的类型结构，不依赖文件名。如果进一步将 Export 侧的 `render` 注入也改为按需触发，文件名约定就不再是必需的。

## 动机

### 文件名约定的痛点

1. **认知负担**：用户必须了解 `@widget` 命名规则，文件名不再是纯粹的业务语义
2. **侵入性**：文件名被协议"占用"，重命名组件时需同时维护标记
3. **角色固化**：一个文件要么是 widget、要么不是，无法根据使用方式灵活变换角色。同一个 `.vue` 组件无法既被同框架正常导入，又被当作跨框架 widget 使用（除非复制文件）
4. **与框架惯例冲突**：Vue SFC 社区习惯 `Counter.vue`，React 社区习惯 `Counter.tsx`，`@widget` 后缀在两个生态中都显得突兀

### 目标

- **消除文件名约定**：不再要求 `@widget` 标记
- **保持运行时等价**：转换后的代码行为与当前完全一致
- **向后兼容**：提供过渡期，旧约定仍可工作

## 设计

### 核心思路：调用方驱动的按需注入

将 `render` 的注入从"目标模块自我声明"改为"调用方按需触发"。构建工具在处理 `container()` 调用时，通过模块解析确定目标文件的框架扩展名，反查对应的 source adapter，在调用方注入 `render`。

### 1. Widget 导入：`container` 按需注入

当构建工具在调用方模块中发现 `container(() => import('./Counter.vue'))` 时：

```javascript
// 源码
import { container } from '@web-widget/react/adapter';
const Counter = container(() => import('./Counter.vue'));
```

构建工具执行以下转换：

```javascript
// 转换后
import { container as __container } from '@web-widget/react/adapter'; // consumer adapter
import { render as __render_vue } from '@web-widget/vue/adapter'; // source adapter
const Counter = __container(
  () => import('./Counter.vue').then((m) => ({ ...m, render: __render_vue })),
  { import: __ASSET_URL__, name: 'Counter' }
);
```

关键步骤：

1. **解析目标模块**：`resolve('./Counter.vue', importerId)` 得到完整路径
2. **匹配 source adapter**：`.vue` 扩展名 → `@web-widget/vue` 的 `extensions` 配置
3. **注入 source render**：从 source adapter 的 `provide` 路径导入 `render`
4. **合并到模块对象**：通过 `.then(m => ({ ...m, render }))` 将 `render` 附加到动态导入的模块上

目标文件 `Counter.vue` 本身**不做任何转换**——它只是一个普通的 Vue 组件。

### 2. adapter 匹配机制

构建工具维护一张"扩展名 → source adapter"的映射表，从已有的 `adapters` 配置派生：

```typescript
// 从 webWidgetPlugin({ adapters: [...] }) 配置派生
const extensionToAdapter = new Map<string, ResolvedAdapter>();
for (const adapter of adapters) {
  for (const ext of adapter.extensions) {
    extensionToAdapter.set(ext, adapter); // ".vue" → @web-widget/vue
  }
}
```

当解析到目标模块路径后，取其扩展名查表即可确定 source adapter。`scope` 机制同样适用——任一目录路径前缀 + 扩展名联合匹配。

### 3. 同框架场景的简化

当 consumer 与 source 是同一框架时（如 React 应用通过 `container` 导入 React 组件），`render` 仍需注入——`container` 的运行时契约要求模块导出 `render`。注入逻辑不变，只是 source 和 consumer 的 adapter 恰好相同。

### 4. 完整的转换图景

```
使用方式                        构建工具动作
───────────────────────────    ──────────────────────────────────────
container(() => import(x))  →  注入 consumer container + source render + 资产 URL
普通 import x               →  不做任何处理（普通组件导入）
```

## 待解决的问题

### Dev 模式的 transform 顺序

Vite 按需转换模块。当调用方模块（含 `container()`）被 transform 时，需要 `resolve` 目标模块路径以确定 source adapter。这在当前架构中已经可行——`import-render` 插件已经在调用 `resolve(moduleName, id)` 来获取 resolvedId，只是结果目前仅用于资产 URL 生成，需扩展用途为 adapter 匹配。

不依赖目标模块的 transform 结果，只依赖路径解析，因此不存在 transform 顺序问题。

### 模块对象的运行时合并

当前 `render` 是模块自身的命名导出。改为调用方注入后，需通过 `.then(m => ({ ...m, render }))` 在运行时合并。这引入了额外的 `.then()` 调用，但：

- 动态 `import()` 本身返回 Promise，链式 `.then()` 无额外异步开销
- 合并的是引用而非拷贝，无内存问题

### `container` 静态导入的移除

本 RFC 假设不再支持静态导入 widget（`import Counter from './Counter@widget.vue'`），所有 widget 导入必须通过显式 `container()` 调用。这是与当前架构的一个 breaking change，需要在迁移指南中说明。

如果保留静态导入作为语法糖，构建工具需要额外的机制识别"哪些静态导入应该转换为 `container` 调用"——在没有文件名标记的情况下，这变得困难。因此本 RFC 提议完全移除静态导入。

### 错误诊断

当前 `@widget` 拼写错误能在构建期通过 manifest 交叉比对捕获。移除文件名约定后，错误场景变为：

- `container()` 的目标模块路径错误 → 由模块解析器自然报错（与普通 import 错误一致）
- 目标扩展名未配置任何 adapter → 构建工具报错"未找到框架适配器"
- widget 未进入 client bundle → 仍由现有的 manifest 交叉比对机制捕获

### 声明式 → 推导式的语义变化

当前架构是**声明式**的：文件名自我声明"我是 widget"。本 RFC 转为**推导式**：文件的角色由使用方式决定。同一个 `.vue` 文件可以：

- 被 Vue 应用正常 `import` → 普通 Vue 组件
- 被 `container(() import(...))` 导入 → 跨框架 widget

这增加了灵活性，但也意味着模块角色不再固定——需要团队约定来避免混淆。

## 向后兼容

### 过渡期策略

1. **Phase 1**（本 RFC）：`container()` 支持按需注入 `render`，目标文件无需 `@widget` 标记
2. **Phase 2**：`@widget` 标记标记为 deprecated，构建工具输出迁移提示
3. **Phase 3**：移除文件名约定的支持

### 同时保留两种模式

过渡期内，构建工具同时支持：

- 带标记的文件（`Counter@widget.vue`）：走当前的 export-render 路径
- 不带标记的文件（`Counter.vue`）：走按需注入路径

判断逻辑：如果目标模块路径含 `@widget` 标记，沿用旧机制；否则使用按需注入。

## 未选择的方案

### 方案 A：保留文件名约定，仅优化类型推导

仅推进 [跨框架类型互操作 RFC](./cross-framework-type-interoperability.zh.md)，不移除文件名约定。

**未选择的原因**：文件名约定的痛点（认知负担、侵入性、角色固化）依然存在。

### 方案 B：构建期预扫描 import 图

在 `buildStart` 阶段完整遍历 import 图，找出所有被 `container()` 引用的模块，标记为需要注入 `render`。

**未选择的原因**：实现复杂度高（需完整的 import 图遍历），且 dev 模式下 Vite 按需转换，预扫描的时机不天然适配。调用方注入更简单直接。

### 方案 C：运行时动态加载 render

`container` 在运行时根据模块的框架特征动态加载对应的 `render` 函数。

**未选择的原因**：运行时无法可靠判断模块的源框架，且动态加载 adapter 会引入额外的异步开销和打包复杂度。

## 参考

- [框架组件构建转换协议](./build-transformation-protocol.zh.md) — `WebWidgetAdapter` 协议与 `container` 的定义
- [跨框架类型互操作](./cross-framework-type-interoperability.zh.md) — `container` 的泛型类型推导
- [Widget 资产 URL 解析](./widget-asset-url-resolution.zh.md) — 资产 URL 的构建时解析机制
