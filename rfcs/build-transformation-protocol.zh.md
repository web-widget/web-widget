# 框架组件构建转换协议

状态：草案

## 摘要

`@web-widget/schema` 已定义技术无关的通用渲染接口（`ServerRender`、`ClientRender`），这是所有框架的转换目标。本 RFC 定义构建转换层——通过标准化的 `WebWidgetAdapter` 协议，将 UI 框架组件在构建期转换为通用模块，使构建工具与框架适配器解耦演进。

## 动机

目前，Web Widget 生态中每个 UI 框架都需要提供专门的构建工具插件。这些插件实现逻辑相似却互不兼容——每个都要处理文件匹配、渲染函数注入、环境适配等相同的工作，只是细节因框架而异。结果是：新框架接入必须从零了解构建工具的插件机制，构建工具升级需要所有框架适配器同步跟进，框架间的互操作也因缺乏统一约定而难以实现。

本 RFC 的目标是定义一个框架无关的适配器接口，将上述转换逻辑标准化，使构建工具与框架适配器解耦演进。

本 RFC **不涉及**如何构建 React、Vue 等框架的组件本身（如 JSX 编译、SFC 解析、模板编译等，这些由各框架自己的构建插件完成）。本 RFC 只关注两件事：

1. **转换**：框架组件如何被转换为符合 `ServerRender` / `ClientRender` 契约的通用模块
2. **纳入**：转换后的通用模块如何被其他框架的模块导入和复用（即跨框架互操作）

## 设计提案

### 核心提议：WebWidgetAdapter 协议

`@web-widget/schema` 定义了通用渲染接口（`ServerRender`、`ClientRender`），这是所有框架的转换目标。但要完成转换，构建工具还需要知道：**哪些文件属于哪个框架**，以及**从哪里获取该框架的渲染实现**。

本 RFC 的核心提议是 `WebWidgetAdapter` 协议——一个连接构建工具与 UI 框架的适配器接口。它告诉构建工具遇到哪类文件时、从哪里获取渲染实现，从而使框架源码在构建期被转换为符合 `ServerRender` / `ClientRender` 契约的通用模块。

```typescript
interface WebWidgetAdapter {
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
   * 运行时模块子路径，指向适配器包通过条件导出提供的运行时实现。
   * 构建工具会将该模块的导出注入到匹配的模块中：
   * - render：注入为模块导出，使其符合 ServerRender / ClientRender 契约
   * - container：包装 widget 的导入方，使其可被跨框架复用
   * 如 "./runtime" 会被解析为 "@web-widget/react/runtime"，
   * 再由条件导出根据环境自动选取 server 或 client 实现。
   */
  runtime: string;
}
```

协议的设计遵循一个原则：**框架知道「怎么渲染」，构建工具知道「怎么集成」**。适配器包提供框架特定的渲染实现，不需要了解任何构建工具的插件 API；构建工具负责文件匹配和代码注入，不需要了解每个框架的渲染细节。两者通过 `WebWidgetAdapter` 协议交互，各自独立演进。

以下各节围绕这一协议展开：运行时模块如何提供渲染与互操作能力（1.1）、构建工具如何集成（1.2）、运行时实现如何适配不同环境（1.3）、适配器包如何组织（1.4）、版本管理（1.5）。

#### 1.1 运行时模块

`runtime` 字段指向的模块是适配器的核心——它提供框架特定的运行时函数，构建工具负责将这些函数注入到匹配的模块中。该模块需符合 `RuntimeModule` 契约：

```typescript
import type {
  ServerRender,
  ClientRender,
  WidgetModule,
} from '@web-widget/schema';

/**
 * 运行时模块契约
 * 适配器包的 runtime 子路径所指向的模块文件必须导出以下成员。
 */
type RuntimeModule = {
  /** 渲染函数，注入为模块导出，使其符合 ServerRender / ClientRender 契约 */
  render: ServerRender | ClientRender;

  /** 容器函数，将通用模块转换为当前框架的原生组件，支持跨框架互操作 */
  container: Container;
};

/** 通用模块加载器，返回符合 WidgetModule 的模块 */
type Loader = () => Promise<WidgetModule>;

/** 容器函数：将通用模块转换为当前框架的组件 */
interface Container {
  (
    loader: Loader,
    options?: {
      loading?: 'lazy' | 'eager'; // 加载时机
      renderStage?: string; // 渲染阶段
    }
  ): FrameworkComponent; // 如 React.FC、Vue.Component
}
```

`render` 让模块**自身可渲染**（注入为导出），`container` 让模块**可被当作 widget 导入**（包装导入方）。两者共同构成跨框架互操作的基础：`render` 产出符合通用格式的模块，`container` 消费通用格式的模块。

以 React 为例，`@web-widget/react` 的 `container` 返回一个 `React.FC`，内部调用通用模块的 `render` 并将结果包装为 React 元素：

```typescript
import { container } from '@web-widget/react';

// 将 Vue widget 包装为 React 组件
const Counter = container(() => import('./Counter@widget.vue'));

function App() {
  return <Counter count={42} />;
}
```

`Counter` 在 React 中是一个普通组件，可以正常传 props、参与渲染。但它的内部实现运行在 Vue 运行时中——React 不感知这一点。反之，`@web-widget/vue` 的 `container` 同样能将 React widget 包装为 Vue 组件。

#### 1.2 构建工具集成

用户在构建工具配置中声明项目使用了哪些框架适配器：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    webWidgetPlugin({
      moduleMarkers: ['@widget', '@route'], // 如 Counter@widget.tsx、index@route.vue
      adapters: [
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

`adapters` 支持直接传字符串（简写 `from`），也可传对象覆盖默认值或用 `scope` 消歧扩展名冲突：

```typescript
interface WebWidgetPluginOptions {
  /** 文件名中包含这些标记的模块会被识别为通用可渲染模块 */
  moduleMarkers?: string[];
  adapters: (
    | string
    | (Omit<WebWidgetAdapter, 'name' | 'extensions'> & {
        name?: string;
        extensions?: string[];
        /** 适配器包名，构建工具从此包导入 runtime 实现 */
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

`ServerRender` 和 `ClientRender` 是不同的契约——服务端渲染为 HTML 字符串或流，客户端渲染负责挂载和水合。但协议只提供了一个 `runtime` 子路径。构建工具在服务端构建和客户端构建时，需要从这个子路径分别加载到不同的 `RuntimeModule` 实现，而无需适配器或用户手动区分环境。

借助 Node.js / 构建工具通用的 `package.json` `exports` 条件导出机制，适配器包可以在同一个子路径下为不同环境提供不同实现：

```json
{
  "exports": {
    "./runtime": {
      "worker": {
        "types": "./dist/runtime.server.d.ts",
        "default": "./dist/runtime.server.js"
      },
      "browser": {
        "types": "./dist/runtime.client.d.ts",
        "default": "./dist/runtime.client.js"
      },
      "default": {
        "types": "./dist/runtime.server.d.ts",
        "default": "./dist/runtime.server.js"
      }
    }
  }
}
```

- **`worker`**: 服务端 / Worker 环境（如 Cloudflare Workers、Vite SSR），解析到包含 `ServerRender` 的 `RuntimeModule`
- **`browser`**: 浏览器环境（客户端构建），解析到包含 `ClientRender` 的 `RuntimeModule`
- **`default`**: 未匹配上述条件时的回退，通常等同服务端实现

条件导出将环境判断下沉到包解析层，构建工具只需一行代码即可加载运行时实现，环境差异由条件导出自动处理：

```typescript
// 无论客户端构建还是服务端构建，都用同一条路径
const runtimeModule = await import(`${packageName}${processor.runtime}`);
// → 客户端构建时解析到 runtime.client.js（ClientRender）
// → 服务端构建时解析到 runtime.server.js（ServerRender）
```

#### 1.4 适配器包结构

一个完整的适配器包（以 `@web-widget/react` 为例）的结构和导出：

```typescript
// @web-widget/react/runtime/server.ts —— 服务端 RuntimeModule
import type { ServerRender } from '@web-widget/schema';

export const render: ServerRender = (component, data, options) => {
  // 使用 react-dom/server 将组件渲染为 HTML
};

export function container(loader, options) {
  // 将组件包装为可独立加载、渲染的 widget 边界
}
```

```typescript
// @web-widget/react/runtime/client.ts —— 客户端 RuntimeModule
import type { ClientRender } from '@web-widget/schema';

export const render: ClientRender = (component, data, options) => {
  // 使用 react-dom 的 hydrateRoot / createRoot
};

export function container(loader, options) {
  // 客户端容器实现
}
```

```typescript
// @web-widget/react/index.ts —— 包入口
export { container } from './runtime';
```

`package.json` 中通过 `webWidget` 字段声明 `WebWidgetAdapter` 配置，`exports` 组织子路径：

```json
{
  "name": "@web-widget/react",
  "webWidget": {
    "name": "react",
    "extensions": [".tsx", ".jsx"],
    "runtime": "./runtime"
  },
  "exports": {
    ".": { "default": "./dist/index.js" },
    "./runtime": {
      "worker": { "default": "./dist/runtime.server.js" },
      "browser": { "default": "./dist/runtime.client.js" },
      "default": { "default": "./dist/runtime.server.js" }
    }
  }
}
```

其他框架（Vue、Svelte 等）的适配器包结构相同，只是渲染实现不同。

#### 1.5 版本管理

适配器格式通过 `version` 字段标识所遵循的格式版本，构建工具据此进行兼容性检查。当格式演进引入不兼容变更时（如字段语义改变、新增必需字段），主版本号递增；构建工具可声明支持的版本范围，遇到不兼容的适配器时给出明确错误而非静默失败。

## 参考

- [Astro 渲染器设计调查](./references/astro-renderer-design.zh.md) — 对比 Astro `AstroRenderer` 与 `WebWidgetAdapter` 的设计差异
