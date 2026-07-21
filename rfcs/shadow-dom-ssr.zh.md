# RFC：Shadow DOM SSR 渲染架构

## 摘要

本 RFC 提议为 Web Widget 引入基于 Declarative Shadow DOM 的 SSR，使 Widget 在保持跨框架 hydration 的同时获得原生样式隔离和 slot 能力。

## 动机

Web Widget 希望让组件作为独立交付单元嵌入未知宿主，但 `<web-widget>` 目前只提供模块和生命周期边界。light DOM 的样式级联仍是双向的，Widget 的视觉正确性会受到宿主 CSS、遗留代码和工具链差异影响，也缺少原生 slot、`:host` 和 `::part()` 等受控组合接口。Shadow DOM 可以补全这一渲染边界。

仅在客户端调用 `attachShadow()` 会损失 SSR 的主要价值：JavaScript 执行前没有最终样式和 slot 语义，首屏可能发生闪烁或布局跳变，禁用 JavaScript 时结构不完整，而且将 SSR light DOM 转换为 shadow tree 难以保持节点 identity。所需能力因此不是客户端 Shadow DOM，而是让浏览器在解析服务端 HTML 时直接得到最终 ShadowRoot。

这项能力还必须保持框架无关。ShadowRoot 的创建、恢复、样式和 slot 语义应由 Web Widget 核心统一管理，React、Vue 等适配器仍只接收稳定的 HTMLElement。这样才能在获得隔离能力的同时，保留 SSR、统一 hydration 协议和 light DOM 渐进兼容。

## 提议

采用“Boundary + internal Element Root + StyleController + structured serializer”作为 Shadow DOM SSR 的统一架构。

- 服务端使用 DSD 创建 open ShadowRoot。
- SSR HTML 放入唯一的 `<web-widget-root>`。
- 客户端复用该内部 Element；纯客户端渲染时创建相同结构。
- Widget CSS 作为模块资产进入 ShadowRoot，不依赖 document 全局样式。
- 用户 children 保留在 light DOM，使用原生 `<slot>`。
- lifecycle state 使用保留的、不可见的 light DOM slot，避免进入用户 slot。
- 不使用 per-widget inline shim，不覆写 `attachShadow()`；客户端 DSD 兼容层仅在被转换的 host 上包装 `attachInternals()`，保留 `ElementInternals.shadowRoot` 语义。
- 适配器继续接收 HTMLElement，不感知 ShadowRoot 的创建和恢复过程。

构建配置声明 Widget 容器的默认选项：

```typescript
webWidgetPlugin({
  adapters: ['@web-widget/react'],
  defaults: {
    loading: 'lazy',
    root: 'shadow',
  },
});

const Counter = widget(() => import('./Counter@widget.tsx'));
```

首个稳定协议只支持：

- `shadowrootmode="open"`；
- 完整字符串形式的 Widget SSR；
- 原生 Declarative Shadow DOM，以及客户端兼容层可覆盖的浏览器；
- 明确支持 SSR 和 hydration 的框架适配器。

以下能力不属于本提议的基础协议：closed root、Widget 内部流式 SSR、portal/teleport 自动重定向、全局样式库适配、Widget 内部懒加载模块的 CSS 自动重定向和 constructable stylesheet。

## 详细设计

### DOM 封装协议

Shadow SSR 的规范输出为：

```html
<web-widget import="/assets/counter.js" root="shadow" recovering>
  <template shadowrootmode="open">
    <style data-web-widget-style="counter.css">
      :host {
        display: block;
      }
      button {
        color: var(--counter-color, royalblue);
      }
    </style>
    <web-widget-root style="display: contents">
      <section>
        <slot name="label"></slot>
        <button>1</button>
      </section>
    </web-widget-root>
  </template>
  <span slot="label">Count</span>
  <script slot="web-widget-state">
    /* lifecycle cache transfer */
  </script>
</web-widget>
```

节点归属固定如下：

| 内容            | 所属位置                         | 原因                          |
| --------------- | -------------------------------- | ----------------------------- |
| Widget CSS      | ShadowRoot，且在挂载根之前       | 首屏隔离样式与确定性级联      |
| pending slot    | 有 pending UI 时位于 ShadowRoot  | pending UI 不占用用户 slot    |
| Widget SSR HTML | `<web-widget-root>` 内           | 为所有适配器提供 Element 容器 |
| 用户 children   | `<web-widget>` light DOM         | 参与原生 slot assignment      |
| lifecycle state | host 内保留的隐藏 light DOM slot | 维持执行时序且不进入用户 slot |

`<web-widget-root>` 是内部普通元素，不注册为 Custom Element。`display: contents` 避免默认增加布局盒，但它仍是组件 HTML 的真实父节点，因此样式不能依赖 `:host > .child`：

- `:host` 只选择 host；
- 组件内容选择器从 `web-widget-root` 内开始；
- 外部主题使用 CSS custom properties、`::part()` 和 `::slotted()`。

### 结构化服务端结果

服务端先生成结构化 parts，再由唯一 serializer 决定节点位置：

```typescript
interface WidgetRenderParts {
  attributes: Record<string, string>;
  target: 'light' | 'shadow';
  appHTML: string;
  lightChildrenHTML: string;
  styles: ResolvedWidgetStyle[];
  transferHTML: string;
}
```

Shadow serializer 按以下顺序构造输出：

```typescript
const shadowHTML = stylesHTML + pendingSlot + root(appHTML);
const innerHTML = dsd(shadowHTML) + lightChildrenHTML + transferHTML;
return host(attributes, innerHTML);
```

这保证 `appHTML` 只出现一次。light serializer 继续把 `appHTML` 放在 host 内；用于原生 slot 的 children 只允许与 shadow target 一起使用。

`renderStage: 'client'` 不加载服务端模块，但仍输出空 DSD 边界和内部 mount root，使 client-only Widget 与 SSR Widget 使用相同的客户端结构。

### 客户端根节点

Shadow 模式的容器获取顺序为：

1. recovering 时读取 `host.shadowRoot`；不存在则报错。
2. 在 ShadowRoot 的直接子元素中查找唯一的 `<web-widget-root>`。
3. mount root 缺失或重复时产生可诊断错误。
4. 非 recovering 且没有 ShadowRoot 时，创建 open ShadowRoot 和内部 mount root。
5. 在框架 bootstrap 前安装 Widget 样式。
6. 将内部 HTMLElement 作为 `ClientRenderOptions.container` 传给适配器。

hydration 完成后移除 `recovering`，但保留内部 root，供更新、卸载和诊断继续使用。原生 DSD 路径和普通客户端创建路径不得覆写 host 的平台方法；非原生 DSD 的兼容路径允许安装下文定义的 host-local `attachInternals()` 包装。

节点 identity 是否复用由框架适配器的 hydration 能力决定。React、Vue、Preact 和 Svelte 使用内部 Element 执行恢复；Solid 当前的 hydration key registry 仍是 document-global，为避免多个隔离 root 的 key 冲突，Solid 适配器会在内部 Element 中清空 SSR 子树后执行一次客户端 mount。该降级保留 DSD 首屏、ShadowRoot 和样式节点，但不保证应用子节点 identity；在提供 root-local render ID 前不把 Solid 计入 identity hydration 支持。

### Widget 样式协议

Widget module 继续使用现有 `meta` 声明样式：

```typescript
interface WidgetModule {
  default?: unknown;
  render?: ServerRender | ClientRender;
  meta?: Meta;
}
```

Shadow 模式只消费 `meta.style` 和 `meta.link[rel="stylesheet"]`，将它们规范化为内部 `ResolvedWidgetStyle` 后安装到 ShadowRoot。其他 meta 字段继续遵循原有语义，不进入 ShadowRoot。

样式规则如下：

- `meta.style[].content` 表示内联样式；
- `meta.link[rel="stylesheet"]` 表示外链样式；
- 显式 `id` 用于去重、排序和 HMR；缺失时由位置和 URL 生成稳定 ID；
- 相对 `href` 以 Widget 客户端模块地址为基准解析；
- server 和 client Widget module 必须产生相同的 meta 样式与顺序；
- SSR 使用 `<style>` 或 `<link rel="stylesheet">` 序列化到 DSD；
- 客户端在框架 bootstrap 前复用或创建对应样式节点；
- hydration 更新已知模块样式时，不移动仅存在于 SSR 边界中的容器级覆盖样式；
- light target 不把边界样式注入 ShadowRoot。

`meta` 不通过 `<web-widget>` 属性传输。服务端和客户端分别从各自加载的 Widget module 读取 meta，因此构建工具负责让两端产物保持一致。

开发模式不能依赖生产 manifest。Vite 插件必须从 client environment 取得已经完成 CSS Modules、SFC、PostCSS 和 URL 重写的最终 CSS，再把 `{ id, content }` 作为内部 `devStyles` 注入 `widget()` 选项。服务端将内容写入 DSD，并通过 `<web-widget devstyles>` 只向客户端传递稳定 ID；客户端以该 ID 订阅 Vite 的 `data-vite-dev-id` 样式源，把后续内容更新同步到所有已注册的 ShadowRoot，而不把源样式留在 document head。

CSS Modules 变更可能同时改变类名映射和 CSS 选择器。由于框架 HMR 接受边界会阻止 Vite 默认失效继续向 route importer 传播，开发服务器必须额外失效 CSS 的服务端 importer 链，使嵌入 `devStyles` 的 widget transform 重新执行。整页刷新后的 SSR 类名和 DSD CSS 必须来自同一轮转换；不能只更新客户端类名映射。

`widget(loader, { meta })` 中的样式由服务端合并在模块样式之后。客户端没有再次序列化这份 meta，而是把 DSD 中没有对应客户端 descriptor 的样式视为 SSR 边界已有的覆盖层，保留节点及其级联位置。`renderStage: 'client'` 也必须先把该容器级样式写入空 DSD。完全在浏览器中创建、没有服务端边界的 Widget，则应把必要 CSS 放在 Widget module meta 中。

Shadow Widget 的首屏必要 CSS 应随 DSD 到达，避免 ShadowRoot 内容在外部 stylesheet 加载前无样式显示。是否对大样式使用 shadow 内 `<link>`，应由后续性能数据决定。

### CSS 资产所有权与重复消除

Vite 可以在模块图和构建产物层面复用 CSS asset，但不会理解 `<head>` 与 ShadowRoot 的样式所有权，也不会因为 DSD 内已经存在相同 CSS 而移除 `<head>` 中的 `<style>` 或 `<link rel="stylesheet">`。如果资产收集链路同时把 Widget CSS 加入 route meta 和 Widget module meta，会产生两类重复：

- 内联 CSS 同时出现在 document head 和 DSD，直接增加 SSR HTML 体积；
- 外链 CSS 同时出现在 head 和 ShadowRoot。浏览器通常可以复用网络缓存，但仍会创建两份 stylesheet 关系，而 head 中的规则不能作用于 ShadowRoot。

多个 ShadowRoot 各自持有样式节点不等同于上述重复。除非采用 constructable stylesheet，每个 ShadowRoot 都必须显式引用或包含 Widget CSS；需要消除的是同一 Widget CSS 在 document head 与 ShadowRoot 之间没有作用域收益的重复交付。

资产协议以 `webWidgetPlugin.defaults.root` 作为构建级契约：

- `defaults.root: 'shadow'` 时，Widget CSS 不进入 route head，只保留在 Widget module meta，由 DSD/ShadowRoot 消费。
- `defaults.root: 'light'` 时，Widget CSS 进入 route head，不创建 ShadowRoot 样式副本。
- build transform 将全局值注入每个 Widget renderer，manifest 和 dev module graph 使用同一个值，避免 CSS 所有权与运行时 `root` 不一致。
- Widget module 自身的 CSS asset 映射始终保留；去重只影响 route head，不影响 ShadowRoot 获取样式。

运行时允许同一个构建混用 light/shadow Widget，但构建期 CSS 去重只能依据 `defaults.root` 做全局决策，不能静态分析每个 `widget()` 的局部覆盖。局部 `root` 与全局默认值不同时仍可正确渲染，但 Widget CSS 可能同时出现在 document head 和 ShadowRoot；要求确定 CSS 所有权和零重复交付的应用应选择单一全局 `root`。非 Vite 集成仍可直接使用底层 `WebWidgetRendererOptions.root`，但不获得该构建期 CSS 去重协议。

### 限制

当前协议只能接管 Widget 入口同步依赖图中可收集的 CSS，不能透明接管 Widget 运行后才执行的内部动态导入。例如：

```ts
// Counter@widget.tsx
const LazyPanel = lazy(() => import('./LazyPanel'));

// LazyPanel.tsx
import './lazy-panel.css';
```

生产构建中，Vite 会把第二个导入改写为带 CSS dependency 的 preload，并在执行动态导入时向 document `<head>` 插入 `<link rel="stylesheet">`；开发模式则通过 CSS runtime 向 `<head>` 插入 `style[data-vite-dev-id]`。document stylesheet 不能作用于 ShadowRoot，因此 `LazyPanel` 可能没有样式；选择器还可能意外作用于 light DOM。初始 DSD 中已经存在的 Widget CSS 不会改变这条后续加载链路。

该行为不能通过全局监听或覆写 `document.head` 安全修正：Vite preload 不携带具体 Widget 实例或 ShadowRoot，同一个异步 chunk 也可能被 route、light Widget、多个 shadow Widget 共同使用。全局移动/删除 stylesheet 或过滤 preload 会破坏这些共享消费者，并且无法可靠处理并发加载、失败重试、HMR 和 Widget 卸载。

当前可用的规避方案是：

- 将 Shadow Widget 必需的 CSS 静态导入 Widget 入口，使其进入 Widget module meta 和 DSD；组件代码仍可独立懒加载，但对应 CSS 会提前加载。
- 使用 `?inline` 将 CSS 作为字符串导入，或显式创建 constructable stylesheet，由懒加载组件在自身 ShadowRoot 内安装，而不依赖 Vite 的 document CSS side effect。
- 无法控制依赖加载方式时，为该 Widget 使用 light target。

若未来提供透明支持，需要新增 Widget-aware lazy style 协议：构建阶段记录异步 CSS 的所有权，运行时把一次动态加载关联到一个或多个具体 ShadowRoot，并定义共享 chunk、去重、失败、HMR 与卸载语义。在该协议完成前，不应把 Vite 默认的动态 CSS 注入视为 Shadow SSR 已支持能力。

### 原生 slot 语义

Widget 组件必须显式渲染原生 slot：

```tsx
export default function Panel() {
  return (
    <section>
      <header>
        <slot name="title" />
      </header>
      <div>
        <slot />
      </div>
    </section>
  );
}
```

```tsx
<PanelWidget>
  <h2 slot="title">Profile</h2>
  <p>Content</p>
</PanelWidget>
```

Boundary 不复制 children，不把 children 传给子框架，也不参与 slot assignment。浏览器负责 `assignedNodes()`、`assignedElements()` 和 `slotchange`。

组件调用的顶层 props 仍属于 Widget 数据。顶层 `slot` 作为原生组合的常用简写保留，并由适配器透明地附加到实际 Widget Host。其他 Host 属性和协议属性由容器内部管理；组件 props 是否作用于内部 DOM，由组件自行决定。

需要遵守以下限制：

- `::slotted()` 只能选择直接分配到 slot 的元素；
- light DOM 内容仍受宿主文档样式和继承影响；
- CSS custom properties 会继承进 ShadowRoot，并作为推荐主题 API；
- SSR 与客户端必须输出一致的 slot 名称和结构。

### lifecycle 与 pending 节点

pending UI 使用专用的 `<web-widget-pending>` 元素标识生命周期所有权。在 shadow target 下，该元素同时使用保留 slot `web-widget-pending`，且只有直属的 `<web-widget-pending slot="web-widget-pending">` 存在时才创建对应 `<slot>`；light target 下沿用同一专用元素但不设置 slot。这样业务 children 即使误用了同名 slot 也不会被当作 pending UI 清理。客户端进入 mounting 状态时只移除直属的 `<web-widget-pending>`。

lifecycle cache 的传输脚本直接使用稳定的保留 slot `web-widget-state`。该命名 slot 没有对应的 `<slot>`，因此脚本不会进入用户默认 slot 或内部 mount root，但仍会由 HTML parser 正常执行。

### lazy loading

`web-widget { display: contents }` 没有自身布局盒。lazy loading 在 light 模式下观察可见 light child，在 Shadow 模式下观察 ShadowRoot 内第一个具有布局盒的元素；没有可观察内容时插入最小 placeholder。observer 触发后立即断开并启动 Widget 生命周期。

### 错误与降级

以下情况必须产生明确错误：

- recovering host 没有 ShadowRoot；
- ShadowRoot 中不存在或存在多个内部 mount root；
- 适配器不支持 Shadow SSR hydration；
- server/client 的边界结构不一致。

同一次恢复不能自动从 shadow 切换到 light，因为这会改变 DOM 所有权、slot 分配和 CSS 语义。业务错误可以由 Widget fallback 处理，边界协议错误应保留明确诊断。

### 浏览器与 CSP

`shadowrootmode` 的原生支持基线为：

| 浏览器        | 最低版本 |
| ------------- | -------- |
| Chrome / Edge | 111      |
| Firefox       | 123      |
| Safari        | 16.4     |

Chrome 90–110 曾支持旧属性 `shadowroot`，但该属性已经移除，服务端统一输出标准的 `shadowrootmode`。

原生支持时，HTML parser 会消费 `<template shadowrootmode>` 并直接创建 ShadowRoot。客户端安装阶段扫描不到该 template，不执行额外操作。

不支持原生 DSD 时，template 会保留在 light DOM。`packages/web-widget/src/polyfill.ts` 在注册 `<web-widget>` 前执行兼容逻辑。

该兼容策略的能力边界是：

- 需要 JavaScript，不能提供无 JavaScript 的 Shadow SSR；
- ShadowRoot 在客户端 bundle 执行后创建，可能晚于首次绘制；
- `attachInternals()` 包装只安装在由兼容层转换的 host 实例上，不修改 `HTMLElement.prototype`；
- 兼容代码随外部 module bundle 加载，不需要 per-widget inline script，避免额外 CSP nonce/hash；
- 原生支持仍是获得无闪烁首屏和完整 SSR 语义的推荐基线。

应用若要求旧浏览器也具备解析阶段的 ShadowRoot，仍需在 document `<head>` 提供更早执行、符合自身 CSP 的全局垫片，或针对该浏览器选择 light SSR。

### 性能与安全

DSD 在解析阶段创建 ShadowRoot，首屏不等待 Widget JavaScript。内部 Element 使各框架复用现有 renderer，原生 slot 也避免跨框架 children 协调。

成本包括每个 Widget 增加一个 mount Element、ShadowRoot 内样式节点和可能重复的内联 CSS。评估指标应至少覆盖 FCP、hydration duration、压缩后 HTML 体积、多实例 CSS 增量和 detached root 数量。

ShadowRoot 不是安全边界。SSR HTML 仍必须经过框架转义；`style.content` 只能来自可信构建产物；敏感数据不能依赖 open ShadowRoot 隐藏。

### 测试策略

单元测试负责 serializer、边界恢复、样式顺序、pending 所有权和 DSD 兼容层。`tests/integration` 负责真实浏览器契约，并同时运行开发服务器与生产构建：

- 原始 HTTP HTML 包含 DSD、内部 mount root 和 shadow-local CSS；
- 浏览器解析后 template 被消费为 open ShadowRoot；
- React、Vue 和 Preact 保留测试前记录的 SSR 节点 identity，Svelte 验证框架 hydration，Solid 验证其显式 client-mount 降级不会产生重复子树；
- 每个框架完成交互、显式 `update()`、`unmount()` 和 `unload()`；
- document CSS 不穿透 ShadowRoot，shadow-local CSS 不泄漏到 document；
- hydration 不改变容器级覆盖样式的级联顺序；
- 开发服务器输出包含 Vite 转换后的 Widget CSS，且计算样式而非仅 SSR 标记生效；
- 修改 CSS Modules 后，刷新得到的类名与 ShadowRoot 选择器同步更新；
- route/Widget/CSS 路径别名在开发和生产使用相同所有权规则；
- Vue scoped virtual CSS 与 CSS Modules 同时进入对应 ShadowRoot；
- route CSS 只作用于 document，Widget CSS 只作用于 ShadowRoot；
- CSS Module full reload 与 SFC scoped CSS HMR 后，新的 SSR 请求也必须返回最新样式；
- load、bootstrap、mount 水合错误不销毁已经建立的 ShadowRoot 与内部 mount root；
- pending、自定义 slot 和 lifecycle state 不进入框架 mount root；
- 浏览器控制台、资源加载和 hydration error channel 保持无意外错误。

## 参考

- [WHATWG HTML：The template element / `shadowrootmode`](https://html.spec.whatwg.org/multipage/scripting.html#attr-template-shadowrootmode)
- [WHATWG DOM：Shadow trees](https://dom.spec.whatwg.org/#shadow-trees)
- [MDN：`<template>` / `shadowrootmode`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template#shadowrootmode)
- [MDN Browser Compat Data：template](https://github.com/mdn/browser-compat-data/blob/main/html/elements/template.json)
- [MDN：Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- [MDN：Using templates and slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots)
- [React：`hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Vue：Application API / `app.mount()`](https://vuejs.org/api/application.html#app-mount)
- [框架组件构建转换协议](./build-transformation-protocol.zh.md)
- [CSS 合并与内联](./css-merging-and-inlining.zh.md)
- [HTML 模板 Widget 孤岛设计](./html-widget-island.zh.md)
