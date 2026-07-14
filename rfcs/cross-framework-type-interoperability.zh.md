# RFC：跨框架 Widget 类型互操作

状态：已实现

## 摘要

在 Web Widget 的跨框架互操作架构中，一个框架的 widget 可以被另一个框架导入使用。运行时层面，`container` 函数已完成跨框架渲染的桥接。本 RFC 描述如何通过 `container` 函数的泛型推导能力，在类型层面实现跨框架 props 类型的自动推导，消除手动类型转换函数（`asReactWidget`、`asHtmlWidget` 等）。

## 动机

### 旧方案的痛点

以「在 React 中使用 Vue widget」为例，旧方案要求用户手动包装：

```tsx
import VueCounter from './Counter@widget.vue';
import { asReactWidget } from '@web-widget/vue/adapter';

const Counter = asReactWidget(VueCounter);

function App() {
  return <Counter count={42} />; // count 类型为 unknown
}
```

问题：

1. **繁琐**：每一个跨框架导入都需要额外的包装步骤
2. **类型丢失**：`asReactWidget` 内部使用 `as unknown as` 强制转换，props 经 `Omit<T, keyof ComponentPublicInstance | '$route' | '$router'>` 裁剪后经常退化为 `unknown`
3. **手动标注**：`asHtmlWidget<{ count: number }>(component)` 要求用户手动传入泛型参数
4. **心智负担**：用户需要知道「从哪个包导入哪个转换函数」
5. **版本碎片化**：Vue 2 和 Vue 3 需要各自的 `asReactWidget` 实现

### 目标

- **类型安全**：props 类型应从源组件自动推导，并在消费方获得正确的类型检查
- **方案无关**：不依赖特定构建工具的私有特性，保持协议的可移植性
- **adapter 解耦**：不要求消费框架 adapter 知道所有源框架的类型结构

## 设计

### 核心思路

`container` 函数作为跨框架 widget 导入的统一入口，通过 `ExtractModuleProps<M>` 泛型类型从模块的默认导出自动推导 props：

```typescript
import { container } from '@web-widget/react/adapter';

const Counter = container(() => import('./Counter@widget.vue'));
//    ^? ReactWidgetComponent<{ count: number }>
```

由于 `container` 调用对 TypeScript 完全可见，类型推导路径完整。静态 `import` 也由构建工具自动转换为 `container` 调用，运行时行为一致。

### `ExtractModuleProps` 实现

各框架 adapter 在自己的 `container` 签名中实现 `ExtractModuleProps<M>`，从模块的默认导出提取 props 类型：

**React**（消费端 adapter，匹配源框架的组件类型）：

```typescript
type ExtractModuleProps<M> = M extends { default: infer C }
  ? C extends ComponentType<infer P> // React 组件
    ? P
    : C extends new (...args: any[]) => { $props: infer P } // Vue 组件
      ? P
      : unknown
  : unknown;
```

**HTML**（同理，额外匹配函数组件签名）：

```typescript
type ExtractModuleProps<M> = M extends { default: infer C }
  ? C extends (props: infer P, ...args: any[]) => any // HTML/React 函数组件
    ? P
    : C extends new (...args: any[]) => { $props: infer P } // Vue 组件
      ? P
      : unknown
  : unknown;
```

### adapter 职责划分

类型提取是源框架 adapter 的隐含职责（组件类型天然携带 props），类型映射是消费框架 adapter 的职责，两者通过模块的默认导出衔接：

```
                           Module default export
Source adapter        ┌──────────────────────┐        Consumer adapter
(@web-widget/vue3)    │ Vue Component        │    (@web-widget/react)
                      │ carries $props       │
Vue component         │                      │        React component
defineProps<T>()      │                      │        ReactWidgetComponent<P>
      │               └──────────────────────┘              ▲
      └── $props ──────────────── ExtractModuleProps ───────┘
```

消费端 adapter 不耦合所有源框架的类型。`@web-widget/react` 不依赖 `vue` 的类型定义——`ExtractModuleProps` 通过结构匹配（`new (...args) => { $props: infer P }`）提取 Vue 组件的 props，无需 `import` Vue 类型。

### 静态导入与显式调用

两种写法在运行时等价，构建工具统一处理：

```typescript
// 1. 静态导入（约定式，构建工具自动转换为 container 调用）
import Counter from './Counter@widget.vue';

// 2. 显式 container() 调用
import { container } from '@web-widget/react/adapter';
const Counter = container(() => import('./Counter@widget.vue'));
```

显式写法适用于需要添加额外选项（如 `loading`、`renderTarget`）的场景。

### 各框架 props 类型推导可行性

| 源框架   | props 提取方式                                  | 可行性 | 前提条件                   |
| -------- | ----------------------------------------------- | ------ | -------------------------- |
| React    | `ComponentType<infer P>` 结构匹配               | 高     | 无                         |
| Vue 3    | `new (...args) => { $props: infer P }` 结构匹配 | 高     | 需使用类型化声明 + Volar   |
| Vue 2    | 同 Vue 3（Vue 2 类型结构兼容）                  | 中     | 依赖内部类型结构           |
| Svelte 5 | `ComponentProps`（内置）                        | 高     | 无                         |
| SolidJS  | `ComponentProps`（内置）                        | 高     | 无                         |
| Preact   | `ComponentProps`（内置）                        | 高     | 无                         |
| Qwik     | 泛型参数推导                                    | 高     | 无                         |
| Lit      | `InstanceType` + 条件类型筛选                   | 中     | 需额外的属性语义映射       |
| Angular  | `keyof` + `InputSignal<T>` 解包                 | 低     | 输入模型差异大，编译器特殊 |
| HTML     | `(props: infer P, ...) => any` 函数参数推导     | 高     | 无                         |

类型推导在 React、Vue 3、Svelte 5、SolidJS、Preact、Qwik、HTML 上均可行——这些框架都采用函数组件或泛型组件范式，props 类型天然暴露。Vue 2 和 Lit 需要额外的类型工程。Angular 是唯一可行性较低的框架。

### 已知限制

- **Vue 2 运行时声明**：仅用 `props: ['count']`（数组声明）时，Vue 类型系统无法携带 props 类型，推导结果为 `unknown`
- **Angular 输入模型**：Angular 的 `input()` / `@Input()` 与 widget props 语义差异较大，且依赖 `ngtsc` 专用编译器，类型提取可行性较低

## 未选择的方案

### 方案 A：构建期类型声明生成

构建工具为每个跨框架导入生成虚拟 `.d.ts` 类型声明。

**未选择的原因**：需要构建工具具备类型分析和生成能力，与「适配器协议使构建工具与框架解耦」的设计目标冲突。Vue SFC 的类型提取尤为复杂。

### 方案 B：TypeScript 语言服务插件

开发 TypeScript 语言服务插件，在编辑器中动态提供类型信息。

**未选择的原因**：实现复杂度极高；仅对支持 LSP 的编辑器有效；`tsc --noEmit` 等 CLI 类型检查无法获益。

### 方案 C：约定式类型投射

定义框架无关的 `WidgetProps<T>` 机制，要求所有适配器包遵循统一结构约定。

**未选择的原因**：侵入框架类型，在 Vue SFC 场景下难以实现；Vue 与 React 的 props 语义不同，强行统一可能丢失信息。

## 参考

- [框架组件构建转换协议](./build-transformation-protocol.zh.md) — `WebWidgetAdapter` 协议与 `container` 的定义
- [React Widget 孤岛设计](./react-widget-opinionated-design.zh.md) — React `container` 的运行时行为
- [HTML 模板 Widget 孤岛设计](./html-widget-island.zh.md) — HTML `container` 的设计动机
