# RFC：Widget 容器类型分层

状态：提议

## 摘要

当前 Widget 容器相关类型分散在 `@web-widget/schema`、`@web-widget/web-widget` 和各框架 adapter 的 `components.ts` 中。三处分别描述协议、DOM/renderer 实现和框架组件，但字段存在重复，类型名称也没有准确表达配置发生的阶段。

本 RFC 提议按照「稳定协议、渲染核心、框架外观、构建期注入」四个层级重新划分类型所有权，并通过类型组合和少量公共解析函数消除重复。重构后：

- `@web-widget/schema` 定义框架无关的词汇和容器协议；
- `@web-widget/web-widget` 定义 element 与 renderer 的输入；
- 框架 adapter 只补充组件返回类型和框架节点类型；
- 构建期私有字段不会出现在公开 `container()` API 中。

## 动机

### 类型所有权不清晰

目前存在三组含义接近的类型：

| 层级     | 当前类型                   | 实际用途                                              |
| -------- | -------------------------- | ----------------------------------------------------- |
| Schema   | `WidgetAdapterOptions`     | `container(loader, options)` 的定义期默认配置         |
| Schema   | `WidgetContainerOptions`   | 单次组件使用时的 `widget` 配置，但尚未被 adapter 复用 |
| 渲染核心 | `WebWidgetElementProps`    | renderer 内部状态，并不完全等同于自定义元素 props     |
| 渲染核心 | `WebWidgetRendererOptions` | renderer 构造参数                                     |
| Adapter  | `WidgetContainerConfig`    | 各框架重复定义的单次使用配置                          |

`WidgetAdapterOptions` 实际没有配置 adapter 本身；各 adapter 本地拼接的内部实现类型也只是定义期配置与构建注入字段的交集。现有名称不能帮助调用者判断类型属于定义期、使用期还是渲染期。

### 公共字段重复

`loading`、`renderTarget`、`renderStage` 等字段同时出现在 Schema 和渲染核心中，且部分 adapter 继续通过 `WebWidgetRendererOptions['loading']` 间接引用。字段增加或语义变化时，需要同步修改多个包。

各框架还重复定义：

```typescript
interface WidgetContainerConfig {
  fallback?:
    | FrameworkNode
    | {
        pending?: FrameworkNode;
        error?: FrameworkNode;
      };
  loading?: 'lazy' | 'eager' | 'idle';
  serverOnly?: true;
  clientOnly?: true;
}
```

这些接口没有复用 Schema 已有的公共使用期配置，也没有继承其中 `serverOnly` 与 `clientOnly` 的互斥约束。本 RFC 将该类型统一定义为 `WidgetContainerProps`。

### 内部字段泄漏风险

`devStyles` 由构建工具在开发模式下注入，仅供 renderer 使用。它不属于用户 API，但当前需要通过 adapter 实现签名额外拼接。若没有明确的内部边界，后续容易将它加入公开 `WidgetAdapterOptions`。

## 目标

- 为每种配置建立单一、明确的类型所有者；
- 让类型名称反映配置发生的阶段；
- 复用 loading、render mode、fallback 等框架无关语义；
- 保持 fallback UI、组件返回类型等框架特有能力；
- 保持 `container()` 的 props 自动推导和显式 `container<Props>()` 兜底；
- 在一次变更中完整替换旧类型，不保留语义重叠的兼容别名。

## 非目标

- 不统一 ReactNode、VNode、Snippet、JSX.Element 和 HTML 的具体表示；
- 不改变 widget 模块格式和 render 函数协议；
- 不改变 SSR、hydration、loading 或 fallback 的现有行为；
- 不要求构建工具参与 TypeScript 类型推导；
- 不在本 RFC 中删除各框架已有的 deprecated 类型转换函数。

## 分层模型

依赖方向必须保持单向：

```text
@web-widget/schema
        │
        ├───────────────┐
        ▼               ▼
@web-widget/web-widget  framework adapter
        │               ▲
        └───────────────┘

vite-plugin ──(生成代码和私有字段)──> framework adapter
```

### 命名规则

`WidgetContainer` 前缀只用于直接服务于 `container()` 抽象的类型，不扩散到所有 Widget 类型：

- `Options` 表示 `container(loader, options)` 的定义期参数；
- `Props` 表示返回组件中 `widget` prop 的使用期参数；
- `Fallback` 和 `RenderMode` 表示由容器边界实现的行为；
- `Injected` 表示构建工具可用、用户不可见的内部扩展；
- loading、render target、render stage 直接由所属 options 字段定义；其他层通过索引访问引用，不为字段值集合增加独立导出；
- `WidgetModuleLoader` 属于模块协议，也不增加 `Container` 前缀。

### Schema：稳定协议

Schema 只定义不依赖 DOM 实现和 UI 框架的类型：

```typescript
export type WidgetModuleLoader<M extends WidgetModule = WidgetModule> =
  () => Promise<M>;
```

使用 `WidgetModuleLoader`，避免与各包中的通用 loader 概念冲突。

### 定义期配置

`container(loader, options)` 的第二个参数描述容器组件的默认配置，改名为 `WidgetContainerOptions`：

```typescript
export interface WidgetContainerOptions {
  loading?: 'lazy' | 'eager' | 'idle';
  meta?: Meta;
  name?: string;
  renderStage?: 'server' | 'client';
  renderTarget?: 'light' | 'shadow';
}
```

该类型不包含 `base`、`import`、`data`、`children`、`fallback` 或 `devStyles`。`base` 和 `import` 分别是 `<web-widget>` 解析资源 URL 和装载客户端模块的输入，不属于框架无关的容器定义协议；其余字段分别属于单次渲染、框架 UI 和构建期注入。

现有 Schema 中使用期类型占用了 `WidgetContainerOptions` 名称。实施本 RFC 时，必须在同一次变更中将其替换为 `WidgetContainerProps`，并将腾出的名称用于上述定义期参数。代码库中不同时保留两套语义。

### 使用期配置

返回组件的 `widget` prop 使用 `WidgetContainerProps`。`Options` 专指 `container()` 的函数参数，`Props` 专指组件调用位置，避免两个生命周期共享同一个后缀：

```typescript
export type WidgetContainerFallback<TPending, TError = TPending> =
  TPending | { pending?: TPending; error?: TError };

export type WidgetContainerRenderMode =
  | { serverOnly: true; clientOnly?: never }
  | { clientOnly: true; serverOnly?: never }
  | { serverOnly?: false; clientOnly?: false };

export type WidgetContainerProps<TPending = never, TError = TPending> = {
  fallback?: WidgetContainerFallback<TPending, TError>;
  loading?: WidgetContainerOptions['loading'];
} & WidgetContainerRenderMode;
```

`WidgetContainerRenderMode` 需要导出，使不支持 fallback 的 adapter 也能复用 loading 和互斥模式。

## web-widget 渲染核心类型

### 元素配置

`WebWidgetElementProps` 改名为 `WebWidgetElementOptions`。它只描述可映射到 `<web-widget>` 元素状态的输入，并从 Schema 组合公共字段：

```typescript
export interface WebWidgetElementOptions extends Pick<
  WidgetContainerOptions,
  'loading' | 'renderTarget'
> {
  loader?: WidgetModuleLoader<ClientWidgetModule>;
  base?: string;
  import?: string;
  contextData?: SerializableObject;
  inactive?: boolean;
  recovering?: boolean;
  timeouts?: Timeouts;
}
```

`meta` 和 `name` 由服务端 renderer 消费，不是 `HTMLWebWidgetElement` 的公开属性，因此不放入元素配置。元素配置使用与元素 API 一致的 `contextData`；是否序列化为 attribute 由 element/renderer 实现负责，不属于 Schema 协议。

### Renderer 配置

Renderer 需要定义期配置、单次数据和内部构建信息：

```typescript
export interface WebWidgetRendererOptions extends WidgetContainerOptions {
  base?: string;
  import?: string;
  children?: string;
  data?: SerializableObject;
  inactive?: boolean;

  /** @internal Injected by build integrations in development. */
  devStyles?: ResolvedWidgetStyle[];
}
```

`WebWidgetRendererOptions` 是 `WebWidgetRenderer` 构造函数的唯一完整输入类型。目标方案不再为 adapter 定义一个统括性的内部配置概念。

adapter 的实现签名接收 web-widget 定义的完整 renderer 输入：

```typescript
options: WebWidgetRendererOptions;
```

公开重载仍只接受 `WidgetContainerOptions`，因此用户不能传入或依赖 `base`、`import`、`devStyles`。构建工具通过 adapter 的内部实现签名注入这些字段。

### Adapter 内部解析

各 adapter 在自身的容器边界计算 loading 和 render stage。该逻辑属于定义期配置与单次 props 的组合策略，不作为 `@web-widget/web-widget` 的公共 API：

```typescript
const renderOptions = {
  loading: widget.loading ?? options.loading,
  renderStage: widget.serverOnly
    ? 'server'
    : widget.clientOnly
      ? 'client'
      : options.renderStage,
};
```

默认值由 `resolveWebWidgetRendererOptions` 在 renderer 边界统一应用。元素自身的 getter 继续为直接 DOM 使用提供相同默认值，adapter 不再硬编码 `'lazy'` 或 `'light'`。

## 框架 adapter 类型

框架 adapter 只负责将公共使用期配置绑定到自己的 UI 节点类型。

React 示例：

```typescript
export type ReactWidgetContainerProps = WidgetContainerProps<ReactNode>;

export type ReactWidgetProps<Props> = Props & {
  children?: ReactNode;
  widget?: ReactWidgetContainerProps;
};

export type ReactWidgetComponent<Props> = FunctionComponent<
  ReactWidgetProps<Props>
>;
```

Vue 示例：

```typescript
export type VueWidgetContainerProps = WidgetContainerProps<VNode>;
```

HTML adapter 的 error fallback 可以是函数，因此使用第二个泛型：

```typescript
export type HtmlWidgetContainerProps = WidgetContainerProps<
  HTML,
  HTML | ((error: unknown) => HTML)
>;
```

Vue 2 不支持 fallback，显式排除该能力：

```typescript
export type Vue2WidgetContainerProps = Omit<WidgetContainerProps, 'fallback'>;
```

### container 签名

各框架返回类型不同，因此不尝试在 Schema 中模拟高阶类型。只统一 loader、定义期 options 和 props 提取：

```typescript
export function container<M>(
  loader: WidgetModuleLoader<M>,
  options?: WidgetContainerOptions
): ReactWidgetComponent<ExtractWidgetProps<M>>;

export function container<Props>(
  loader: WidgetModuleLoader,
  options?: WidgetContainerOptions
): ReactWidgetComponent<Props>;
```

Schema 中的最低结构契约也使用 `WidgetContainer` 前缀：

```typescript
export interface WidgetContainer {
  <M extends WidgetModule>(
    loader: WidgetModuleLoader<M>,
    options?: WidgetContainerOptions
  ): unknown;
}
```

该接口的返回值保持 `unknown`。具体 adapter 的声明负责提供框架组件类型，具体实现函数仍使用小写 `container()`。

### fallback 解析

fallback 的类型结构可以共享，但不统一其框架节点判定函数。React element、Vue VNode 和 HTML 对象都是对象，使用统一的 `'pending' in value` 判断可能误判框架节点。

每个 adapter 保留自己的 `resolveFallback`，但输入和输出应引用框架化后的 `WidgetContainerProps`，避免再次手写 fallback map 类型。

## 文件组织

当前 `components.ts` 同时包含公开类型、fallback 逻辑、内部 renderer wrapper 和 `container()`。建议按职责逐步拆分：

```text
src/
  container.ts          # container() 与框架组件类型
  container-options.ts  # WidgetContainerOptions 与框架化的 WidgetContainerProps
  fallback.ts           # 框架特有 fallback 判定
  renderer.ts           # 内部 WebWidget 包装组件
```

小型 adapter 可以继续合并文件，但仍需遵守相同的类型所有权，不能重新声明公共字段。

## 包依赖规则

- `@web-widget/schema` 不依赖渲染核心或 adapter；
- `@web-widget/web-widget` 应直接依赖并导入 `@web-widget/schema` 的协议类型；
- 不通过 `@web-widget/helpers` 的重导出间接获取 Schema 类型；
- adapter 从 Schema 导入公开协议，从 web-widget 导入 renderer 及内部实现类型；
- vite-plugin 生成的私有字段必须由 web-widget 拥有类型定义。

显式直接依赖可以避免隐藏的传递依赖，也能从 import 路径直接看出类型所有权。

## 验证

Schema 类型测试至少覆盖：

- `serverOnly` 与 `clientOnly` 不能同时为 `true`；
- pending 和 error 可以使用不同类型；
- `WidgetModuleLoader<M>` 保留具体模块类型；
- `ExtractWidgetProps<M>` 不因类型重组而退化。

每个 adapter 的声明测试至少覆盖：

- 自动推导源组件 props；
- 显式 `container<Props>()`；
- `widget.loading` 和 render mode；
- 框架正确的 fallback 节点类型；
- Vue 2 拒绝 fallback；
- 用户无法传入 `base`、`import`、`devStyles`；
- 构建转换生成的内部调用可以传入 `base`、`import`、`devStyles`。

`@web-widget/web-widget` 测试至少覆盖默认值只应用一次，以及 definition options 与 instance options 的覆盖优先级。

## 权衡

### 增加了类型名称

分层后类型数量略有增加，但每个名称都有唯一生命周期。相比一个宽泛类型在多个边界复用，这能减少字段误用和内部 API 泄漏。

### 不统一 fallback 实现

保留框架专用 fallback 判定会留下少量重复代码，但避免引入脆弱的跨框架节点识别抽象。公共协议只统一 fallback 的数据语义。

### Schema 与渲染核心直接依赖

`web-widget` 增加对 Schema 的显式直接依赖，但它原本已通过 helpers 间接依赖 Schema。显式依赖更准确地表达架构，并避免依赖传递性。

## 参考

- [框架组件构建转换协议](./build-transformation-protocol.zh.md)
- [跨框架 Widget 类型互操作](./cross-framework-type-interoperability.zh.md)
- [React Widget 孤岛设计](./react-widget-opinionated-design.zh.md)
- [HTML 模板 Widget 孤岛设计](./html-widget-island.zh.md)
