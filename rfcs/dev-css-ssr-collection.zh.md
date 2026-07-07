# RFC：Dev 模式 SSR CSS 收集

状态：已实现

## 摘要

在 dev 模式下，利用 Vite 8 Environment API 的双环境特性，**用 SSR environment 遍历模块图发现 CSS 依赖，用 Client environment 获取 CSS 文本**，将收集到的 CSS 内联为 `<style data-vite-dev-id>` 标签注入 SSR HTML，同时为每个 CSS 模块输出 `<script type="module">` 标签以接入 Vite 的 CSS HMR 链路。由此解决 SSR 渲染需要 CSS 而 Vite SSR environment 丢弃 CSS 的结构性矛盾。

## 动机

元框架在 dev 模式下面临一个结构性矛盾：

```
SSR 渲染需要 CSS 文本 → 用于内联 <style> 避免 FOUC
Vite SSR environment 丢弃 CSS → vite:css-post 在 consumer=server 时返回 export {}
```

即：**SSR 渲染链路无法直接获得 CSS 内容**。这不是 bug，而是 Vite 的设计——SSR 环境只关心 JS 模块图，CSS 属于浏览器端关注点。元框架必须在此基础上自行设计 CSS 收集与注入机制，同时不能破坏 Vite 原生的 CSS HMR。

## 目标

- **首屏无 FOUC**：SSR HTML 内联所收集到的 CSS。
- **保留原生 CSS HMR**：不绕开 Vite client 的 `sheetsMap` / `updateStyle` 机制。
- **完整覆盖依赖**：静态导入、动态导入的 widget 模块 CSS 都被收集。
- **框架无关**：不对 Vue / React / Svelte 等框架插件做特殊假设。

## 非目标

- 不改变生产构建的 CSS 处理（由 [CSS 合并与内联策略](./css-merging-and-inlining.zh.md) RFC 负责）。
- 不实现自定义 HMR 协议，完全复用 Vite 原生 HMR。

## 详细设计

### 双环境协作

核心决策：**用 SSR environment 遍历模块图找依赖，用 Client environment 获取 CSS 内容。**

```
crawlGraph(serverEnv, entryFile)     → 从 SSR 模块图遍历，找到所有 CSS 依赖
  ↓
clientEnv.transformRequest(cssUrl)   → 用 Client env 获取 CSS 文本
  ↓
extractViteCss(result.code)          → 从 __vite__css = "..." 中提取
  ↓
输出 <style data-vite-dev-id> + <script type="module" src>
```

边界划分的依据：

- **模块图遍历用 SSR env**：SSR 渲染时 `importModule(serverEntry)` 会完整执行模块加载链，SSR 模块图最完整。
- **CSS 文本获取用 Client env**：框架插件（Vue、React）在两个 environment 中都正常执行，但 `vite:css-post` 的行为是 environment-specific 的——只有 Client env 保留 CSS 为 `__vite__css` 变量，SSR env 将其转为 `export {}`。

### HTML 输出设计

#### 双标签模式

每个 CSS 模块输出两个 HTML 标签：

```html
<!-- 1. 首屏 CSS：避免 FOUC -->
<style
  data-vite-dev-id="/abs/path/Counter.vue?vue&type=style&index=0&scoped=xxx&lang.css">
  .counter[data-v-xxx] { ... }
</style>

<!-- 2. 模块加载：注册 HMR 回调 -->
<script
  type="module"
  src="/path/Counter.vue?vue&type=style&index=0&scoped=xxx&lang.css"></script>
```

#### 设计约束

| 约束                                     | 原因                                                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-vite-dev-id` 必须等于 `__vite__id` | Vite client 的 `sheetsMap` 用此 key 匹配 `<style>` 元素，HMR 时 `updateStyle(id, content)` 据此查找                                           |
| 不能用 `<link rel="stylesheet">`         | Vite client 会将其注册到 `linkSheetsMap`，`updateStyle` 开头 `if (linkSheetsMap.has(id)) return` 短路，HMR 失效                               |
| `<style>` 必须在 `<script>` 之前         | 页面加载时 Vite client 扫描已有 `<style[data-vite-dev-id]>` 注册到 `sheetsMap`，之后 `<script>` 加载模块时 `updateStyle` 才能找到已注册的元素 |
| CSS 内容为空时也要输出空 `<style>`       | 确保 `sheetsMap` 注册，使后续 `updateStyle` 能填充内容                                                                                        |

#### `data-vite-dev-id` 的 HTML 转义

`data-vite-dev-id` 值含 `&`（如 `?vue&type=style&index=0`），在 HTML 属性中会被转义为 `&amp;`。浏览器解析时自动解码为 `&`，与 Vite client 的 `__vite__id`（JS 字符串，不转义）匹配。**不要手动反转义**。

### 查询参数语义

模块 URL 上存在两类查询参数，必须区分处理：

| 类别          | 示例                          | 语义                                        | 处理方式                          |
| ------------- | ----------------------------- | ------------------------------------------- | --------------------------------- |
| 框架变体参数  | `?as=jsx`                     | 同一文件的不同 transform 变体（不同依赖链） | **保留**，用于 `transformRequest` |
| Vite 内部参数 | `?import`、`?t=xxx`、`?v=xxx` | Vite 模块图内部标记                         | **剥离**，用于模块图缓存键匹配    |

设计规则：

```
transformRequest(url)        → 用完整 URL（mod.url 或 r.id）
模块图缓存键匹配             → 用 normalizeFilterId(url)（剥离内部参数）
CSS 模块的 transformRequest  → 用 normalizeFilterId(url)（剥离 ?import）
```

**陷阱**：`normalizeFilterId` 会剥离 `?as=jsx` 等框架变体参数。如果在 `transformRequest` 中使用，会转换错误的基础模块，导致目标模块的 `transformResult` 始终为 `null`、`importedModules` 为空、`crawlGraph` 无法遍历到 CSS 依赖。

**原则**：`normalizeFilterId` 仅用于**模块图缓存键匹配**，不用于 `transformRequest`。

### 模块图遍历设计

#### 为什么需要自定义 crawlGraph

Vite 的 `serverEnvironment.moduleGraph` 记录了模块间的导入关系，但：

- 静态导入（`import`）和动态导入（`import()`）的依赖关系存储方式不同。
- 动态导入的模块可能尚未加载（`importedModules` 为空）。
- 需要过滤非 widget 的动态导入（只收集 widget 边界的 CSS）。

#### 遍历策略

```
crawlGraph(serverEnv, entryFile):
  1. 获取入口模块的所有变体（getModulesByFile，因为同一文件可能有 ?as=jsx 等变体）
  2. 对每个模块：
     a. ensureServerTransformResult — 确保 transformResult 存在（触发依赖注册）
     b. 从 transformResult.deps 解析静态依赖 → importDepKeys
     c. 从 transformResult.dynamicDeps 解析动态依赖 → 过滤出 widget 模块 → matchedDynamicImportKeys
     d. 遍历 entry.importedModules：
        - 用 classifyImportEdge 判断是静态还是动态导入
        - 过滤掉不属于 depKeys 的边（避免收集到无关模块）
     e. 对 widget 动态导入，用 resolveWidgetModulesFromDynamicDeps 显式加载
  3. 递归遍历子模块
```

#### 关键设计点

- **`ensureServerTransformResult`**：模块可能被 import 但 transformResult 未生成（lazy transform）。必须显式调用 `transformRequest(mod.url)` 触发 transform，否则 `importedModules` 和 `transformResult.deps` 为空。
- **动态导入的显式加载**：`importedModules` 只包含已执行的导入。动态导入的模块可能未执行，需要通过 `transformResult.dynamicDeps` 显式 resolve + transform。
- **widget 过滤**：动态导入可能包含非 widget 模块（如路由组件），只收集 widget 边界的 CSS。

### HMR 链路设计

#### HMR 的前置条件

CSS HMR 不是独立功能，它依赖完整的模块加载链：

```
HTML 输出 <script type="module" src="widget.css">
  → 浏览器加载 CSS 模块
    → 执行 createHotContext(url) 注册 HMR 回调
      → 执行 updateStyle(id, css) 更新 <style>
        → 执行 import.meta.hot.accept() 标记 self-accepting
```

如果 `<script>` 标签不存在，HMR 链路从源头断裂，Vite client 中没有注册回调，HMR 更新被丢弃。

#### HMR 更新流程

```
CSS 文件变更
  → Vite watcher 检测
    → server 端 hotUpdate（per-environment）
      → server-full-reload-plugin: applyToServerEnvironment 过滤，只在 ssr env 调用
        → invalidateServerDevModules（使 SSR 模块缓存失效）
        → 返回 []（ssr env 无 HMR 更新）
      → client env 的 hotUpdate 正常执行
        → 发送 { type: 'update', updates: [{ type: 'js-update', path: cssUrl }] }
          → 浏览器接收，重新加载 CSS 模块
            → 执行 updateStyle(id, newCss) 更新 <style> 的 textContent
```

#### `server-full-reload-plugin` 的设计

```ts
{
  name: '@web-widget:server-full-reload',
  applyToEnvironment: applyToServerEnvironment(), // 只在 ssr env
  hotUpdate({ server, modules }) {
    invalidateServerDevModules(...); // 使 SSR 模块缓存失效
    return []; // 返回空数组 = ssr env 无 HMR 更新
  },
}
```

**为什么返回 `[]`**：SSR 模块不参与浏览器 HMR。返回空数组表示该环境无更新，避免 Vite 触发不必要的 HMR 传播。Client env 的 `hotUpdate` 不受此插件影响（`applyToEnvironment` 过滤），正常发送 HMR update。

## 边界情况

### 构建产物缓存

Playground 通过 `workspace:*` 引用 `@web-widget/vite-plugin` 的 `dist/`，不是 `src/`。修改 vite-plugin 源码后必须执行 `pnpm --filter @web-widget/vite-plugin build`，否则 playground 使用旧 dist，导致调试的是旧代码。

### scoped CSS 的元素选取

多个 widget 可能有相同的 class 名（如 `.counter`），但 scoped CSS 只匹配带 `data-v-*` 属性的元素。端到端验证时必须用 `querySelector('.counter[data-v-xxx]')` 精确选取，否则会选到其他 widget 的元素导致误判。

## 替代方案

以下方案均无法同时满足"CSS 文本可用"与"框架插件正确处理"两个要求：

| 方案                                | 失败原因                                               |
| ----------------------------------- | ------------------------------------------------------ |
| SSR env + `order: 'pre'` transform  | CSS 未经过框架插件处理，缺 scoped 属性 / modules hash  |
| SSR env + `order: 'post'` transform | `vite:css-post` 已将 CSS 转为 `export {}`              |
| SSR env + `?inline` 查询            | 改变模块 id，CSS Modules hash 不匹配                   |
| Client env 遍历模块图               | Client 模块图在 SSR 渲染时可能不完整（动态导入未执行） |

根本原因：框架插件（Vue、React）在两个 environment 中都正常执行，但 `vite:css-post` 的行为是 environment-specific 的。只有 Client env 保留 CSS 文本，只有 SSR env 在渲染时拥有完整的模块图，二者必须协作。

## 验证方法论

### 分层验证

| 层次         | 方法                           | 验证什么                 |
| ------------ | ------------------------------ | ------------------------ |
| Server 端    | `hotUpdate` hook 日志          | HMR 消息是否发送         |
| HTML 输出    | `curl` + 正则提取              | 模块加载链路是否完整     |
| CSS 模块内容 | `curl` CSS 模块 URL            | HMR 回调注册代码是否正确 |
| 插件层       | monkey-patch `clientHot.send`  | 消息类型是否正确         |
| 浏览器端     | Puppeteer + `getComputedStyle` | CSS 是否真的更新         |

### 浏览器端验证的必要性

Server 端正常 ≠ 浏览器端正常。必须用真实浏览器（Puppeteer headless Chrome）验证：

- `[vite] hot updated` 日志出现 = HMR 消息已接收
- `<style>` 的 `textContent` 更新 = `updateStyle` 已执行
- `getComputedStyle` 返回新值 = CSS 已应用

## 参考

### 关键 Vite 源码位置

基于 `vite@8.0.12`：

| 功能                       | 文件位置                   | 行号   |
| -------------------------- | -------------------------- | ------ |
| `vite:css` 插件            | `dist/node/chunks/node.js` | ~20421 |
| `vite:css-post` 插件       | `dist/node/chunks/node.js` | ~20514 |
| `vite:css-analysis` 插件   | `dist/node/chunks/node.js` | ~20790 |
| `transformRequest` 函数    | `dist/node/chunks/node.js` | ~24390 |
| `doTransform` 函数         | `dist/node/chunks/node.js` | ~24417 |
| `getCachedTransformResult` | `dist/node/chunks/node.js` | ~24436 |
| `updateModules`（HMR）     | `dist/node/chunks/node.js` | ~26750 |
| `propagateUpdate`（HMR）   | `dist/node/chunks/node.js` | ~26813 |
| Client `updateStyle`       | `dist/client/client.mjs`   | ~1164  |
| Client `sheetsMap` 初始化  | `dist/client/client.mjs`   | ~1153  |

### 相关 RFC

- [CSS 合并与内联策略](./css-merging-and-inlining.zh.md)（生产构建的 CSS 处理）
- [Widget Module 双环境反转构建](./widget-module-build.zh.md)
