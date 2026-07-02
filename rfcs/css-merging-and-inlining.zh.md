# RFC: CSS 合并与内联策略

状态：草案

## 动机

在 SSR 渲染路由时，框架会为每个 CSS 文件生成单独的 `<link rel="stylesheet">` 标签。在大型项目中，一个路由可能依赖数十个 CSS 模块（CSS Modules、全局样式、组件样式等），导致 HTML `<head>` 中出现大量 `<link>` 标签。

这带来两个问题：

- **HTTP 请求数过多**：每个 `<link>` 标签触发一次独立的 HTTP 请求，增加网络开销和连接竞争。
- **渲染阻塞**：浏览器在加载并解析所有样式表前会阻塞渲染，大量 `<link>` 标签延长了首屏渲染时间（FCP/LCP）。

## 提议

对每个构建入口（route module 和 widget module），计算其全部 CSS 的总大小，按阈值做二选一决策：总大小不超过阈值的内联为单个 `<style>` 标签（消除 HTTP 往返），超过阈值的合并为一个外部 CSS 文件（减少到单个 `<link>`）。每个入口只产生一个 `<style>` 或一个 `<link>`，不混合——因为 Meta 数据结构中 `link` 与 `style` 是独立的数组字段，无法混排，按入口整体决策可以从源头保证 CSS 级联顺序不乱。所有处理在构建时完成，运行时仅做字符串查找和拼接。

合并按入口独立进行。route module 的 CSS 在 route module 入口合并，widget module 的 CSS 在 widget module 入口合并。由于 widget module 是独立构建入口且可跨路由复用，其 CSS 只合并一次，不同路由共享同一份——天然解决了跨路由 CSS 冗余问题，无需分析模块依赖图。

目标：

- **减少渲染阻塞请求**：通过内联小 CSS 文件，消除不必要的 HTTP 往返。
- **减少 `<link>` 数量**：将未内联的 CSS 按入口合并为单个文件，将每个入口的 `<link>` 数量降至最低。
- **保留缓存能力**：合并后的 CSS 仍为外部资源，享受浏览器和 CDN 缓存。
- **保持 CSS HMR**：开发模式下不改变 CSS 加载方式，保证热更新的简单可靠。
- **可配置**：提供清晰的配置项，允许项目按需调整策略。

非目标：

- 不改变 CSS code splitting 的拆分粒度（由 Vite 原生能力决定）。
- 不处理 CSS 的 `@import` 合并（由打包器负责）。
- 不在开发模式启用内联。

## 详细设计

### 合并算法

构建后处理阶段（client manifest 可用后），在现有的 link 预计算管线中扩展 CSS 处理。对 `linkMap` 中的每个入口（route module 和 widget module）：

1. 读取该入口 link 列表中所有 CSS 文件的内容，按 link 顺序拼接，计算总字节数。
2. **二选一决策**：总大小不超过 `inlineThreshold` → 经 `url()` rebase 后存入 `styleMap[入口 id]`（该入口 CSS 全部内联）；超过阈值 → 拼接为一个 CSS 文件，经 `url()` rebase 后 emit 为新资产（如 `assets/css-[hash].css`），将该入口的多个 CSS link 替换为指向合并文件的单个 link。

`url()` rebase 是必要配套：内联和合并后的 CSS 都脱离了原始文件路径，其中的相对引用（如 `url(./bg.png)`）需要 rebase 为绝对路径。使用 `lightningcss` 在构建时完成。

决策以入口为单位而非单个文件——这样每个入口只产生一个 `<style>` 或一个 `<link>`，不会出现同一入口的 CSS 同时散布在 `<style>` 和 `<link>` 中的情况，从根本上避免了 meta 数据结构中 `link`/`style` 无法混排导致的 CSS 级联顺序错乱问题。

合并不需要分析模块依赖图或导入顺序——`linkMap` 已经由 Vite manifest 按正确的导入顺序生成，直接按序拼接即可。这比 Next.js 的 `CssChunkingPlugin`（需分析依赖图、处理 chunk 间共享模块、支持 `loose`/`strict`/`graph` 三种模式）简单得多。

由于 widget module 是独立构建入口，拥有自己的 `linkMap` 条目（`linkMap[widgetId]`），上述算法对 widget module 同样适用。这意味着 widget module 的 CSS 在自己的入口独立合并，不混入 route module 的合并文件；同一个 widget module 被多个路由引用时共享同一份合并结果——天然实现跨路由 CSS 共享，无需额外的共享样式提取算法。为此，route module 的 `getRouteMetaLinks` 收集时不再纳入 widget module 的 CSS（由 widget module 自己负责输出），避免 `linkMap` 中存在两份。

### 数据结构

```typescript
interface ServerAssetsData {
  /** 资产 URL 映射（已有） */
  assetUrls: Record<string, string>;
  /** route module / widget module → link 描述符列表（已有，CSS link 已在构建时合并为单个） */
  linkMap: Record<string, LinkDescriptor[]>;
  /** route module / widget module → 内联 CSS 内容（新增，与 linkMap 对称） */
  styleMap?: Record<string, string>;
}
```

`linkMap` 与 `styleMap` 互斥：每个入口的 CSS 在构建时整体决策，要么进入 `styleMap`（内联），要么其合并后的 link 出现在 `linkMap` 中（外部文件），不存在同一入口同时出现在两者的情况。非 CSS link（modulepreload、preload 等）不受影响，始终保留在 `linkMap` 中。

**CSS 顺序保证**：由于每个入口只产生一个 `<style>` 或一个 `<link>`，不存在同一入口的 CSS 同时散布在两个无法混排的 meta 数组中的情况，入口内部的 CSS 级联顺序始终正确。入口之间的顺序（route module vs widget module）由 meta.link / meta.style 数组的元素顺序保证。`inlineStrategy: 'never'` 时所有入口都走 `linkMap` 合并路径；`inlineStrategy: 'always'` 时所有入口都走 `styleMap` 内联路径。

> **为什么构建时收集而非运行时读取？** 本框架的构建管线已经在 client manifest 可用后执行 link 预计算，CSS 内容收集可以复用同一时机。运行时文件 I/O 在高并发下会成为瓶颈，且 `url()` rebase 需要解析 CSS，运行时做会增加每请求延迟。构建时预收集将所有重活提前，运行时只需字符串查找。这一模式已被 TanStack Router 验证。

### 运行时输出

运行时利用框架已有的 meta 系统（`meta.link` + `meta.style`）输出 CSS：

1. 调用已有的 `resolveLinks(routeId)` 和各 widget module 的 `resolveLinks(widgetId)`，汇总所有 `LinkDescriptor[]`（CSS 已在构建时按入口合并为单个 link）。
2. 对每个入口，查 `styleMap[id]`：有值则作为 `StyleDescriptor` 加入 `meta.style`（该入口的 CSS 全部内联）；无值则该入口的 CSS link 保留在 `meta.link` 中（构建时已合并）。
3. 框架已有的 HTML 渲染逻辑将 `meta.link` 渲染为 `<link>`，`meta.style` 渲染为 `<style>`。

由于 `linkMap` 和 `styleMap` 以入口 id 为 key 互斥，route module 和 widget module 各自查自己的条目即可，无需 href 去重。这一设计参考自 TanStack Router 的 `stripInlinedStylesheetAssetsFromRoute`。

### 开发模式

开发模式不启用内联，保持现有的 CSS 收集方式不变，继续使用 `<link>` 标签，保证 CSS HMR 的简单可靠。

## 配置设计

配置作为 `webRouterPlugin` 选项的一部分，与 `filesystemRouting`、`serverAction` 等同级，遵循框架现有的 zod schema 模式：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    webRouterPlugin({
      filesystemRouting: { enabled: true },
      css: {
        inlineStrategy: 'auto', // 默认
        inlineThreshold: 8192, // 默认 8KB
      },
    }),
  ],
});
```

Schema 定义：

```typescript
const CssSchema = z
  .object({
    inlineStrategy: z
      .enum(['auto', 'always', 'never'])
      .optional()
      .default('auto'),
    inlineThreshold: z.number().int().min(0).optional().default(8192),
  })
  .optional()
  .default({});
```

- `'auto'`（默认）：入口 CSS 总量不超过 `inlineThreshold` 时内联为单个 `<style>`，超过时合并为单个 `<link>`。
- `'always'`：所有入口的 CSS 内联为 `<style>`（无论大小），不产生合并文件。
- `'never'`：不内联，所有入口的 CSS 合并为单个 `<link>`。

三选一策略（参考 Astro）比 `boolean` + `inlineThreshold` 更清晰，消除 `inline: false` 与 `inlineThreshold: 0` 的语义重叠。阈值默认 8KB（高于 Astro 的 4KB），因为本框架按 route module 拆分 CSS，单个 route module 的 CSS 总量通常更大。

## 边界情况

### 单个 CSS 文件

如果一个入口（route module 或 widget module）只有一个 CSS 文件，合并不会产生额外收益（单个文件本身就是单个 link）。合并逻辑会跳过这种情况，避免不必要的文件复制。

### 全局 CSS 与 CSS Modules

两者处理方式一致。CSS Modules 的作用域哈希在构建时已生成，内联和合并不影响其作用域隔离。

### 条件渲染组件的 CSS

路由匹配阶段收集的 CSS 已包含条件渲染组件的样式（基于模块依赖图，而非实际渲染结果）。内联不会遗漏这些样式。

### 空文件

大小为 0 的 CSS 文件直接跳过，不生成 `<style>` 也不生成 `<link>`。

### 构建顺序兼容性

本框架采用 server 先 → client 后的构建顺序。CSS 内容收集和合并在 client 构建完成后的后处理阶段执行（与现有 link 预计算同步），此时 client 输出目录中的 CSS 文件已就绪。单独执行 server 构建时（无 client 构建），`styleMap` 为空且不产生合并文件，所有 CSS 保留为原始 `<link>`，功能不受影响。

## 对其他功能的影响

- **CSS HMR**：内联仅影响生产模式，开发模式保持现有 CSS 收集方式不变。
- **浏览器缓存**：内联的小文件不可被浏览器单独缓存，但小文件缓存价值有限，且会被 brotli/gzip 压缩传输。合并后的 CSS 仍为外部文件，可被浏览器和 CDN 缓存。route module 的 CSS 按 route module 缓存，widget module 的 CSS 按 widget module 缓存——widget module 的 CSS 变化只影响该 widget module 的合并文件，不影响引用它的 route module。
- **SSR 性能**：CSS 内容在构建时预收集嵌入数据文件，运行时仅做字符串查找和拼接，无文件 I/O 开销。
- **HTML 体积**：内联会增加 HTML 体积，但通过阈值控制（默认 8KB），增量可控。brotli 压缩后实际增量更小。
- **数据文件体积**：`styleMap` 会增大服务端资产数据文件（`.server-assets.js`），但该文件仅在服务端加载，不影响客户端 bundle。合并文件作为独立 CSS 文件存放在 client 输出目录，不增加数据文件体积。

## 替代方案

### 禁用 CSS Code Splitting

将所有 CSS 合并为单个文件（`cssCodeSplit = false`，Qwik 的做法）。实现最简单（一行配置），但首次加载包含大量当前路由不需要的样式，任何 CSS 变化导致整个文件缓存失效。

### Next.js 式 CSS Chunk 合并

本 RFC 的合并方案是 Next.js `CssChunkingPlugin` 的简化版。Next.js 需要分析模块依赖图、保证导入顺序不被违反、处理 chunk 间共享模块，支持 `loose`/`strict`/`graph` 三种模式。本 RFC 利用 widget module 作为独立构建入口的特性，天然实现跨路由 CSS 共享，无需图分析。代价是 route module 自身的 CSS 仍按 route module 合并，不同 route module 的 CSS 各自独立（不共享）。

## 参考

### 业界策略概览

| 框架            | 核心策略                 | 关键原理                                      |
| --------------- | ------------------------ | --------------------------------------------- |
| Next.js         | CSS Chunk 合并           | 构建时将小 chunk 合并为大 chunk，保护导入顺序 |
| SvelteKit       | CSS 内联                 | 小于阈值的 CSS 内联到 `<style>`，合并为一个块 |
| Nuxt            | CSS 内联                 | 组件级样式内联，构建时移除已内联的 link       |
| Astro           | CSS 传播/去重 + 阈值内联 | 小 CSS 内联，大 CSS 保留 link；`'auto'` 模式  |
| Qwik            | 禁用 code split + 内联   | 全局 CSS 合并为单文件，组件 CSS SSR 内联      |
| React Router 7  | 路由级收集 + 可选合并    | 支持 `cssCodeSplit: false` 全局合并           |
| SolidStart      | 开发时内联，生产时 link  | 模块图遍历收集 CSS，引用计数去重              |
| TanStack Router | 构建时内联               | CSS 内容嵌入 manifest，运行时路由匹配内联     |

灵感来源：

| 设计决策                          | 主要参考框架      | 借鉴点                                     |
| --------------------------------- | ----------------- | ------------------------------------------ |
| 构建时收集 CSS 内容               | TanStack Router   | CSS 内容嵌入数据文件，避免运行时 I/O       |
| 扁平 href→content 查找表          | TanStack Router   | `manifest.inlineCss.styles`，非 per-route  |
| 大小阈值自动分流                  | Astro             | `'auto'` 模式 + `inlineStylesheets`        |
| 按入口合并剩余 CSS 为单个 link    | Next.js（简化版） | 无需图分析，直接按 linkMap 顺序拼接        |
| widget CSS 独立处理实现跨路由共享 | -                 | 利用 widget 独立构建入口，无需共享样式提取 |
| 合并为单个 `<style>`              | SvelteKit         | `Array.join('\n')` 合并内联样式            |
| 从 link 列表移除已内联 CSS        | TanStack Router   | `stripInlinedStylesheetAssetsFromRoute`    |
| `url()` rebase                    | TanStack Router   | `lightningcss` 处理相对路径                |
| 三选一策略配置                    | Astro             | `'always'` `'auto'` `'never'`              |

### 参考资料

- [CSS 合并/内联策略调研文档](./references/css-merging-research.zh.md)
- [TanStack Router - manifestBuilder.ts](https://github.com/TanStack/router/blob/main/packages/start-plugin-core/src/start-manifest-plugin/manifestBuilder.ts)
- [TanStack Router - ssr-server.ts](https://github.com/TanStack/router/blob/main/packages/router-core/src/ssr/ssr-server.ts)
- [TanStack Router - inlineCss.ts](https://github.com/TanStack/router/blob/main/packages/start-server-core/src/inlineCss.ts)
- [SvelteKit - render.js](https://github.com/sveltejs/kit/blob/main/packages/kit/src/runtime/server/page/render.js)
- [Astro - plugin-css.ts](https://github.com/withastro/astro/blob/main/packages/astro/src/core/build/plugins/plugin-css.ts)
- [Qwik - vite.ts](https://github.com/QwikDev/qwik/blob/main/packages/qwik/src/optimizer/src/plugins/vite.ts)
- [Next.js - css-chunking-plugin.ts](https://github.com/vercel/next.js/blob/canary/packages/next/src/build/webpack/plugins/css-chunking-plugin.ts)
