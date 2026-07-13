# RFC：跨框架 Widget 类型互操作

状态：早期设计 — 广泛征集方案，尚未确定方向。

## 摘要

在 Web Widget 的跨框架互操作架构中，一个框架的 widget 可以被另一个框架导入使用。运行时层面，`container` 函数已完成跨框架渲染的桥接。但在类型层面，TypeScript 无法自动推导跨框架组件的类型——导入一个 Vue widget 到 React 文件中会产生类型错误。

当前方案是提供 `asReactWidget`、`asHtmlWidget` 等类型转换函数，要求用户手动包装。本 RFC 提议通过增强 `container` 函数的泛型推导能力来消除这一繁琐的手动步骤。

## 动机

### 当前方案的痛点

以「在 React 中使用 Vue widget」为例，用户当前必须：

```tsx
import VueCounter from './Counter@widget.vue';
import { asReactWidget } from '@web-widget/vue/adapter';

// 必须手动包装，否则 TypeScript 报错
const Counter = asReactWidget(VueCounter);

function App() {
  return <Counter count={42} />; // count 类型为 unknown
}
```

这带来以下问题：

1. **繁琐**：每一个跨框架导入都需要额外的包装步骤，破坏了直接 `import` 即用的体验
2. **类型丢失**：`asReactWidget` 内部使用 `as unknown as` 强制转换，props 类型推导不完整。Vue 组件的 props 类型经过 `Omit<T, keyof ComponentPublicInstance | '$route' | '$router'>` 裁剪后，经常丢失精确类型，最终退化为 `unknown`
3. **手动标注**：`asHtmlWidget<{ count: number }>(component)` 要求用户手动传入泛型参数，无法从源组件自动推导
4. **心智负担**：用户需要知道「从哪个包导入哪个转换函数」，这对不熟悉架构的人不直观
5. **版本碎片化**：Vue 2 和 Vue 3 需要各自的 `asReactWidget` 实现，因为两者的类型结构不同
6. **运行时冗余**：虽然 `asReactWidget` 是纯类型转换（运行时是恒等函数），但它仍然是一个需要被导入和调用的真实函数，增加了代码噪音

### 目标

- **类型安全**：props 类型应从源组件自动推导，并在消费方获得正确的类型检查
- **方案无关**：不依赖特定构建工具的私有特性，保持协议的可移植性
- **adapter 解耦**：不要求消费框架 adapter 知道所有源框架的类型结构

## 现状分析

### 类型断裂的根源

构建工具在处理 `@widget` 导入时，会注入 `container` 调用来包装模块：

```typescript
// 用户代码
import Counter from './Counter@widget.vue';

// 构建后（概念性）
import { container } from '@web-widget/vue/adapter';
const Counter = container(() => import('./Counter@widget.vue'), {});
```

`container` 返回的是**消费框架**的组件类型（如 `React.FC`）。但 TypeScript 看不到这个转换——它只能看到 `Counter@widget.vue` 的原始导出，即一个 Vue 组件。类型断裂发生在 **TypeScript 的模块解析与构建工具的代码转换之间的信息差**。

### 现有类型转换函数的机制

```typescript
// @web-widget/vue/adapter — as-react-widget.ts
export function asReactWidget<T>(component: Component<T>) {
  return component as unknown as ReactWidgetComponent<
    Omit<T, keyof ComponentPublicInstance | '$route' | '$router'>
  >;
}
```

这个函数的本质是：**用 `as unknown as` 绕过 TypeScript 的类型检查，将 Vue 组件类型断言为 React 组件类型**。它是运行时恒等函数（`return component`），纯粹为类型服务。

`asHtmlWidget` 同理，但它更糟——连源组件的类型都无法推导，完全依赖用户手动传入泛型：

```typescript
export function asHtmlWidget<T = unknown>(
  component: unknown
): HtmlWidgetComponent<T> {
  return component as unknown as HtmlWidgetComponent<T>;
}
```

## 提议

### 核心思路

增强 `container` 函数的泛型推导能力。跨框架 widget 导入**推荐**显式调用 `container` 以获得类型安全：

```typescript
import { container } from '@web-widget/react/adapter';

const Counter = container(() => import('./Counter@widget.vue'));
//    ^? ReactWidgetComponent<{ count: number; title: string }>
```

`container` 成为泛型函数，从 loader 返回的模块类型中推导 props。由于 `container` 调用对 TypeScript 完全可见，类型推导路径完整。

静态 `import` 仍然可用——构建工具照常注入 `container`，运行时行为不受影响。但跨框架场景下 TypeScript 解析到的是源框架的原始模块类型，props 不会自动映射到消费框架的组件类型。需要类型安全的用户主动使用显式 `container()` 调用。

### 约定变更

- `container()` 成为跨框架 widget 导入的**推荐写法**，提供完整的 props 类型推导
- 静态 `import` 不受影响——同框架和跨框架均可使用，运行时行为一致
- 构建工具无需改动——继续对所有 `@widget` 导入统一注入 `container`
- `asReactWidget`、`asHtmlWidget` 等手动转换函数废弃（`container()` 的泛型推导完全替代）

### 为什么选择此方案

- 构建工具零改动——`container` 本身就是运行时 API，类型增强是自然延伸，不引入同/跨框架判断逻辑
- 类型推导路径完整——从源模块类型到消费框架组件类型，全部由 `container` 的泛型签名承载
- 无运行时风险——静态 `import` 永远可用，`container()` 是 opt-in 的类型增强
- 与运行时架构一致——运行时 `container` 接收 `Loader`（返回通用 `WidgetModule`），类型层面只需对齐

## 详细设计

### adapter 职责划分

消费框架的 adapter（如 `@web-widget/react`）不需要知道各源框架的组件类型——类型提取是源框架 adapter 的职责，类型映射是消费框架 adapter 的职责，两者通过泛型化的 `WidgetModule<P>` 协议衔接。

```
                           WidgetModule<P>
Source adapter        ┌──────────────────────┐        Consumer adapter
(@web-widget/vue3)    │ default: Component   │    (@web-widget/react)
                      │ render: function     │
Vue component         │                      │        React component
defineProps<T>()      │                      │        ReactWidgetComponent<P>
      │               └──────────────────────┘               ▲
      └── extract P ─────────────────── map P ───────────────┘
```

这与运行时架构完全一致——运行时 `container` 接收的是 `Loader`（返回通用 `WidgetModule`），`render` 函数已将源框架组件转换为协议化渲染结果，消费端 adapter 调用时完全不知道源是 Vue 还是 Svelte。类型层面只需对齐：

1. **`WidgetModule` 泛型化**——让 props 类型通过模块类型流转：

```typescript
interface WidgetModule<P = unknown> {
  default: ...  // 携带 P
  render: ServerRender | ClientRender;
}
```

2. **源框架 adapter 提取 P**——构建产物（`.d.ts`）携带正确的 props 类型：

```typescript
// @web-widget/vue3 构建产物 —— 从 Vue 组件提取 ComponentProps<P>
export default WidgetModule<{ count: number; title: string }>;

// @web-widget/react 构建产物 —— React 组件天然携带 ComponentType<P>
export default WidgetModule<{ count: number; title: string }>;
```

3. **消费框架 container 泛型映射**——只需把 `P` 映射到自己的组件类型：

```typescript
// @web-widget/react —— 只知道 ReactWidgetComponent<P>，不知道 P 从哪来
function container<P>(
  loader: () => Promise<WidgetModule<P>>,
  options?: DefineWebWidgetOptions
): ReactWidgetComponent<P>;
```

消费端 adapter 不应耦合所有源框架的类型。否则 `@web-widget/react` 将依赖 `vue`、`svelte`、`solid-js` 的类型定义，每新增一个框架所有消费端都要更新，直接违背 build-transformation-protocol 的 adapter 解耦目标。

### 各框架 props 类型推导可行性

方案的核心依赖是：`container` 的泛型签名能从 `() => Promise<{ default: Component<P> }>` 中推导出 `P`（源组件的 props 类型）。

React 组件的 props 提取有内置标准工具 `React.ComponentProps<typeof MyComponent>`，无论函数组件、`React.FC` 还是 `ComponentType` 都能正确提取。`container` 的泛型签名可直接利用：

```typescript
function container<P>(
  loader: () => Promise<{ default: React.ComponentType<P> }>,
  options?: DefineWebWidgetOptions
): ReactWidgetComponent<P>;
```

Vue 3 有两种声明方式——`<script setup>` + `defineProps<T>()`（基于类型）和 `defineComponent({ props })`（运行时），两者都携带 props 类型。官方工具链提供了 [`vue-component-type-helpers`](https://www.npmjs.com/package/vue-component-type-helpers)（属于 `vuejs/language-tools`），其中 `ComponentProps<typeof MyComponent>` 可提取完整 props。Vue 3.3+ 也内置了 `ExtractPublicPropTypes<T>`。前提是使用类型化声明且配置了 Volar；仅用 `props: ['name']` 时类型退化为 `unknown`。

```typescript
import type { ComponentProps } from 'vue-component-type-helpers';

type VueWidgetProps<M> = M extends { default: infer C }
  ? C extends Component
    ? ComponentProps<C>
    : never
  : never;

function container<M extends { default: Component }>(
  loader: () => Promise<M>,
  options?: DefineWebWidgetOptions
): VueWidgetComponent<VueWidgetProps<M>>;
```

Vue 2 类型系统较弱，没有成熟的 `ComponentProps` 等价工具。props 类型通过 `Component` 的第 4 个泛型参数携带，需自行编写条件类型提取（当前 `@web-widget/vue2/as-react-widget.ts` 已用此方式）。依赖内部类型参数顺序，较脆弱；且大量 Vue 2 项目使用 `props: ['count']`，此时类型为 `unknown`。

Svelte 5 内置 `ComponentProps<typeof MyComponent>`，配合 `$props()` + TypeScript 接口声明，提取质量高，无需第三方工具。

HTML widget 是普通函数 `(props?: T) => Promise<UnsafeHTML>`，props 类型即函数首参，提取最简单。但 HTML 模板函数本身不强制类型约束，通常仍需手动标注。

SolidJS 组件类型为 `SolidComponent<P>` 或函数 `(props: P) => JSX.Element`，内置 `ComponentProps<T>` 可从组件类型提取 props。`Dynamic` 组件已使用此类型：`ComponentProps<T extends ValidComponent>`。与 React 类似，Solid 组件的 props 类型天然暴露在函数签名中，提取无障碍。

Preact 与 React 类型系统几乎一致，`preact.ComponentProps<T>`（或直接复用 React 兼容类型）可提取 props。Preact 组件类型为 `FunctionalComponent<P>` 或 `ComponentClass<P>`，提取方式与 React 完全相同。

Lit 组件继承 `LitElement`，通过 `@property()` 装饰器声明响应式属性。这些属性在类上直接声明为 TypeScript 类成员，因此 `InstanceType<typeof MyElement>` 可获取实例类型，再通过条件类型筛选出 `@property()` 装饰的属性即可。但 Lit 的属性本质上是 DOM 属性而非函数 props，提取后需映射为 widget props 约定（如将 `string` 类型的 `@property()` 映射为可序列化的字符串属性）。类型提取本身可行，但语义映射需额外设计。

Angular 组件使用 `input()` 函数（Signal API，Angular 17+）或 `@Input()` 装饰器声明输入。`input()` 返回 `InputSignal<T>`，类型在类成员上直接可见。理论上可通过 `keyof` + 条件类型提取所有 `InputSignal<T>` 成员并解包 `T`，但 Angular 组件的输入模型与 widget props 差异较大——输入支持 `transform`、`alias`、模板绑定语法，且 Angular 的编译器对 `input()` 有特殊处理（要求静态可分析）。此外 Angular 的模板类型检查依赖其专用编译器（`ngtsc`），与标准 TypeScript 的交互方式与其他框架不同，类型提取的边界尚需验证。

Qwik 组件类型为 `Component<P>`（由 `component$((props: P) => ...)` 创建），props 类型直接携带在泛型参数中。Qwik 与 React/Solid 类似，属于 JSX 函数组件范式，提取方式相同。

| 源框架   | props 提取工具                                                   | 可行性 | 前提条件                   |
| -------- | ---------------------------------------------------------------- | ------ | -------------------------- |
| React    | `React.ComponentProps`（内置）                                   | 高     | 无                         |
| Vue 3    | `vue-component-type-helpers` 或 `ExtractPublicPropTypes`（3.3+） | 高     | 需使用类型化声明 + Volar   |
| Vue 2    | 自行从泛型参数提取                                               | 中     | 依赖内部类型结构，脆弱     |
| Svelte 5 | `ComponentProps`（内置）                                         | 高     | 无                         |
| SolidJS  | `ComponentProps`（内置）                                         | 高     | 无                         |
| Preact   | `ComponentProps`（内置）                                         | 高     | 无                         |
| Qwik     | 泛型参数推导                                                     | 高     | 无                         |
| Lit      | `InstanceType` + 条件类型筛选                                    | 中     | 需额外的属性语义映射       |
| Angular  | `keyof` + `InputSignal<T>` 解包                                  | 低     | 输入模型差异大，编译器特殊 |
| HTML     | 函数参数推导                                                     | 高     | 需手动标注 props           |

类型推导在 React、Vue 3、Svelte 5、SolidJS、Preact、Qwik、HTML 上均可行，工具链已成熟——这些框架都采用函数组件或泛型组件范式，props 类型天然暴露。Vue 2 和 Lit 需要额外的类型工程，但可行。Angular 是唯一可行性较低的框架，其输入模型与 widget props 差异最大，且依赖专用编译器。

### 已知限制

- **类型噪音**：推导出的类型可能非常复杂，错误信息难以理解
- **opt-in 的认知成本**：用户需要知道跨框架场景下显式 `container()` 能提供更好的类型推导，否则会继续使用静态 `import` 并得到不精确的类型

## 备选方案

### 方案 A：构建期类型声明生成

构建工具在处理 `@widget` 导入时，不仅转换运行时代码，还为每个跨框架导入生成对应的类型声明文件（`.d.ts`）。

```typescript
// 虚拟模块：./Counter@widget.vue.d.ts（概念性）
import type { ReactWidgetComponent } from '@web-widget/react';
declare const Counter: ReactWidgetComponent<{
  count: number;
  // 从 Vue SFC 的 defineProps 推导出的 props
}>;
export default Counter;
```

**未选择的原因**：需要构建工具具备类型分析和生成能力，这与「适配器协议使构建工具与框架解耦」的设计目标冲突。Vue SFC 的类型提取尤为复杂。

### 方案 C：TypeScript 插件 / 语言服务扩展

开发一个 TypeScript 语言服务插件，在编辑器中动态为跨框架 `@widget` 导入提供正确的类型信息。

**未选择的原因**：实现复杂度极高；仅对支持 LSP 的编辑器有效；`tsc --noEmit` 等 CLI 类型检查无法获益；插件需要复制构建工具的框架识别逻辑。

### 方案 D：约定式类型投射 + 泛型 `WidgetProps`

定义一个框架无关的 `WidgetProps<T>` 机制，要求所有适配器包的组件类型都遵循统一的结构约定。

```typescript
// @web-widget/schema
interface WidgetComponentBase<P = unknown> {
  readonly __widgetProps__?: P;
}
```

**未选择的原因**：侵入框架类型，在 Vue SFC 场景下难以实现；Vue 与 React 的 props 语义不同，强行统一可能丢失信息；仍未解决自动导入的类型断裂。

### 方案 E：统一的 `declare module` + 框架上下文检测

利用 TypeScript 的模块声明合并，为 `*.widget.*` 声明多个类型定义，通过构建工具生成的 `tsconfig` 或 reference 指令控制当前项目生效哪一个。

**未选择的原因**：`tsconfig` 是项目级的，无法做到「同一项目中 React 文件看到 React 类型、HTML 文件看到 HTML 类型」；模块声明无法获取源组件的 props 类型，只能声明为 `unknown`；多个适配器包声明同一后缀会产生声明合并冲突。

## 开放问题

1. **props 类型推导的可行性边界**：在不侵入框架编译的前提下，能从 Vue SFC / Svelte 组件中提取多精确的 props 类型？这是所有方案的核心依赖。

2. **构建工具的角色**：类型问题的解决应该放在构建工具、适配器包、还是 TypeScript 层面？目前的架构设计倾向于让构建工具与框架解耦，但类型生成可能要求构建工具更深入地理解框架。

3. **渐进式路径**：是否可以分阶段实施——先让 `container()` 调用具备完整类型（方案 B），再逐步解决自动导入的类型断裂？

4. **`unknown` 是否可接受**：如果无法精确推导 props 类型，退而求其次让跨框架 widget 的 props 为 `unknown`（接受任意 props，不做类型检查）是否可以接受？这至少消除了手动转换的繁琐。

## 下一步

征集对各方案的反馈，特别是：

- 各方案在实际项目中的可行性评估
- props 类型推导的技术约束（尤其是 Vue SFC 场景）
- 是否存在本 RFC 未列举的方案

根据反馈确定一个方向，进入详细设计阶段。

## 参考

- [框架组件构建转换协议](./build-transformation-protocol.zh.md) — `WebWidgetAdapter` 协议与 `container` 的定义
- [React Widget 孤岛设计](./react-widget-opinionated-design.zh.md) — React `container` 的运行时行为
- [HTML 模板 Widget 孤岛设计](./html-widget-island.zh.md) — HTML `container` 与 `asHtmlWidget` 的设计动机
