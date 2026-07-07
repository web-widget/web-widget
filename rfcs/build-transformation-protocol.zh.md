# 框架组件构建转换协议

状态：草案

## 摘要

`@web-widget/schema` 已定义技术无关的通用模块格式（`RouteModule`、`WidgetModule`）与渲染接口（`ServerRender`、`ClientRender`），构成 Web Widget 生态的目标格式。本文档定义**构建转换层**——如何通过标准化的适配器，将市面上的 UI 框架组件（React、Vue、Svelte 等）在构建期转换为上述通用模块格式。通过标准化适配器接口，任何 UI 框架都可以实现统一的接口来获得 Web Widget 生态系统的支持，而无需了解具体的构建工具实现细节。

## 上下文：目标格式与转换层定位

### 两层架构

Web Widget 的模块互操作能力由两层构成：

```
┌─────────────────────────────────────────────────────────┐
│  目标格式层（@web-widget/schema，已定义）                  │
│  - RouteModule / WidgetModule                            │
│  - ServerRender / ClientRender                           │
│  - Meta / Action / Middleware                            │
│  技术无关的接口契约，定义「组件应该长什么样」                 │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │ 构建期转换（本文档）
                        │
┌─────────────────────────────────────────────────────────┐
│  源码层（框架特定）                                        │
│  - React: Counter.tsx, App.tsx                          │
│  - Vue: Counter.vue, App.vue                            │
│  - Svelte: Counter.svelte, App.svelte                   │
└─────────────────────────────────────────────────────────┘
```

### 目标格式回顾

`@web-widget/schema` 已定义以下渲染接口，作为所有框架适配器的**转换目标**：

```typescript
// 渲染接口 - 所有框架的渲染函数必须符合此契约
interface ServerRender<Component, Data, Options, Result> {
  (
    component: Component,
    data: Data,
    options: Options
  ): Result | Promise<Result>;
}

interface ClientRender<Component, Data, Options, Result> {
  (
    component: Component,
    data: Data,
    options: Options
  ): Result | Promise<Result>;
}
```

### 转换层职责

本文档定义的构建转换层负责将框架特定的源码**转换为符合上述目标格式的模块**。具体而言，对于一份框架组件源码（如 `Counter.tsx`），构建转换需要：

1. **注入渲染函数**：为模块注入符合 `ServerRender` / `ClientRender` 契约的 `render` 导出
2. **注入容器函数**：为 widget 模块注入 `defineWebWidget` 容器，使其可作为跨框架复用的组件单元
3. **环境适配**：通过条件导出，使同一份源码在 server / client 环境下产出不同实现，但都符合目标格式

适配器标准化的目的，就是让上述转换逻辑以**框架无关的接口**暴露给构建工具，使构建工具无需了解每个框架的具体转换细节。

## 动机

目前，Web Widget 生态中每个 UI 框架都需要提供专门的构建工具插件。这些插件实现逻辑相似却互不兼容——每个都要处理文件匹配、渲染函数注入、环境适配等相同的工作，只是细节因框架而异。结果是：新框架接入必须从零了解构建工具的插件机制，构建工具升级需要所有框架适配器同步跟进，框架间的互操作也因缺乏统一约定而难以实现。

本 RFC 的目标是定义一个框架无关的适配器接口，将上述转换逻辑标准化，使构建工具与框架适配器解耦演进。

本 RFC **不涉及**如何构建 React、Vue 等框架的组件本身（如 JSX 编译、SFC 解析、模板编译等，这些由各框架自己的构建插件完成）。本 RFC 只关注两件事：

1. **转换**：框架组件如何被转换为符合 `ServerRender` / `ClientRender` 契约的通用模块
2. **纳入**：转换后的通用模块如何被其他框架的模块导入和复用（即跨框架互操作）

## 设计提案

### 核心提议：ComponentProcessor 协议

`@web-widget/schema` 定义了通用渲染接口（`ServerRender`、`ClientRender`），这是所有框架的转换目标。但要完成转换，构建工具还需要知道：**哪些文件属于哪个框架**，以及**从哪里获取该框架的渲染实现**。

本 RFC 的核心提议是 `ComponentProcessor` 协议——一个连接构建工具与 UI 框架的适配器接口。它告诉构建工具遇到哪类文件时、从哪里获取渲染实现，从而使框架源码在构建期被转换为符合 `ServerRender` / `ClientRender` 契约的通用模块。

```typescript
interface ComponentProcessor {
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
   * 渲染函数子路径，指向适配器包通过条件导出提供的渲染实现。
   * 构建工具会将该子路径的导出注入到匹配的模块中，
   * 使其 `render` 导出符合 ServerRender / ClientRender 契约。
   * 如 "./render" 会被解析为 "@web-widget/react/render"，
   * 再由条件导出根据环境自动选取 server 或 client 实现。
   */
  render: string;

  /**
   * 容器函数子路径（可选）。
   * 与 render 对称：render 让模块自身可渲染（注入导出），
   * container 让模块可被当作 widget 导入（包装导入方）。
   * 构建工具用容器函数包装 widget 的导入，使其成为独立加载、
   * 独立渲染的组件边界，从而支持跨框架互操作。
   */
  container?: string;
}
```

协议的设计遵循一个原则：**框架知道「怎么渲染」，构建工具知道「怎么集成」**。适配器包提供框架特定的渲染实现，不需要了解任何构建工具的插件 API；构建工具负责文件匹配和代码注入，不需要了解每个框架的渲染细节。两者通过 `ComponentProcessor` 协议交互，各自独立演进。

以下各节围绕这一协议展开：容器函数如何实现跨框架互操作（1.1）、构建工具如何集成（1.2）、渲染实现如何适配不同环境（1.3）、适配器包如何组织（1.4）、版本管理（1.5）。

#### 1.1 容器函数

`container` 指向的容器函数（通常命名为 `defineWebWidget`）是跨框架互操作的关键。它将通用模块转换为当前框架的原生组件，使框架之间不直接调用彼此的组件，而是通过容器函数建立标准化的组件边界。

容器函数的契约：

```typescript
/** 通用模块加载器，返回符合 WidgetModule 的模块 */
type Loader = () => Promise<ServerWidgetModule | ClientWidgetModule>;

/** 容器函数：将通用模块转换为当前框架的组件 */
interface DefineWebWidget {
  (
    loader: Loader,
    options?: {
      loading?: 'lazy' | 'eager'; // 加载时机
      renderStage?: string; // 渲染阶段
    }
  ): FrameworkComponent; // 如 React.FC、Vue.Component
}
```

容器函数接收一个通用模块加载器，返回当前框架原生的组件类型。加载器返回的模块必须符合 `WidgetModule` 契约（带有 `render`、`default`、`meta`），这正是 `render` 字段注入的产物。容器函数内部负责：加载模块、调用 `render`、将渲染结果适配为当前框架的组件树。

以 React 为例，`@web-widget/react` 的 `defineWebWidget` 返回一个 `React.FC`，内部调用通用模块的 `render` 并将结果包装为 React 元素：

```typescript
import { defineWebWidget } from '@web-widget/react';

// 将 Vue widget 包装为 React 组件
const Counter = defineWebWidget(() => import('./Counter@widget.vue'));

function App() {
  return <Counter count={42} />;
}
```

`Counter` 在 React 中是一个普通组件，可以正常传 props、参与渲染。但它的内部实现运行在 Vue 运行时中——React 不感知这一点。反之，`@web-widget/vue` 的 `defineWebWidget` 同样能将 React widget 包装为 Vue 组件。

#### 1.2 构建工具集成

用户在构建工具配置中声明项目使用了哪些框架适配器：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    webWidgetPlugin({
      moduleMarkers: ['@widget', '@route'], // 如 Counter@widget.tsx、index@route.vue
      processors: [
        // from 指向的适配器包已提供 name 和 extensions 的默认值
        { from: '@web-widget/react' },
        // vue2 与 vue3 共存时，用 scope 限定各自的生效范围
        { from: '@web-widget/vue2', scope: 'src/legacy' },
        { from: '@web-widget/vue', scope: 'src/vue3' },
      ],
    }),
  ],
});
```

`processors` 支持直接传字符串（简写 `from`），也可传对象覆盖默认值或用 `scope` 消歧扩展名冲突：

```typescript
interface WebWidgetPluginOptions {
  /** 文件名中包含这些标记的模块会被识别为通用可渲染模块 */
  moduleMarkers?: string[];
  processors: (
    | string
    | (Omit<ComponentProcessor, 'name' | 'extensions'> & {
        name?: string;
        extensions?: string[];
        /** 适配器包名，构建工具从此包导入 render / container 实现 */
        from: string;
        /**
         * 处理器生效范围（目录路径）。
         * 仅在该目录下的文件才会匹配此处理器，用于扩展名冲突时消歧义。
         * 匹配方式为路径前缀，与 extensions 的后缀匹配一样原子化。
         */
        scope?: string;
      })
  )[];
}
```

#### 1.3 环境适应性

`ServerRender` 和 `ClientRender` 是不同的契约——服务端渲染为 HTML 字符串或流，客户端渲染负责挂载和水合。但协议只提供了一个 `render` 子路径。构建工具在服务端构建和客户端构建时，需要从这个子路径分别加载到 `ServerRender` 和 `ClientRender` 实现，而无需适配器或用户手动区分环境。

借助 Node.js / 构建工具通用的 `package.json` `exports` 条件导出机制，适配器包可以在同一个子路径下为不同环境提供不同实现：

```json
{
  "exports": {
    "./render": {
      "worker": {
        "types": "./dist/render.server.d.ts",
        "default": "./dist/render.server.js"
      },
      "browser": {
        "types": "./dist/render.client.d.ts",
        "default": "./dist/render.client.js"
      },
      "default": {
        "types": "./dist/render.server.d.ts",
        "default": "./dist/render.server.js"
      }
    }
  }
}
```

- **`worker`**: 服务端 / Worker 环境（如 Cloudflare Workers、Vite SSR），解析到 `ServerRender` 实现
- **`browser`**: 浏览器环境（客户端构建），解析到 `ClientRender` 实现
- **`default`**: 未匹配上述条件时的回退，通常等同服务端实现

条件导出将环境判断下沉到包解析层，构建工具只需一行代码即可加载渲染实现，环境差异由条件导出自动处理：

```typescript
// 无论客户端构建还是服务端构建，都用同一条路径
const renderModule = await import(`${packageName}${processor.render}`);
// → 客户端构建时解析到 render.client.js（ClientRender）
// → 服务端构建时解析到 render.server.js（ServerRender）
```

#### 1.4 适配器包结构

一个完整的适配器包（以 `@web-widget/react` 为例）的文件结构和导出：

```typescript
// @web-widget/react/processor.ts —— ComponentProcessor 配置
const processor: ComponentProcessor = {
  name: 'react',
  extensions: ['.tsx', '.jsx'],
  render: './render',
  container: './container',
};
export default processor;

// @web-widget/react/render/server.ts —— ServerRender 实现
export default function createServerRender(): ServerRender {
  // 使用 react-dom/server 将组件渲染为 HTML
}

// @web-widget/react/render/client.ts —— ClientRender 实现
export default function createClientRender(): ClientRender {
  // 使用 react-dom 的 hydrateRoot / createRoot
}

// @web-widget/react/container.ts —— 容器函数
export default function defineWebWidget(loader, options) {
  // 将组件包装为可独立加载、渲染的 widget 边界
}

// @web-widget/react/index.ts —— 包入口
export { default } from './processor';
// 可选：导出框架特定的 Vite 插件（向后兼容）
export { default as vitePlugin } from './vite';
```

`package.json` 的 `exports` 将上述文件组织为标准子路径：

```json
{
  "exports": {
    ".": { "default": "./dist/index.js" },
    "./processor": { "default": "./dist/processor.js" },
    "./container": { "default": "./dist/container.js" },
    "./render": {
      "worker": { "default": "./dist/render.server.js" },
      "browser": { "default": "./dist/render.client.js" },
      "default": { "default": "./dist/render.server.js" }
    }
  }
}
```

其他框架（Vue、Svelte 等）的适配器包结构相同，只是渲染实现不同。

#### 1.5 版本管理

适配器格式通过 `version` 字段标识所遵循的格式版本，构建工具据此进行兼容性检查。当格式演进引入不兼容变更时（如字段语义改变、新增必需字段），主版本号递增；构建工具可声明支持的版本范围，遇到不兼容的适配器时给出明确错误而非静默失败。
