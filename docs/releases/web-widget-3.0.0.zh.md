# Web Widget 3.0.0 发布说明

Web Widget 3.0.0 对齐 Vite 8，在不改动用户 `vite.config.ts` 的前提下升级了构建与开发体验：一次 `vite build` 同时产出 server 与 client、dev 下服务端改动自动刷新浏览器、CSS 合并以提升首屏渲染（FCP）、构建产物命名更可读。同时引入 `WebWidgetAdapter` 协议将框架适配标准化，新框架接入无需编写专属构建插件。底层基于 Vite 8 Environment API 双环境模型、统一 Builder 编排与 ModuleRunner HMR 重写。同时改进了缓存中间件的错误处理与 HTTP/2 HEAD 请求的兼容性。

## 变更概览

> 面向使用者的变更摘要。完整的实现细节、术语与背景见本文档后半部分。

### 新特性

- **Widget 孤岛错误恢复与容器 API 重设计**：widget 容器内部集成 `ErrorBoundary` 与 `Suspense`，widget 渲染失败时错误被限制在单个孤岛内，不再导致整页空白。容器配置（`fallback`、`loading`、`serverOnly`、`clientOnly`）统一收进 `widget` prop，与 widget 自身 props 命名空间隔离。所有框架适配器采用统一的 `fallback` 设计（`{ pending?, error? }`），`error` 省略时回退到 `pending`（详见第 10 节）。
- **统一的 `container()` 导入 API**：移除 `asReactWidget` / `asHtmlWidget` 类型适配函数，所有跨框架 widget 导入统一使用 `container()`。构建工具自动转换静态导入（`import Foo from './Foo@widget.vue'`）和显式 `container(() => import(...))` 调用，注入 `import` 与 `name` 选项。同框架导入（如 React→React）享有完整的 props 类型推导，跨框架导入（如 Vue→React）通过 Vue `$props` 提取也实现了自动类型推导（详见第 15 节）。
- **CSS 合并与内联**：新增 `css.inlineStrategy` / `css.inlineThreshold` 配置，将单个 entry 引用的多个 CSS 合并为单个 `<style>` 或外部 CSS，减少请求数、消除级联顺序问题，提升首屏渲染（FCP）（详见第 8 节）。
- **约定文件自动创建**：新项目无需预先准备 `importmap.client.json`、`routemap.server.json` 或空的 `routes/` 目录，插件会在首次运行时自动补齐（详见第 6 节）。
- **Dev 路由懒加载**：entry 冷启动不再 eager 加载全部路由，仅路由匹配时加载对应模块，复杂项目冷启动与首请求延迟显著降低（详见第 4 节）。
- **Dev 服务端改动自动刷新浏览器**：修改 server 代码后浏览器自动刷新以展示新的 SSR HTML（详见第 4 节）。
- **Chrome DevTools 自动工作区**：dev server 自动响应 Chrome DevTools 的 `/.well-known/appspecific/com.chrome.devtools.json` 请求，DevTools 无需手动添加文件夹即可将网络资源映射到本地源文件，支持在 Elements 面板直接编辑并保存源码。
- **构建产物命名可读化**：`assets/` 下 chunk 名折叠 `index` 段、按模块路径命名，产物与源文件一一对应，便于排查与定位（详见第 1 节）。
- **WebWidgetAdapter 协议**：新增框架无关的适配器协议，构建工具通过适配器包的 `webWidgetAdapter` 字段自动发现框架的文件匹配规则与运行时实现，无需为每个框架编写专属构建插件（详见第 9 节）。
- **HTML 模板 Widget 孤岛**：`@web-widget/html` 支持 `.html.ts` 扩展名，自动注入 `render` 与 `container`，可在纯 HTML 模板中嵌入 React、Vue 等框架 widget 作为交互孤岛（详见第 11 节）。
- **HTML 模板 Suspense 流式渲染**：`@web-widget/html` 新增 `suspense()` 函数，支持渐进式渲染——异步内容 resolve 后在流中原位置替换 fallback，不阻塞后续内容（详见第 12 节）。
- **HTML 模板 lit-html 兼容 directives**：`@web-widget/html` 新增 `classMap`、`styleMap`、`ifDefined`、`when`、`join` 五个模板指令函数，API 签名与 lit-html 一致，降低从 lit-html 迁移成本（详见第 13 节）。
- **HTML 模板压缩 Vite 插件**：`@web-widget/html` 新增 `htmlCompress` Vite 插件，在构建时压缩 `html` 标签模板字面量中的冗余空白，无需引入第三方 HTML 压缩库（详见第 14 节）。

### 改进与修复

- **双环境构建一次编排**：改用 Vite 8 `builder.buildApp` 编排 server + client，移除在 client 构建的 `writeBundle` 里二次触发 `build` 的 hack（详见第 1、2 节）。
- **Dev 性能**：降低冷启动与首请求延迟，路由模块按需加载、请求间复用渲染器缓存（详见第 4 节）。
- **Dev origin 解析修复**：修正误用 `config.preview.*`、过早读取 `resolvedUrls` 的问题，解析顺序改为 `server.origin` → `resolvedUrls` → `config.server`（详见第 5 节）。
- **Dev 容错**：dev server 不再因单次请求或后台任务失败而退出，仅打日志并保持服务可用（详见第 5 节）。
- **文件系统路由**：内存 routemap + 异步写盘，仅结构变更或文件增删才触发 full-reload，单文件内容变更保留 client 状态（详见第 4 节）。
- **Webworker SSR resolve conditions**：基于 Vite `defaultClientConditions` 重建，dev 模式可命中 `"development"` 子条件，支持源码 HMR 与断点（详见第 7 节）。
- **缓存中间件错误处理**：缓存未命中时的服务端错误现在传播到路由错误处理器，后台重新验证期间的错误返回 5xx 而非被静默吞掉。
- **流式渲染与缓存协调**：`progressive` 渲染的响应会自动声明 `Cache-Control: no-store, no-transform`，`cache` 中间件据此跳过缓存（`BYPASS`），`etag` 中间件跳过 ETag 计算，避免缓冲整段响应而抵消流式效果。
- **流式 SSR shell 错误感知**：流式渲染（`progressive` 模式）下，所有框架（React、Vue、HTML）的 shell 级错误现在能被正确捕获并触发框架级 500 错误页，而非静默返回 200 导致客户端收到残缺页面。Shell 指所有不在 `Suspense` 边界内的内容——这些错误不可恢复，应返回 500；而 `Suspense` 内的错误仍通过 `fallback` 恢复（详见第 10 节）。
- **HTTP/2 HEAD 请求修复**：正确检测 `Http2ServerResponse` 并跳过 `statusMessage` 写入；dev 中间件不再对 HEAD 请求执行 `transformIndexHtml`；避免响应已发送后重复调用 `next()`。
- **HTML 模板与流转换内联实现**：`@web-widget/html` 不再依赖 `@worker-tools/html` 与 `whatwg-stream-to-async-iter`，`html` / `unsafeHTML` / `fallback` 等模板 API 及 `ReadableStream` ↔ async iterable 转换改为自包含实现，修复了提前终止时 reader 锁泄漏、TransformStream 回退路径无背压、流取消时误用 `throw()` 而非 `return()` 等资源管理缺陷。
- **Import maps polyfill 升级**：`importShim.url` 默认值升级至 `es-module-shims@2.8.2`（原 `1.10.0`），为不支持原生 import maps 的浏览器提供最新 polyfill。
- **Node 适配器流处理与资源管理**：`@web-widget/node` 响应流写入现处理背压（`write() === false` 时等待 `drain`），客户端断开时取消源流避免连接/句柄泄漏；未消费的请求体在响应结束后自动取消；本地实现请求体流转换替换上游低效的逐字节数组展开拷贝；统一两条处理路径的错误处理逻辑。
- **框架适配器 Tree-shaking**：`@web-widget/react`、`@web-widget/vue`、`@web-widget/vue2` 均声明 `"sideEffects": false`，帮助打包工具正确进行 Tree-shaking。`@web-widget/vue2` 将原先模块加载时即执行的全局 `Vue.config` 修改改为首次创建 widget 容器时懒初始化，消除模块副作用。
- **Vue2 组件名清理一致性修复**：客户端与服务端的 `sanitizeComponentName` 统一使用 `-` 分隔符（原客户端误用 `.`）。

### 破坏性变更

- 移除 `autoFullBuild` 配置项；`vite build` 始终执行 server + client 双构建。若曾设置 `autoFullBuild: false` 仅打 client，请改为只运行 client 相关脚本或调整构建流程。
- client manifest：route 不再标记为 `isEntry`，widget 与 CSS 为独立 entry；移除了自定义的 `output.manifest` 配置项（manifest 是 server 资产解析的必需项，无法关闭）。
- 构建产物文件名规则变化：`assets/` 下 chunk 不再大量以 `index` 开头；若外部脚本硬编码了旧 hashed 路径，需改为依赖 manifest 或源路径 key。
- `Manifest.dev` 和 `StartOptions.dev` 移除，改用 `exposeErrors`；`DevRouteModule` / `DevHttpHandler` 类型移除。
- `progressive` 默认值在所有环境下改为 `false`（原生产环境为 `true`）；如需流式渲染，显式设置 `defaultRenderer.progressive`。
- 移除 `?as=jsx` / `?as=tsx` 查询参数支持：Vue widget（如 `Counter@widget.vue`）导入到 React/JSX 文件时不再需要 `?as=jsx` 后缀；`@web-widget/react` 中对应的 `*?as=jsx` / `*?as=tsx` 模块声明同步移除。
- 移除 `asReactWidget` / `asHtmlWidget` 类型适配函数（含 `toReact` deprecated 别名）：跨框架 widget 导入统一使用 `container()` 函数，构建工具自动注入 `import` 与 `name` 选项，无需手动类型适配。`container()` 从各适配器包的 `./adapter` 子路径导入。
- 移除各框架的专属 Vite 插件（`reactWebWidgetPlugin` / `vueWebWidgetPlugin` / `vue2WebWidgetPlugin`）及其 `./vite` 子路径导出：改用 `webWidgetPlugin({ adapters: [...] })` 统一配置，构建工具从适配器包的 `webWidgetAdapter` 字段自动读取框架信息。适配器包不再依赖 `@web-widget/vite-plugin` 和 `vite` 作为 peerDependency。
- 框架适配器包入口分离（`@web-widget/react`、`@web-widget/vue`、`@web-widget/vue2`、`@web-widget/html`）：`.` 入口不再重新导出 `@web-widget/helpers`。用户 API（`defineRouteComponent`、`defineMeta`、`defineRouteHandler` 等）改为从 `@web-widget/helpers` 导入，运行时代码（`render`、`container`、`createVueRender`）从 `./adapter` 子路径导入。`@web-widget/html` 的 `render` 改为从 `./adapter` 子路径导入。
- Widget 容器 API 重设计（`@web-widget/react`、`@web-widget/vue`、`@web-widget/vue2`、`@web-widget/html`）：容器配置不再以扁平 prop 传递，改为统一收进 `widget` prop 对象。`experimental_loading` 重命名为 `loading`；`renderStage` 替换为互斥的 `serverOnly` / `clientOnly` 布尔缩写；`experimental_renderTarget` 从运行时 prop 移除（改在创建容器时配置）。
- `@web-widget/html` 渲染函数重命名：`HTMLToStream` → `renderToStream`，`HTMLToString` → `renderToString`，与 React/Vue 等框架的 SSR 命名一致。`renderToStream` 返回类型由 `ReadableStream` 变为 `Promise<ReadableStream>`（shell 错误现在通过 reject 传播）。

### 迁移指南

- 现有项目的 `vite.config.ts` 中 `webRouterPlugin({ ... })` 配置方式不变；`filesystemRouting`、`ssr.target` 等行为保持不变。
- 框架适配插件迁移到新的 `webWidgetPlugin({ adapters: [...] })` API（详见第 9 节）。迁移示例：

  ```diff
  - import reactWebWidgetPlugin from '@web-widget/react/vite';
  - import vueWebWidgetPlugin from '@web-widget/vue/vite';
  + import { webWidgetPlugin } from '@web-widget/vite-plugin';

    // vite.config.ts plugins:
  - reactWebWidgetPlugin(),
  - vueWebWidgetPlugin(),
  + webWidgetPlugin({
  +   adapters: ['@web-widget/react', '@web-widget/vue'],
  + }),
  ```

- `entry.server.ts` / `entry.client.ts` 结构不变（HMR accept 由插件在 dev 时自动注入）。
- 已提交仓库中的 `importmap.client.json` / `routemap.server.json` 行为不变，仅缺失时触发自动创建。
- 若代码中使用了 `Manifest.dev` 或 `StartOptions.dev`，改为 `exposeErrors`；如需流式渲染，显式设置 `defaultRenderer.progressive: true`（dev 与生产均支持）。
- `?as=jsx` / `?as=tsx` 查询参数与 `asReactWidget` / `asHtmlWidget` 类型适配函数已移除。跨框架 widget 导入统一使用 `container()`，构建工具自动注入 `import` 与 `name` 选项。迁移示例：

  ```diff
  - import VueCounter from './Counter@widget.vue?as=jsx';
  + import { container } from '@web-widget/react/adapter';
  +
  + const VueCounter = container(() => import('./Counter@widget.vue'));
  ```

- 此前从 `@web-widget/react` 或 `@web-widget/html` 导入的用户 API（`defineRouteComponent`、`defineMeta`、`defineRouteHandler` 等）改为从 `@web-widget/helpers` 导入。运行时 API（`render`、`container`）改为从 `@web-widget/react/adapter` 导入。`@web-widget/html` 的 `render` 改为从 `@web-widget/html/adapter` 导入。迁移示例：

  ```diff
  - import { defineRouteComponent, defineMeta } from '@web-widget/react';
  + import { defineRouteComponent, defineMeta } from '@web-widget/helpers';

  - import { render, container } from '@web-widget/react';
  + import { render, container } from '@web-widget/react/adapter';
  ```

- **`@web-widget/html` 的 `.html.ts` 路由迁移**：将 `@route.ts` 文件重命名为 `@route.html.ts`，移除手动 `export { render }`（构建工具自动注入）。`@layout.ts` 不受 adapter 影响，仍需手动从 `@web-widget/html/adapter` 导入并导出 `render`。迁移示例：

  ```diff
  - import { html, render } from '@web-widget/html';
  + import { html } from '@web-widget/html';

  - export { render };
  -
    export default function Page() {
      return html`<h1>Hello</h1>`;
    }
  ```

- **Vitest ≥ 4.0.0**：dev server 改用 Vite 8 Environment API 的 `RunnableDevEnvironment.runner.import()` 加载 server 模块，而 Vitest 4 起才以 Vite 原生 Module Runner 替代 `vite-node`（Vitest 4 同时要求 Vite ≥ 6）。低于 4.0.0 的 Vitest 仍依赖 `vite-node` + 旧版 SSR handler，无法与此模型兼容。插件通过 `mergeRouterVitestConfig` 与 `./vitest-node-environment` / `./vitest-edge-runtime-environment` 子路径导出，按 `ssr.target` 自动注入对应的测试环境。
- Widget 容器 props 迁移到 `widget` 对象（适用于 React、Vue、Vue2）。迁移示例：

  ```diff
  - <Counter fallback={<Spinner />} experimental_loading="lazy" renderStage="server" count={1} />
  + <Counter widget={{ fallback: <Spinner />, loading: 'lazy', serverOnly: true }} count={1} />
  ```

  | 旧 API                      | 新 API                               | 说明                      |
  | --------------------------- | ------------------------------------ | ------------------------- |
  | `fallback={<Spinner />}`    | `widget={{ fallback: <Spinner /> }}` | 收进 `widget` 对象        |
  | `experimental_loading`      | `widget={{ loading }}`               | 移除 `experimental_` 前缀 |
  | `renderStage="server"`      | `widget={{ serverOnly: true }}`      | 互斥布尔缩写              |
  | `renderStage="client"`      | `widget={{ clientOnly: true }}`      | 互斥布尔缩写              |
  | `experimental_renderTarget` | 创建容器时传入 `renderTarget` 选项   | 仅定义时配置              |

- 完整影响与可感知的变化详见第 6 节。

---

以下为实现细节、术语背景与测试说明，供维护者与希望深入了解的实现者参考。

## 术语

| 本文档用语                        | Vite 内部（配置、CLI、API）                                                     |
| --------------------------------- | ------------------------------------------------------------------------------- |
| **client 环境** / **server 环境** | `environments.client` / `environments.ssr`（`consumer: 'client'` / `'server'`） |
| **client 构建** / **server 构建** | `builder.build(client)` / `vite build --ssr`                                    |
| **server 模块图**                 | `environments.ssr.moduleGraph`                                                  |

正文用 **client / server**（小写）指 Vite 双环境；仅在引用 Vite 配置项、CLI 标志、类型或方法名时保留 `ssr`、`ssrLoadModule` 等原生写法。React 生态专有名词（如 Client Component）仍按官方大小写。

## 背景

在 Vite 5 时代，框架类插件通常通过以下方式区分 client 与 server：

- 在 `transform` 等 hook 里使用 `options.ssr` 布尔参数
- 在 dev 里使用 `server.ssrLoadModule()`、`server.moduleGraph` 等服务器级 API
- 在 build 里用 `vite build` 打 client，再在 `writeBundle` 里二次调用 `vite build --ssr` 打 server

Vite 6+ 引入 Environment API，Vite 8 将其作为长期方向：每个环境（`client`、`server` 等；Vite 内部 server 环境 key 仍为 `ssr`）拥有独立的 `moduleGraph`、`pluginContainer`、`transformRequest`，server 开发通过 `RunnableDevEnvironment.runner.import()` 加载模块，并配合 `import.meta.hot.accept()` 做细粒度 HMR。

本次改进即是在上述模型下重构 `@web-widget/vite-plugin`，并调整 client 构建入口与插件内部状态共享方式。

## 改进总览

| 领域                  | 之前                                                               | 现在                                                                                                    |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 构建                  | `writeBundle` 里二次 `build({ isSsrBuild: true })`                 | `builder.buildApp` 一次编排 server + client                                                             |
| 构建顺序              | client → server（server transform 依赖 client manifest）           | server → client 反转；虚拟模块 + `.server-assets.js` 运行时查表解耦 client manifest                     |
| client 构建入口       | route / layout / fallback 作为 rolldown entry                      | `entry.client` + `@widget` + `@action` + 引用图扫描 CSS                                                 |
| 环境区分              | `options?.ssr`                                                     | `applyToEnvironment` + `this.environment.config.consumer`                                               |
| 插件状态共享          | 模块级 singleton、扫描 `config.plugins` 写回                       | `RouterPluginHost` 闭包 + `plugin.api`                                                                  |
| Dev 加载 server entry | `ssrLoadModule` + 中间件缓存                                       | 失效驱动 `runner.import()` + WebRouter 请求间缓存                                                       |
| Dev 路由模块          | 全量静态 import（entry 冷启动加载全部路由）                        | 可分析 `import(path)` 懒加载，仅匹配路由时加载                                                          |
| Dev 热更新兜底        | 劫持 `viteServer.ws.send` 监听 `full-reload`                       | server 环境 `hotUpdate` 向 client 发送 `full-reload` 自动刷新页面                                       |
| Dev 流式渲染          | 响应缓冲后整体返回，不支持 `progressive`                           | 渲染层注入 dev 资产，dev 与生产一致支持流式 SSR                                                         |
| Dev 配置              | `dev` 聚合字段（`exposeErrors`/`progressive`/`moduleSource` 合并） | `exposeErrors` 顶层字段                                                                                 |
| Dev origin 解析       | 误用 `config.preview.*`，且过早读取 `resolvedUrls`                 | `server.origin` → `resolvedUrls` → `config.server` 回退                                                 |
| Dev 异常处理          | 后台异步路径可能 `unhandledRejection` 导致进程退出                 | 请求/路由/HMR 分层 catch，仅打日志不退出 dev server                                                     |
| Dev 性能              | 每请求 reload entry + 全图 crawl meta                              | warmup + revision 缓存 WebRouter + 每请求 getMeta；routemap 内存去重                                    |
| 文件系统路由          | `restart(padding)` 等待写盘后重建中间件                            | 内存 routemap + 异步写盘；结构变更才 full-reload                                                        |
| 约定文件              | config 阶段一律 `resolveRealFile`，缺失即报错                      | 按文件性质分层：`ensureConventionFiles` auto-ensure                                                     |
| 构建产物命名          | 路径含 `index` 时易出现 `index@route2.js` 等撞名                   | 折叠 `index` 段 + server `manualChunks` 按模块路径命名 chunk                                            |
| 生产 CSS 输出         | 每个样式表独立 `<link>`，请求数多且级联顺序不可控                  | 按阈值内联为单个 `<style>` 或合并为单个外部 CSS                                                         |
| 代码组织              | 单文件 `entry.ts` 承载大部分逻辑                                   | 拆分为 `router/`、`widget/`、`internal/` + `RouterPluginHost`                                           |
| 框架适配              | 每个框架需编写专属 Vite 插件（`reactWebWidgetPlugin` 等）          | `WebWidgetAdapter` 协议：适配器包声明 `webWidgetAdapter` 字段，`webWidgetPlugin({ adapters })` 统一集成 |
| Node 适配器流处理     | 响应流忽略背压、客户端断开不取消源流、未消费请求体不清理           | 背压处理 + 断开取消源流 + 请求体自动清理 + 高效流转换                                                   |

## 1. 构建：Builder 双环境与 client 入口

### 统一双环境构建

执行 `vite build` 时：

1. 启用 Vite 8 `builder`，在同一进程内依次构建 server 与 client 环境（顺序由传统的 client → server **反转为 server → client**，详见第 2 节「构建顺序调整」）
2. 通过 `configEnvironment` 为每个环境注入独立的 `outDir`、`rolldownOptions.input`、manifest 等
3. 构建完成后输出 `@web-widget: build success!`

#### 移除的 hack

- 删除 `runSsrBuild()` 与 `stage` 计数器
- 不再在 client 构建的 `writeBundle` 里 `process.nextTick(() => build(...))` 触发第二次构建
- 删除 `autoFullBuild` 配置项：`vite build` 始终执行 server + client 双构建

#### 仍兼容的场景

| 命令               | 行为                                          |
| ------------------ | --------------------------------------------- |
| `vite build`       | server + client 双构建                        |
| `vite build --ssr` | 仅 server 构建（Vite CLI 标志名仍为 `--ssr`） |

### client 构建入口（Direction A）

生产 client 构建的 rolldown input **不再**包含 `@route` / `@layout` / `@fallback` 模块：

- **JS 入口**：`entry.client`、glob 发现的全部 `@widget` 模块、`@action` 模块
- **CSS 入口**：从 route / fallback 静态引用图扫描出的 `.css` / `.module.css` 文件
- **server `meta.link`**：`export-meta` 通过 `routeClientAssets`（widget + css 引用图）查 client manifest，而非把 route 当作 manifest entry

`collect-route-assets.ts` 负责静态扫描 routemap 引用图；`resolveClientEntryPoints()` 与 `resolveServerEntryPoints()` 分别产出 client / server 的 rolldown input。Dev 仍用 `dev/meta.ts` 的 server 模块图 crawl，与生产侧引用图规则对齐。

route 不再进入 client 图后，client 侧也不再需要 `remove-exports` 剥离 server-only export。

### 构建产物命名（折叠 `index` 与路径化 chunk）

深层目录中大量 `index@route.tsx`、`index.module.css` 等约定文件名时，旧逻辑把路径各段用 `.` 连接，产物名会残留 `.index` 或 Rolldown 默认 basename 撞名（如多个路由均输出为 `index@route.js`、`index@route2.js`），难以与源文件对应。

**client / rolldown entry 名**（`entryNameFromModulePath`，见 `internal/build-entry-points.ts`）：

- 去掉 `routes/`、`pages/` 等前缀后，将路径段用 `.` 连接
- **折叠末段 `index`**：`routes/examples/action/index@route.tsx` → `examples.action@route`（非 `examples.action.index@route`）
- **根路由**：`routes/index@route.tsx` → `_root@route`
- **CSS Modules**：`routes/examples/static/index.module.css` → `examples.static.module`
- **`@widget` 消歧**：同名不同扩展名的 widget（如 `Counter@widget.tsx` 与 `Counter@widget.vue`）在 entry 名中保留扩展名

manifest **查找 key 仍是源文件路径**（如 `routes/examples/action/index@route.tsx`），仅 chunk 的 `name` 与输出文件名变化。

**server 环境**（`configEnvironment` → server 环境的 `rolldownOptions`；Vite 环境 key 为 `ssr`）：

- server 构建仅保留 `@entry`（`entry.server`）为 rolldown input；route / middleware / action 由 manifest 静态 import 拉入同一图，**不再**与 rolldown entry 重复注册（避免「薄 re-export entry + 真实 facade chunk」双份产物）
- 开启 `output.codeSplitting: true`，并用 `manualChunks`（`createServerManualChunks`）按 `@route` / `@middleware` / `@action` / `@widget` 等模块路径拆 chunk
- `entryFileNames` / `chunkFileNames`（`createServerAssetFileNameResolver`）优先根据 `facadeModuleId` / `moduleIds` 解析为上述路径化名称

示例（React example，`dist/server/assets/`）：

| 源文件                                   | 旧产物名（典型）                 | 新产物名                   |
| ---------------------------------------- | -------------------------------- | -------------------------- |
| `routes/index@route.tsx`                 | `index@route.js`                 | `_root@route.js`           |
| `routes/examples/fetch/index@route.tsx`  | `index@route4.js`                | `examples.fetch@route.js`  |
| `routes/examples/action/index@route.tsx` | `examples.action.index@route.js` | `examples.action@route.js` |

`dist/server/index.js` 作为 server 入口文件名保持不变；仅 `assets/` 下 route / widget chunk 命名更可读。更多信息见 [RFC：Widget 资产 URL 解析](../../rfcs/widget-asset-url-resolution.zh.md)。

## 2. 构建顺序调整（server → client 反转）

将双环境构建顺序从传统的 client → server 反转为 server → client（`runRouterBuildApp`，见 [server-output.ts](../../packages/vite-plugin/src/router/server-output.ts)）：

```
builder.build(server)   →  server chunk（引用虚拟资产模块 + 占位 .server-assets.js）
        ↓
builder.build(client)   →  hashed chunks + manifest
        ↓
buildApp (post)         →  读 client manifest，回写 .server-assets.js
```

server transform 不再内联 client 资产 URL，改为通过虚拟模块 `virtual:web-widget-server-assets`（见 [server-assets-plugin.ts](../../packages/vite-plugin/src/router/server-assets-plugin.ts)）间接引用：server 构建期只产出占位 `.server-assets.js`，client 构建完成后由 `buildApp: post` 钩子回写真实 `assetUrls` 与 `linkMap`，server 运行时按需动态 `import()` 查表。

由此 server 构建不依赖 client manifest，可独立先完成；client 入口发现也得以推迟到 server 的 `buildStart` 阶段用 `this.resolve` 爬 import 图，原生支持 alias / tsconfig / workspace 包（`configEnvironment` 阶段默认 resolver 不支持）。

代价是 server 产物不再自包含，运行时多一次 `.server-assets.js` 模块加载。完整权衡分析见 [RFC：Widget Module 双环境反转构建](../../rfcs/widget-module-build.zh.md)。

## 3. 插件：Environment 感知与状态共享

### `applyToEnvironment`

按环境限定插件作用范围，避免在 hook 内手写 `if (options.ssr)` 或 `if (server)`：

| 插件                                             | 作用环境                |
| ------------------------------------------------ | ----------------------- |
| server entry transform                           | `consumer === 'server'` |
| `import-action`                                  | client                  |
| `import-render` / `export-render` 的 server 阶段 | server                  |

### `sharedDuringBuild: true`

在 client / server 双构建之间共享插件状态（如 routemap 解析结果），与 dev 时「单插件管道、多环境」的模型一致。

### `RouterPluginHost`

`createRouterPlugins()` 创建单一 `RouterPluginHost`，子插件工厂通过闭包共享同一 host；对外暴露为 `@web-widget:router` 的 `plugin.api`：

- `config` / `build`：resolved 配置、entry points、`routeClientAssets` 等
- `setWidgetModuleFilter()`：供 `webWidgetPlugin` 注册 widget 模块过滤

不再使用模块级 global singleton 或事后扫描 `config.plugins` 写回状态（`webWidgetPlugin` 在 `config` 钩子中调用 `api.setWidgetModuleFilter`）。

## 4. 开发服务器：server 模块加载与 HMR

### 失效驱动缓存

Dev 中间件在模块图未失效时复用 `WebRouter` 实例；`invalidateServerDevModules` / server 环境 `hotUpdate` 会递增 `devServerRevision` 并 bust 缓存，下一次请求再 `runner.import(serverEntry)`：

```ts
const revision = getDevServerRevision();
if (cachedWebRouter && cachedWebRouterRevision === revision) {
  webRouter = cachedWebRouter;
} else {
  webRouter = (await serverDev.importModule(serverEntry)).default;
  cachedWebRouter = webRouter;
  cachedWebRouterRevision = revision;
}
```

`RunnableDevEnvironment` 的 ModuleRunner 负责模块级 HMR；框架层不再每请求强制 reload middleware / action（`@web-widget/web-router` 与 prod 一样缓存 handler，依赖 Vite 失效 + WebRouter 重建）。

### Dev 路由懒加载

Dev routemap manifest 为每条路由生成可分析的懒加载器（字符串字面量 `import(path)`），entry 冷启动不再 eager 加载全部 route / middleware / action：

```js
const __WEB_WIDGET_MODULE_LOADERS__ = {
  './routes/page@route.tsx': () => import('./routes/page@route.tsx'),
};
```

仅路由匹配时才加载对应模块，复杂项目冷启动与首请求延迟显著降低。

### server 预热

`@web-widget:router` 插件在 dev 时注入 `server.warmup.ssrFiles`（Vite 配置项名；预热 `entry.server` + `routemap.server.json`）；middleware 注册后额外调用 `environment.warmupRequest()`，避免首请求 transform 瀑布。

### server entry 自动注入 HMR accept

在 dev 模式下，对 `entry.server` 的 transform 会自动追加：

```js
if (import.meta.hot) {
  import.meta.hot.accept();
}
```

避免 server 文件改动时整图失效，符合 [Vite Environment API for Frameworks](https://vite.dev/guide/api-environment-frameworks) 的建议。

### server 变更自动刷新浏览器

server 环境模块变更时，`@web-widget:server-full-reload` 插件通过 Vite 8 `hotUpdate` hook 向 client 环境发送 `full-reload`，浏览器自动刷新以展示新的服务端渲染 HTML。这与 Remix、SvelteKit 等元框架在 dev 下的体验一致。

`hotUpdate` 同时会 `invalidateModule` 失效 `entry.server` 与 `routemap.server.json`，并 bump `devServerRevision` 以 bust WebRouter 缓存，保证 middleware / action / route 代码更新生效。

文件系统路由更新 `routemap.server.json` 后，在 `invalidateModule` 之后同样触发一次 `full-reload`。

实现见 `src/dev/server-full-reload-plugin.ts` 与 `src/dev/server-invalidation.ts`，使用官方 API `server.environments.client.hot.send({ type: 'full-reload' })`，不再劫持 `viteServer.ws.send`。

### 删除 `autoRestartMiddleware`

旧实现为了热更新服务端业务代码，做了两件事：

1. 缓存整个 `NodeAdapter` 中间件（内含首次 `import` 的 `WebRouter`）
2. 劫持 `viteServer.ws.send`，在 `full-reload` 时清空缓存；文件系统路由通过 `restart(padding)` 等待 `routemap.server.json` 写盘后再清空

这在 Vite 8 + ModuleRunner 下属于多余且脆弱的做法（依赖内部 WS 协议）。中间件缓存与 `ws.send` 劫持已移除；浏览器刷新改由 `hotUpdate` + `full-reload` 负责。

### 文件系统路由

`fileSystemRouteGenerator` 的回调从 `update(padding)` 改为 `onRoutemapChanged()`。在 `routemap.server.json` 写入后，对 server entry 与 routemap 相关模块调用：

```ts
serverEnvironment.moduleGraph.invalidateModule(mod, ...)
```

显式失效 server 模块图，而不是重建中间件。

### Dev 文件系统路由（性能与失效策略）

实现见 `internal/routemap-from-fs.ts`（扫描 + 构建 routemap）、`dev/routing/index.ts`（watcher + 写盘）、`dev/routing/routemap-diff.ts`（结构 diff）。

| 环节                  | 行为                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Routemap 来源         | `RouterPluginHost.setDevServerRoutemap()` 内存缓存；`api.serverRoutemap()` dev 下优先读内存，避免每次 transform 读盘 |
| 写盘                  | JSON 未变则跳过写盘；有变时 **异步** 写 `routemap.server.json`（不阻塞失效）                                         |
| Watcher               | 仍仅响应 `routes/` 下 add/unlink（`change` 走常规模块 HMR）                                                          |
| 失效                  | 始终 `invalidateServerDevModules` + bump revision                                                                    |
| 浏览器刷新            | routemap **结构变更** 或 **路由文件 add/unlink**（含改回原名导致 JSON 与缓存相同）时触发 `full-reload`               |
| server 单文件内容变更 | `hotUpdate` 只失效 server 模块，**不** full-reload，保留 client 状态；下次请求拿到新服务端 HTML                      |

## 5. 开发体验：样式、工具协作与容错

### Dev 样式收集

`getMeta(source)` 每次 HTML 请求重新收集 CSS，不做请求间缓存：

1. **静态源码分析**（`collectRouteModuleAssets`）— 输出 `<link href>`，rename 后模块图断裂仍可靠
2. **server 模块图 crawl** — 补充 inline CSS module 与 dynamic import 样式

`dev/meta.ts` 通过 `ServerDevEnvironment` 接口访问模块图与 transform 管线，不再直接依赖 `ViteDevServer` 上的 `moduleGraph` / `ssrLoadModule` / `transformRequest(url, { ssr: true })`。

### Dev 流式渲染与资产注入

迁移前 dev 中间件会缓冲整个 SSR 响应以注入 CSS、HMR client 等 dev 资产，导致 `progressive`（流式 SSR）在 dev 下不可用。

现在 dev 资产在渲染层注入，不再缓冲响应——dev 与生产一样支持流式 SSR。Inspector 的 page source 也通过渲染产物传递，不再依赖额外的 response header 往返。

dev 相关的用户配置：`exposeErrors` 顶层字段、`progressive` 通过 `defaultRenderOptions.progressive`。

### Dev 错误堆栈映射

Dev 错误堆栈通过 `viteServer.ssrFixStacktrace` 映射回源码（`renderHandlerError` 与 `webRouter.fixErrorStack`），与迁移前 `ssrLoadModule({ fixStacktrace: true })` 行为一致。

### Dev origin 解析

server 请求需要正确的 `defaultOrigin`（传给 `@web-widget/node` 的 `NodeAdapter`），用于构造 `Request` URL。实现见 `src/dev/resolve-dev-origin.ts`，与 Vite 内部 URL 解析顺序对齐：

1. `config.server.origin` — 用户显式配置的公开 origin（Vite 原生选项）
2. `viteServer.resolvedUrls` — Vite 在 `httpServer` `listening` 后填充的实际地址（`local[0]` 或 `network[0]`）
3. `config.server` 回退 — 按 `https` / `host` / `port` 拼接，默认端口 `5173`；支持 `process.env.ORIGIN`

时机：middleware 在 `httpServer` 触发 `listening` 后再注册，确保 `resolvedUrls` 已就绪；`middlewareMode` 等无 `httpServer` 的场景则立即注册并走配置回退。

Preview：`src/router/preview.ts` 使用 `resolvePreviewOrigin()`，顺序为 `resolvedUrls` → `config.preview` 回退（preview 无 `origin` 选项）。

### 约定文件（`entry.*` / `routemap` / `importmap`）

框架约定项目根下若干文件。`parseWebRouterConfig` 只解析路径与校验 **entry**；在 dev / build 读取 routemap 与 importmap 之前，`@web-widget:router` 的 `config` hook 会调用 `ensureConventionFiles()`（实现见 `src/internal/ensure-convention-files.ts`）。

| 文件                                     | 策略                                                   |
| ---------------------------------------- | ------------------------------------------------------ |
| `entry.client` / `entry.server`          | **必须存在**；缺失时 fail fast，错误信息含最小示例代码 |
| `importmap.client.json`                  | **缺失则自动创建**空 `{ "imports": {}, "scopes": {} }` |
| `routemap.server.json`                   | 见下文                                                 |
| `routes/`（`filesystemRouting.enabled`） | 目录缺失时自动 `mkdir`                                 |

**`routemap.server.json`**

- **`filesystemRouting.enabled: true`**：config 阶段不要求文件已存在。`ensureConventionFiles` 若发现缺失，则扫描 `routes/` 并写入 routemap；空目录生成 `{ "routes": [] }`，应用仍可启动（路由匹配结果为 404）。Dev 下 `fileSystemRouteGenerator` 仍会在路由文件变更时增量更新同一文件。
- **`filesystemRouting.enabled: false`**：routemap 为唯一路由来源；缺失则 fail fast，并提示创建 `routemap.server.json` 或开启 `filesystemRouting`。

**Greenfield 项目（推荐开启文件系统路由）** 只需准备：

- `entry.client.ts` — 通常 `import '@web-widget/web-widget';`
- `entry.server.ts` — 须含 `import.meta.framework` 占位，并 `export default WebRouter.fromManifest(manifest, …)`

`importmap.client.json` 与 `routemap.server.json` 可在首次 `vite dev` / `vite build` 时由插件自动补齐。

### Dev 异常处理

Dev server 应容忍单次请求或后台任务的失败，避免因未捕获异常导致进程退出。

| 层级 | 场景                                                           | 行为                                                                   |
| ---- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 请求 | `importModule(serverEntry)` 失败                               | 返回 500 HTML 错误页（`renderHandlerError`）                           |
| 请求 | 路由渲染 / `transformIndexHtml` 失败                           | 同上                                                                   |
| 请求 | handler 仍抛出未捕获异常                                       | `@web-widget/node` middleware 兜底写 500 或 `next(error)`              |
| 启动 | `createWebRouterDevMiddleware` 同步 throw                      | `register()` 内 catch，打日志，dev server 继续（无 router middleware） |
| 后台 | 文件系统路由 `updateRoutemapFile` 失败                         | `.catch(logRoutemapError)`，不影响后续请求                             |
| 后台 | `onRoutemapChanged`（server 失效；结构变更时 full-reload）失败 | 回调内 + `updateRoutemapFile` 双层 catch，仅打日志                     |
| 后台 | `hotUpdate` 中 `invalidateServerDevModules` 失败               | `.catch()` 打日志（不 full-reload）                                    |

仍会在启动阶段 fail fast 的情况（预期行为，不应吞掉）：

- `configResolved` 缺少 plugin options
- 缺少 `entry.client` / `entry.server`（见上文约定文件）
- 未开启文件系统路由且缺少 `routemap.server.json`
- server environment 不是 `RunnableDevEnvironment`（catch 后打日志，但 router middleware 不会挂载）

## 6. 对使用者的影响

### 无需修改

- 现有项目的 `vite.config.ts` 中 `webRouterPlugin({ ... })` 配置方式不变
- `filesystemRouting`、`ssr.target` 等行为保持不变
- `entry.server.ts` / `entry.client.ts` 结构不变（HMR accept 由插件在 dev 时自动注入）
- 已提交仓库中的 `importmap.client.json` / `routemap.server.json` 行为不变；仅 **缺失** 时触发 auto-ensure

### 新项目可少准备的文件

开启 `filesystemRouting: { enabled: true }` 时，不必事先创建 `importmap.client.json` 或 `routemap.server.json`，也不必预先创建空的 `routes/` 目录（插件会在 ensure 阶段创建）。仍须提供 `entry.client` 与 `entry.server`。

### 不兼容变更

- 移除 `autoFullBuild` 配置项；`vite build` 始终执行 server + client 双构建。若曾设置 `autoFullBuild: false` 仅打 client，请改为只运行 client 相关脚本或调整构建流程。

### 可能感知到的变化

- Dev：服务端代码修改后，浏览器会自动刷新；亦可在不刷新时通过下一次 HTTP 请求拿到新服务端逻辑
- Dev：流式 SSR（`progressive`）现在与生产环境一致支持，dev 资产注入在渲染层完成，不再缓冲响应
- Build：双环境构建在同一 `vite build` 内完成，日志会出现 `building client environment` / `building ssr environment`（后者为 Vite 日志中的 server 环境名）
- client manifest：route 不再标记为 `isEntry`；widget 与 CSS 为独立 entry；client 构建尊重用户在 `vite.config.ts` 中自定义的 `build.manifest` 路径，但 manifest 是 server 资产解析的必需项，无法关闭；移除了自定义的 `output.manifest` 配置项
- **构建产物文件名**：client / server 的 `assets/` 下 chunk 名不再大量以 `index` 开头或带 `.index.` 段；若外部脚本硬编码了旧 hashed 路径，需改为依赖 manifest 或源路径 key，而非猜测 chunk basename
- **CSS 输出形态**：单个 entry 的多个 CSS 文件不再各自输出独立 `<link>`，而是按 `css.inlineThreshold`（默认 8 KB）内联为 `<style>` 或合并为单个外部 CSS；可通过 `css.inlineStrategy` 配置项调整
- 终端：若 playground 开启了 `future: 'warn'`，可能看到来自 `@vitejs/plugin-vue` / `plugin-vue2` 的 `[vite future]` 警告——不是 `@web-widget/vite-plugin` 的问题

## 7. Webworker SSR resolve conditions

### 历史问题

`ssr.target === 'webworker'` 时，Vite 默认使用 `defaultClientConditions`（含 `browser`）。这会让第三方包命中其 DOM 版本入口（依赖 `window`/`document`），破坏 CF/Worker 运行时——这正是历史上在 `packages/vite-plugin/src/router/index.ts` 中硬编码 `WEBWORKER_SERVER_RESOLVE_CONDITIONS = ['worklet','worker','import','module','default']` 的原因。

但该硬编码存在三个问题：

1. **丢失 `development|production`**：dev 模式下无法命中 package.json `exports` 中的 `"development": "./src/*.ts"`（如 [packages/helpers/package.json](../../packages/helpers/package.json) 的 `module/server`、`module/client` 子条件），只能走 `default` 的 dist 产物，丢失源码 HMR 与断点调试。
2. **含冗余 `import`/`default`**：这两个是 Node/解析器隐式应用的兜底条件，Vite 官方导出的 `defaultClientConditions`/`defaultServerConditions` 均不含它们，主动声明无意义。
3. **不跟随 Vite 演进**：硬编码无法继承 Vite 未来对默认值的调整。

### 改进

基于 Vite 导出的 `defaultClientConditions` 构建，前置 `worklet`/`worker` 让自家包命中 server 入口，并剔除 `browser` 让第三方包退回 `module`/`default` 通用版本：

```ts
import { defaultClientConditions } from 'vite';

const WEBWORKER_SERVER_RESOLVE_CONDITIONS = [
  'worklet',
  'worker',
  ...defaultClientConditions.filter((c) => c !== 'browser'),
];
// => ['worklet', 'worker', 'module', 'development|production']
```

### 与元框架对比

主流元框架（Astro 6、TanStack Start、React Router v7）在 CF 场景下采用 `@cloudflare/vite-plugin` + Vite 6 Environment API，让 dev 直接跑在 workerd 里，依靠运行时防线（workerd 没有 `window`/`document` 会立即报错）暴露问题，**不需要**在解析层手动剔除 `browser`。

web-widget 作为通用框架，未使用 Environment API，缺少运行时防线，因此继续在解析层剔除 `browser` 是合理的权宜方案。已通过显式设置 `ssr.resolve.conditions` 提供 escape hatch——用户使用 `@cloudflare/vite-plugin` 等 Environment API 方案时可覆盖本插件默认值（见 [router/index.ts](../../packages/vite-plugin/src/router/index.ts) 中 `resolveConditions` 计算）。

### 三种 target 的 conditions 对照

| Target                       | conditions                                                  | 来源                                              |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| `ssr.target === 'node'`      | `['module','node','development \| production']`             | Vite 默认 `defaultServerConditions`，无需插件介入 |
| `ssr.target === 'webworker'` | `['worklet','worker','module','development \| production']` | 本插件基于 `defaultClientConditions` 构建         |
| client build                 | `['module','browser','development \| production']`          | Vite 默认 `defaultClientConditions`，无需插件介入 |

## 8. CSS 合并与内联

### 问题

旧实现为每个样式表输出独立的 `<link rel="stylesheet">`。小体积 CSS 单独请求开销可能超过传输本身；且 `meta.link` 与 `meta.style` 是两个独立数组，无法交错排列，多个 `<link>` 与 `<style>` 混排时级联顺序不可控。

处理发生在 `buildServerAssetsData`（client 构建完成后），核心逻辑见 [css-merge.ts](../../packages/vite-plugin/src/internal/css-merge.ts)。合并多个 CSS 时，各文件内部的相对 `url()` 路径会因基准目录变化而失效，用 `lightningcss`（Vite 传递依赖，已提升为直接依赖）在 transform 阶段重写为绝对路径。`ServerAssetsData` 新增 `styleMap` 字段，与 `linkMap` 对应；server 运行时通过 `resolveStyle(routeId)` 查表，将内联 CSS 注入 `meta.style`。更多信息见 [RFC：CSS 合并与内联策略](../../rfcs/css-merging-and-inlining.zh.md)。

## 9. WebWidgetAdapter 协议

此前每个 UI 框架（React、Vue、Vue2）都需要提供专门的 Vite 插件（`reactWebWidgetPlugin`、`vueWebWidgetPlugin` 等），逻辑相似却互不兼容。3.0 引入 `WebWidgetAdapter` 协议将转换逻辑标准化：适配器包通过 `package.json` 的 `webWidgetAdapter` 字段声明框架标识、文件扩展名与运行时子路径，构建工具读取这些元数据自动完成文件匹配与渲染注入。

```json
{
  "webWidgetAdapter": {
    "version": "1.0.0",
    "name": "react",
    "extensions": [".tsx", ".jsx"],
    "adapter": "./adapter"
  }
}
```

用户在 `vite.config.ts` 中声明使用的适配器即可，无需为每个框架单独配置插件：

```typescript
webWidgetPlugin({
  adapters: [
    '@web-widget/react',
    { from: '@web-widget/vue2', scope: 'src/legacy' },
    { from: '@web-widget/vue', scope: 'src/vue3' },
  ],
});
```

`scope` 用于扩展名冲突时消歧义（如 Vue2 与 Vue3 共存）。完整设计见 [RFC](../../rfcs/build-transformation-protocol.zh.md)。

## 10. Widget 孤岛错误恢复

此前 widget 渲染失败时错误会向上冒泡，导致整页崩溃或流式渲染中永久显示 loading fallback。widget 容器现在内部集成了 `ErrorBoundary` 和 `Suspense`，错误被限制在单个孤岛内，自动渲染用户提供的 `fallback`：

```tsx
// 容器配置通过 widget prop 传入，与组件自身 props 命名空间隔离
<Counter widget={{ fallback: <Spinner /> }} count={1} />

// 区分 pending 与 error
<Counter widget={{ fallback: { pending: <Spinner />, error: <ErrorUI /> } }} count={1} />

// serverOnly / clientOnly 互斥缩写
<Counter widget={{ serverOnly: true }} count={1} />
```

容器配置（`fallback`、`loading`、`serverOnly`、`clientOnly`）全部收进 `widget` 对象，彻底避免与 widget 自身 props 的命名冲突。

所有框架适配器（React、Vue、Vue2、HTML）采用统一的 `fallback` 设计：`fallback` 接受 UI 值或 `{ pending?, error? }` 对象，`error` 省略时回退到 `pending`。

**流式 SSR shell 错误感知**：流式渲染（`progressive` 模式）下，三个框架的 shell 级错误现在能被正确捕获并触发框架级 500 错误页：

- **React**：移除了原先包裹整个路由组件树的 `RouteErrorBoundary`（它会吞掉 shell 错误使流正常返回 200），改为依赖 `renderToReadableStream` 的原生语义——shell 错误使 Promise reject，框架据此返回 500。Suspense 内的 widget 错误仍通过 `$RC` 机制替换 pending fallback，不中断流。
- **HTML**：`renderToStream` 改为异步返回 `Promise<ReadableStream>`。Phase 1（shell）缓冲完整执行后再返回流；shell 抛错则 Promise reject。Phase 2（deferred）内的错误仍通过 `suspense()` + `fallback()` 恢复。
- **Vue**：Vue 的 `renderToWebStream` 通过 Promise 微任务异步渲染，返回时渲染尚未发生。现在通过消费流的第一个 chunk 刷新微任务队列，使 `errorHandler` 在返回前触发，从而感知 shell 错误。

完整设计见 [RFC：React Widget 孤岛设计](../../rfcs/react-widget-opinionated-design.zh.md) 与 [RFC：构建转换协议 §1.7](../../rfcs/build-transformation-protocol.zh.md)。

## 11. HTML 模板 Widget 孤岛

`@web-widget/html` 声明 `WebWidgetAdapter` 协议，使用 `.html.ts` 扩展名。构建工具对 `.html.ts` 文件自动注入 `render`（无需手动 `export { render }`），并在导入 `@widget` 模块时自动注入 `container`，使 HTML 模板可以直接嵌入 React、Vue 等框架 widget 作为交互孤岛。

```typescript
// Page@route.html.ts — 自动注入 render
import { html, fallback } from '@web-widget/html';
import { container } from '@web-widget/html/adapter';
import ReactCounter from './Counter@widget.tsx';

const Counter = container(() => import('./Counter@widget.tsx'));

export default function Page() {
  return html`<div>
    <h1>Dashboard</h1>
    ${fallback(
      Counter({ count: 42 }),
      () => html`<div>Widget unavailable</div>`
    )}
    ${Counter({ count: 99, widget: { serverOnly: true } })}
  </div>`;
}
```

容器 API 与 React 适配器对齐：widget 自身 props 直接展开，容器配置（`loading`、`serverOnly`、`clientOnly`）收进 `widget` prop。`container()` 从模块的默认导出自动推导 props 类型，HTML 模板中调用时享有完整的类型检查。

错误恢复通过 HTML 模板已有的 `fallback()` 函数实现——widget 渲染失败时渲染替代 HTML，不影响页面其他部分。与 React 的 `ErrorBoundary` + `$RC` 机制相比更简单，因为 HTML 模板的 async iterable 天然支持流式，不需要占位符替换协议。

完整设计见 [RFC：HTML 模板 Widget 孤岛设计](../../rfcs/html-widget-island.zh.md)。

## 12. HTML 模板 Suspense 流式渲染

`@web-widget/html` 新增 `suspense()` 函数，`renderToStream` 扩展支持渐进式渲染——异步内容 resolve 后在流中原位置替换 pending，不阻塞后续内容。`render` 现在尊重 `progressive` 选项：`true` 时流式渲染（Suspense 生效），`false` 时缓冲为完整字符串（Suspense 阻塞模式）。

`suspense` 和 `fallback` 遵循 React 的关注点分离原则——`suspense(content, pending)` 只管 pending → ready，`fallback(content, errorFn)` 只管 error → error UI。两者自由组合：`fallback(suspense(content, pending), errorFn)`。`fallback()` 迭代时将 error handler 压入上下文栈，内层 `suspense()` 注册 deferred 时捕获该 handler，Phase 2 中 deferred 报错时使用它渲染错误 UI 并通过 `$HRC` 替换 pending。

```typescript
import { html, suspense, fallback } from '@web-widget/html';

export default function Page() {
  return html`<div>
    <h1>Dashboard</h1>
    <p>Welcome back!</p>
    ${fallback(
      suspense(fetchUserData(), html`<div>Loading...</div>`),
      html`<div>Failed to load</div>`
    )}
    <p>This renders immediately.</p>
  </div>`;
}
```

`container()` 内部自动组合 `fallback(suspense(...), errorFn)`。流式协议使用 `$H` 前缀（`$HRC`、`HS:0`、`HB:0`）与 React 的 `$RC` 协议完全隔离，两者可在同一页面安全共存。

完整设计见 [RFC：HTML 模板 Suspense 渐进式渲染](../../rfcs/html-suspense.zh.md)。

## 13. HTML 模板 lit-html 兼容 directives

`@web-widget/html` 新增 `classMap`、`styleMap`、`ifDefined`、`when`、`join` 五个模板指令函数，API 签名与 lit-html 对应指令一致，降低从 lit-html 迁移成本。与 lit-html 的 directive 不同，这些函数是无状态的纯值转换器，直接返回字符串或 `HTMLContent`，无需框架运行时即可工作。

```typescript
import {
  html,
  classMap,
  styleMap,
  ifDefined,
  when,
  join,
} from '@web-widget/html';

export default function Page({ user, items }) {
  return html`<div>
    <span
      class="${classMap({ active: user.isActive, disabled: !user.isActive })}"
      style="${styleMap({ color: user.color, fontSize: '14px' })}">
      ${user.name}
    </span>
    <a href="${ifDefined(user.url)}">profile</a>
    ${when(user.isAdmin, html`<button>Admin Panel</button>`)}
    <ul>
      ${join(
        items.map((i) => html`<li>${i}</li>`),
        html`<hr />`
      )}
    </ul>
  </div>`;
}
```

| 指令                         | 用途                  | 行为说明                                                                    |
| ---------------------------- | --------------------- | --------------------------------------------------------------------------- |
| `classMap({ name: truthy })` | 条件拼接 class 字符串 | 仅包含 truthy 值的键，空格分隔                                              |
| `styleMap({ prop: value })`  | 条件拼接 style 字符串 | camelCase 自动转 kebab-case，跳过 `null`/空值，保留 CSS 自定义属性（`--*`） |
| `ifDefined(value)`           | 可选属性值            | `undefined` 时返回空字符串，避免渲染 `undefined`                            |
| `when(cond, a, b?)`          | 条件渲染              | truthy 渲染 `a`，falsy 渲染 `b`（省略则为空）                               |
| `join(items, sep)`           | 列表分隔渲染          | 在每对 item 之间插入分隔符，首尾不加分隔符                                  |

## 14. HTML 模板压缩 Vite 插件

`@web-widget/html` 新增 `htmlCompress` Vite 插件，在构建时压缩 `html` 标签模板字面量中的冗余空白——合并连续空白字符、移除标签间的换行与缩进，减小产物体积。插件通过 `./vite-plugin` 子路径导出。

```typescript
// vite.config.ts
import { htmlCompress } from '@web-widget/html/vite-plugin';

export default {
  plugins: [htmlCompress()],
};
```

压缩发生在 Vite 的 `transform` 阶段（`enforce: 'pre'`），插件扫描源码中的 `html\`...\``标签模板字面量，仅处理静态部分（插值`${...}` 内容不动），递归扫描嵌套模板。`pre`、`textarea`、`script`、`style` 等空白敏感元素的内容被原样保留。

不引入 `html-minifier-terser`、`minify-html-literals` 等第三方库的原因：标签模板字面量将 HTML 拆分到多个静态片段与插值之间，完整的 HTML 解析器无法处理这种碎片化结构；而主要收益来自空白压缩，用 `magic-string`（monorepo 中已有依赖）做源码转换即可实现，同时天然支持 sourcemap。

## 15. 统一的 `container()` 导入 API

3.0 早期版本中，跨框架 widget 导入需要手动调用类型适配函数（`asReactWidget`、`asHtmlWidget`），用户需显式书写泛型参数，且不同框架的适配函数签名不一致。本版本将这些函数统一替换为 `container()`——一个既做运行时包装（集成 `Suspense` + `ErrorBoundary`）又承载类型推导的单一入口。

### 两种导入写法

**静态导入**（约定式，最简洁）：

```typescript
// 构建工具自动转换为 container() 调用，注入 import 与 name 选项
import VueCounter from './Counter@widget.vue';
```

**显式 `container()` 调用**（跨框架类型安全场景）：

```typescript
import { container } from '@web-widget/react/adapter';

const VueCounter = container(() => import('./Counter@widget.vue'));
```

显式写法适用于需要精确控制类型推导或添加额外选项（如 `loading`、`renderTarget`）的场景。两种写法在运行时等价。

### 构建时自动注入

`import-render` Vite 插件在 `transform` 阶段扫描源码，对两种写法自动注入 `import`（客户端 chunk 路径）与 `name`（组件名，用于 `<web-widget>` 元素的 `name` 属性）选项：

- **静态导入**：`import Foo from './Foo@widget.vue'` → `const Foo = container(() => import(...), { import: "...", name: "Foo" })`
- **显式调用**：`container(() => import('...'))` → `container(() => import('...'), { import: "...", name: "Foo" })`，选项注入或合并到已有 options 对象

`import` 选项的值取决于环境：dev 下为 `/src/Foo@widget.vue`，client 构建下为 `import.meta.ROLLUP_FILE_URL_*`，server 构建下为 `resolveWidgetAsset("src/Foo@widget.vue")`。

### 类型推导

`container()` 通过 `ExtractModuleProps<M>` 从模块的默认导出自动推导 props 类型：

- **React 函数组件**：匹配 `ComponentType<P>`，提取 `P`
- **Vue 组件**：匹配 `new (...args) => { $props: infer P }`，提取 `$props`
- **HTML 函数组件**：匹配 `(props: infer P, ...) => any`，提取 `P`
- 以上均不匹配时回退为 `unknown`

同框架导入（如 React→React）享有完整的 props 类型检查；跨框架导入（如 Vue→React）通过 Vue `$props` 提取也实现了自动类型推导，无需手动书写泛型。

## 参考

- [Vite 8 Environment API for Plugins](https://vite.dev/guide/api-environment-plugins)
- [Vite 8 Environment API for Frameworks](https://vite.dev/guide/api-environment-frameworks)
- [SSR Using ModuleRunner API](https://vite.dev/changes/ssr-using-modulerunner)
- [this.environment in Hooks](https://vite.dev/changes/this-environment-in-hooks)
