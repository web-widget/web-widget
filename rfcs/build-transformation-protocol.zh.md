# 框架组件构建转换协议

状态：已实现

## 摘要

`@web-widget/schema` 已定义技术无关的通用渲染接口（`ServerRender`、`ClientRender`），这是所有框架的转换目标。本 RFC 定义构建转换层——通过标准化的 `WidgetAdapter` 协议，将 UI 框架组件在构建期转换为通用模块，使构建工具与框架适配器解耦演进。

## 动机

`@web-widget/schema` 已定义技术无关的通用渲染接口（`ServerRender`、`ClientRender`），这是所有框架的转换目标。但要让一个框架真正接入 Web Widget 生态，构建工具还需要完成大量重复的集成工作：识别框架文件、注入渲染函数、处理 SSR/客户端环境差异、支持跨框架互操作。如果这些工作没有标准化，每新增一个框架都需要在构建工具中编写专门的插件，适配门槛高、维护成本大。

本 RFC 的目标是将上述集成逻辑提炼为一个框架无关的适配器协议，使新框架接入只需实现运行时渲染逻辑并声明元数据，无需了解构建工具的内部机制。协议同时为跨框架互操作提供统一约定——任何框架的组件都可被转换为通用模块，也可作为 widget 被其他框架导入。

本 RFC **不涉及**如何构建 React、Vue 等框架的组件本身（如 JSX 编译、SFC 解析、模板编译等，这些由各框架自己的构建插件完成）。本 RFC 只关注两件事：

1. **转换**：框架组件如何被转换为符合 `ServerRender` / `ClientRender` 契约的通用模块
2. **纳入**：转换后的通用模块如何被其他框架的模块导入和复用（即跨框架互操作）

## 提议

### WidgetAdapter 协议

`@web-widget/schema` 定义了通用渲染接口（`ServerRender`、`ClientRender`），这是所有框架的转换目标。但要完成转换，构建工具还需要知道：**哪些文件属于哪个框架**，以及**从哪里获取该框架的渲染实现**。

本 RFC 的核心提议是 `WidgetAdapter` 协议——一个连接构建工具与 UI 框架的适配器接口。它告诉构建工具遇到哪类文件时、从哪里获取渲染实现，从而使框架源码在构建期被转换为符合 `ServerRender` / `ClientRender` 契约的通用模块。

```typescript
interface WidgetAdapter {
  /**
   * UI 框架标识符，用于在多框架共存时区分处理器。
   * 也是构建工具配置中引用适配器的键。
   */
  name: string;

  /**
   * 组件文件扩展名列表。
   * 构建工具据此判断哪些源文件属于该框架，需要执行渲染转换。
   * 如 [".tsx", ".jsx"] 匹配所有 React 组件。
   */
  extensions: string[];

  /**
   * 适配器模块子路径，指向适配器包通过条件导出提供的运行时实现。
   * 构建工具会将该模块的导出注入到匹配的模块中：
   * - render：导出 `render()`，使其符合 ServerRender / ClientRender 契约
   * - widget：导出 `widget()`，用于包装 Widget 模块的导入方，使其可被跨框架复用
   * 如 "./adapter" 会被解析为 "@web-widget/react/adapter"，
   * 再由条件导出根据环境自动选取 server 或 client 实现。
   */
  adapter: string;

  /**
   * 派生导出声明（可选）。
   * 详见 1.6 节「派生导出」。
   */
  deriveExports?: DeriveExport[];
}

interface DeriveExport {
  /** 派生的导出名，如 "handler"、"meta" */
  name: string;
  /** 从哪个导出派生，默认 "default" */
  from?: string;
  /** 属性不存在时的兜底值 */
  default: string;
}
```

协议的设计遵循一个原则：**框架知道「怎么渲染」，构建工具知道「怎么集成」**。适配器包提供框架特定的渲染实现，不需要了解任何构建工具的插件 API；构建工具负责文件匹配和代码注入，不需要了解每个框架的渲染细节。两者通过 `WidgetAdapter` 协议交互，各自独立演进。

以下各节围绕这一协议展开：运行时模块如何提供渲染与互操作能力（1.1）、构建工具如何集成（1.2）、运行时实现如何适配不同环境（1.3）、适配器包如何组织（1.4）、版本管理（1.5）、派生导出（1.6）。

#### 1.1 运行时模块

`adapter` 字段指向的模块是适配器的核心——它提供框架特定的运行时函数，构建工具负责将这些函数注入到匹配的模块中。该模块需符合 `AdapterModule` 契约：

```typescript
import type {
  ServerRender,
  ClientRender,
  WidgetContainerOptions,
  WidgetModule,
} from '@web-widget/schema';

/**
 * 运行时模块契约
 * 适配器包的 adapter 子路径所指向的模块文件必须导出以下成员。
 */
type AdapterModule = {
  /** 渲染函数，注入为模块导出，使其符合 ServerRender / ClientRender 契约 */
  render: ServerRender | ClientRender;

  /** 容器函数，将通用模块转换为当前框架的原生组件，支持跨框架互操作 */
  widget: WidgetContainer;
};

/** 通用模块加载器，返回符合 WidgetModule 的模块 */
type Loader = () => Promise<WidgetModule>;

/** 容器函数：将通用模块转换为当前框架的组件 */
interface WidgetContainer {
  (loader: Loader, options?: WidgetContainerOptions): FrameworkComponent; // 如 React.FC、Vue.Component
}
```

`render()` 让模块**自身可渲染**（注入为导出），`widget()` 让模块**可被当作 Widget 导入**（包装导入方）。两者共同构成跨框架互操作的基础：`render()` 产出符合通用格式的模块，`widget()` 消费通用格式的模块。

以 React 为例，`@web-widget/react` 的 `widget()` 返回一个 `React.FC`，内部调用通用模块的 `render()` 并将结果包装为 React 元素：

```typescript
import { widget } from '@web-widget/react';

// 将 Vue widget 包装为 React 组件
const Counter = widget(() => import('./Counter@widget.vue'));

function App() {
  return <Counter count={42} />;
}
```

`Counter` 在 React 中是一个普通组件，可以正常传 props、参与渲染。但它的内部实现运行在 Vue 运行时中——React 不感知这一点。反之，`@web-widget/vue` 的 `widget()` 同样能将 React Widget 包装为 Vue 组件。

`WidgetContainer` 的行为契约：

1. **加载**：调用 `loader` 获取通用模块，按 `loading` 选项决定时机——`auto`（默认）优先加载可见或发生交互的 Widget，并在空闲阶段加载其余 Widget；`lazy` 等待接近视口，`eager` 立即加载，`idle` 等待浏览器空闲
2. **渲染**：调用通用模块的渲染函数，将 `props` 作为数据参数传入，获取渲染结果
3. **适配**：将渲染结果转换为当前框架的原生组件树（如 React 元素树、Vue VNode），使返回的组件可像普通组件一样被使用
4. **生命周期**：返回的组件需正确处理挂载、更新（props 变化）、卸载，在卸载时清理 widget 的运行时资源
5. **SSR 兼容**：在服务端环境下，返回的组件应能渲染为 HTML 字符串

#### 1.2 构建工具集成

用户在构建工具配置中声明项目使用了哪些框架适配器：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    webWidgetPlugin({
      adapters: [
        // from 指向的适配器包已提供 name 和 extensions 的默认值
        { from: '@web-widget/react' },
        // vue2 与 vue3 共存时，用 scope 限定各自的生效范围
        { from: '@web-widget/vue2', scope: ['src/legacy'] },
        { from: '@web-widget/vue', scope: ['src/vue3'] },
      ],
    }),
  ],
});
```

`adapters` 支持直接传字符串（简写 `from`），也可传对象覆盖默认值或用 `scope` 消歧扩展名冲突：

```typescript
interface WebWidgetPluginOptions {
  adapters: (
    | string
    | (Omit<WidgetAdapter, 'name' | 'extensions'> & {
        name?: string;
        extensions?: string[];
        /** 适配器包名，构建工具从此包导入 adapter 实现 */
        from: string;
        /**
         * 处理器生效范围（目录路径列表）。
         * 仅在任一目录下的文件才会匹配此处理器，用于扩展名冲突时消歧义。
         * 每个目录的匹配方式为路径前缀，与 extensions 的后缀匹配一样原子化。
         */
        scope?: string[];
      })
  )[];
}
```

#### 1.3 环境适应性

`ServerRender` 和 `ClientRender` 是不同的契约——服务端渲染为 HTML 字符串或流，客户端渲染负责挂载和水合。但协议只提供了一个 `adapter` 子路径。构建工具在服务端构建和客户端构建时，需要从这个子路径分别加载到不同的 `AdapterModule` 实现，而无需适配器或用户手动区分环境。

借助 Node.js / 构建工具通用的 `package.json` `exports` 条件导出机制，适配器包可以在同一个子路径下为不同环境提供不同实现：

```json
{
  "exports": {
    "./adapter": {
      "worker": {
        "types": "./dist/adapter.server.d.ts",
        "default": "./dist/adapter.server.js"
      },
      "browser": {
        "types": "./dist/adapter.client.d.ts",
        "default": "./dist/adapter.client.js"
      },
      "default": {
        "types": "./dist/adapter.server.d.ts",
        "default": "./dist/adapter.server.js"
      }
    }
  }
}
```

- **`worker`**: 服务端 / Worker 环境（如 Cloudflare Workers、Vite SSR），解析到包含 `ServerRender` 的 `AdapterModule`
- **`browser`**: 浏览器环境（客户端构建），解析到包含 `ClientRender` 的 `AdapterModule`
- **`default`**: 未匹配上述条件时的回退，通常等同服务端实现

条件导出将环境判断下沉到包解析层，构建工具只需一行代码即可加载运行时实现，环境差异由条件导出自动处理：

```typescript
// 无论客户端构建还是服务端构建，都用同一条路径
const adapterModule = await import(`${packageName}${processor.adapter}`);
// → 客户端构建时解析到 adapter.client.js（ClientRender）
// → 服务端构建时解析到 adapter.server.js（ServerRender）
```

#### 1.4 适配器包结构

一个完整的适配器包（以 `@web-widget/react` 为例）的结构和导出：

```typescript
// @web-widget/react/adapter/server.ts —— 服务端 AdapterModule
import type { ServerRender } from '@web-widget/schema';

export const render: ServerRender = (component, data, options) => {
  // 使用 react-dom/server 将组件渲染为 HTML
};

export function widget(loader, options) {
  // 将组件包装为可独立加载、渲染的 widget 边界
}
```

```typescript
// @web-widget/react/adapter/client.ts —— 客户端 AdapterModule
import type { ClientRender } from '@web-widget/schema';

export const render: ClientRender = (component, data, options) => {
  // 使用 react-dom 的 hydrateRoot / createRoot
};

export function widget(loader, options) {
  // 客户端容器实现
}
```

```typescript
// @web-widget/react/index.ts —— 包入口
export { widget } from './adapter';
```

`package.json` 中通过 `webWidgetAdapter` 字段声明 `WidgetAdapter` 配置，`exports` 组织子路径：

```json
{
  "name": "@web-widget/react",
  "webWidgetAdapter": {
    "name": "react",
    "extensions": [".tsx", ".jsx"],
    "adapter": "./adapter"
  },
  "exports": {
    ".": { "default": "./dist/index.js" },
    "./adapter": {
      "worker": { "default": "./dist/adapter.server.js" },
      "browser": { "default": "./dist/adapter.client.js" },
      "default": { "default": "./dist/adapter.server.js" }
    }
  }
}
```

其他框架（Vue、Svelte 等）的适配器包结构相同，只是渲染实现不同。

#### 1.5 版本管理

适配器格式通过 `version` 字段标识所遵循的格式版本，构建工具据此进行兼容性检查。当格式演进引入不兼容变更时（如字段语义改变、新增必需字段），主版本号递增；构建工具可声明支持的版本范围，遇到不兼容的适配器时给出明确错误而非静默失败。

#### 1.6 派生导出

某些适配器的模块只能产出默认导出，无法直接添加命名导出。但路由协议要求模块导出 `handler`（路由处理器）和 `meta`（元数据）等命名导出。适配器可通过 `deriveExports` 声明需要从默认导出上派生的命名导出及其兜底值。

以 Vue 适配器为例，Vue SFC 编译后只产出 `export default`。`@web-widget/vue` 在 `webWidgetAdapter` 字段中声明 `deriveExports`：

```json
{
  "deriveExports": [
    { "name": "handler", "default": "{GET({html}){return html()}}" },
    { "name": "meta", "default": "{}" }
  ]
}
```

构建工具在转换时将默认导出对象的属性解构为命名导出。属性存在时使用属性值，不存在时使用兜底值。因此用户可以在 SFC 中直接定义 `handler`：

```vue
<!-- index@route.vue -->
<script setup>
defineOptions({
  handler: {
    async GET({ html }) {
      return html();
    },
  },
  meta: { title: '首页' },
});
</script>
```

如果不定义 `handler`，构建工具会注入兜底值——默认调用 `html()` 渲染组件。转换后的代码等价于：

```javascript
const __$default$__ = {/* SFC 编译产物 */};
export const {
  handler = {
    GET({ html }) {
      return html();
    },
  },
} = __$default$__;
export default __$default$__;
```

派生规则与框架的渲染方式相关——Vue3 的 `handler` 兜底使用 `html()` 渲染，Vue2 使用 `render()` 渲染——因此由适配器包声明而非用户配置。`deriveExports` 仅对路由模块（文件名包含路由标记的模块）生效。

#### 1.7 Widget 容器配置

当框架支持流式 SSR 时（如 React、HTML 模板），widget 的异步渲染可能阻塞流。为了让用户在所有框架中获得一致的 Suspense 体验，各适配器包的 `WidgetContainerConfig` 应采用统一的 `fallback` 设计：

```typescript
type WidgetContainerConfig<TFallback> = {
  /**
   * 待定和错误状态的回退 UI。
   *
   * 仅在服务端渲染期间生效：待定 UI 在 widget 模块异步渲染时显示，
   * 错误 UI 在渲染失败时显示。两者都被序列化到 HTML 流中——
   * Islands 架构下不存在客户端重试。
   *
   * - `TFallback` — 待定（Suspense）和错误共用同一 UI。
   * - `{ pending?, error? }` — 分别指定；省略 `error` 时回退到 `pending`。
   *
   * 不提供 `fallback` 时，widget 阻塞渲染（无 Suspense 边界）。
   *
   * @example
   * // 简单：两种状态共用同一 UI
   * { fallback: <Spinner /> }
   *
   * // 区分：分别指定待定和错误 UI
   * { fallback: { pending: <Spinner />, error: <ErrorUI /> } }
   */
  fallback?: TFallback | { pending?: TFallback; error?: TFallback };

  /**
   * 客户端模块加载策略。
   * - `'auto'`（默认）：按可见性和交互优先级调度，并最终加载全部 Widget
   * - `'lazy'`：接近视口时加载
   * - `'eager'`：模块解析时立即加载
   * - `'idle'`：浏览器空闲时加载
   */
  loading?: 'auto' | 'lazy' | 'eager' | 'idle';

  /**
   * 仅服务端渲染（SSR），产出静态 HTML，无客户端水合。
   * 与 `clientOnly` 互斥。
   */
  serverOnly?: true;

  /**
   * 仅客户端渲染，不产出服务端 HTML（空占位符直到客户端挂载）。
   * 与 `serverOnly` 互斥。
   */
  clientOnly?: true;
};
```

`TFallback` 是框架特定的 UI 类型，例如 ReactNode、VNode 等。

**各框架用法对照**：

```tsx
// React — TFallback = ReactNode
<Widget widget={{ fallback: <Spinner /> }} />
<Widget widget={{ fallback: { pending: <Spinner />, error: <ErrorUI /> } }} />
```

```typescript
// HTML 模板 — TFallback = HTML
Widget({ widget: { fallback: html`<div>Loading...</div>` } });
Widget({
  widget: {
    fallback: {
      pending: html`<div>Loading...</div>`,
      error: html`<div>Error!</div>`,
    },
  },
});
```

```vue
<!-- Vue — TFallback = VNode -->
<Widget :widget="{ fallback: h(Spinner) }" />
<Widget :widget="{ fallback: { pending: h(Spinner), error: h(ErrorUI) } }" />
```

## 参考

- [Astro 渲染器设计调查](./references/astro-renderer-design.zh.md) — 对比 Astro `AstroRenderer` 与 `WidgetAdapter` 的设计差异
