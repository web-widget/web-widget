# @web-widget/vite-plugin：重构

本文档说明 `@web-widget/vite-plugin` 围绕 Vite 8 的一系列改进：Environment API 双环境模型、统一 Builder 构建、client 入口模型（Direction A）、dev server 运行时，以及 `RouterPluginHost` 插件协作方式。目标是在不强制用户修改 `vite.config.ts` 的前提下，与 Vite 8 的 client / server 双环境、builder 编排及 server 开发时的 ModuleRunner HMR 对齐。

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

| 领域                  | 之前                                                               | 现在                                                                                    |
| --------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 构建                  | `writeBundle` 里二次 `build({ isSsrBuild: true })`                 | `builder.buildApp` 一次编排 client + server                                             |
| client 构建入口       | route / layout / fallback 作为 rolldown entry                      | `entry.client` + `@widget` + `@action` + 引用图扫描 CSS                                 |
| 环境区分              | `options?.ssr`                                                     | `applyToEnvironment` + `this.environment.config.consumer`                               |
| 插件状态共享          | 模块级 singleton、扫描 `config.plugins` 写回                       | `RouterPluginHost` 闭包 + `plugin.api`                                                  |
| Dev 加载 server entry | `ssrLoadModule` + 中间件缓存                                       | 失效驱动 `runner.import()` + WebRouter 请求间缓存                                       |
| Dev 路由模块          | 全量静态 import（entry 冷启动加载全部路由）                        | 可分析 `import(path)` 懒加载，仅匹配路由时加载                                          |
| Dev 热更新兜底        | 劫持 `viteServer.ws.send` 监听 `full-reload`                       | server 环境 `hotUpdate` 向 client 发送 `full-reload` 自动刷新页面                       |
| Dev 模块协作          | —                                                                  | `manifest.moduleSource` + `x-module-source` header                                      |
| Dev 配置              | `dev` 聚合字段（`exposeErrors`/`progressive`/`moduleSource` 合并） | `exposeErrors` 顶层字段；`manifest.exposeErrors` / `manifest.moduleSource` 私有协作字段 |
| Widget / CSS 发现范围 | `widgetSearchDirs` 硬编码 `[filesystemRouting.dir]`                | 路由 import 图递归（`crawlRouteModule`），由 `widgetModuleFilter` 驱动                  |
| Dev origin 解析       | 误用 `config.preview.*`，且过早读取 `resolvedUrls`                 | `server.origin` → `resolvedUrls` → `config.server` 回退                                 |
| Dev 异常处理          | 后台异步路径可能 `unhandledRejection` 导致进程退出                 | 请求/路由/HMR 分层 catch，仅打日志不退出 dev server                                     |
| Dev 性能              | 每请求 reload entry + 全图 crawl meta                              | warmup + revision 缓存 WebRouter + 每请求 getMeta；routemap 内存去重                    |
| 文件系统路由          | `restart(padding)` 等待写盘后重建中间件                            | 内存 routemap + 异步写盘；结构变更才 full-reload                                        |
| 约定文件              | config 阶段一律 `resolveRealFile`，缺失即报错                      | 按文件性质分层：`ensureConventionFiles` auto-ensure                                     |
| 构建产物命名          | 路径含 `index` 时易出现 `index@route2.js` 等撞名                   | 折叠 `index` 段 + server `manualChunks` 按模块路径命名 chunk                            |
| 代码组织              | 单文件 `entry.ts` 承载大部分逻辑                                   | 拆分为 `router/`、`widget/`、`internal/` + `RouterPluginHost`                           |

## 1. 构建：Builder 双环境与 client 入口

### 统一双环境构建

执行 `vite build` 时：

1. 启用 Vite 8 `builder`，在同一进程内依次构建 `client` 与 server 环境
2. 通过 `configEnvironment` 为每个环境注入独立的 `outDir`、`rolldownOptions.input`、manifest 等
3. 构建完成后输出 `@web-widget: build success!`

#### 移除的 hack

- 删除 `runSsrBuild()` 与 `stage` 计数器
- 不再在 client 构建的 `writeBundle` 里 `process.nextTick(() => build(...))` 触发第二次构建
- 删除 `autoFullBuild` 配置项：`vite build` 始终执行 client → server 双构建

#### 仍兼容的场景

| 命令               | 行为                                          |
| ------------------ | --------------------------------------------- |
| `vite build`       | client → server 双构建                        |
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

`dist/server/index.js` 作为 server 入口文件名保持不变；仅 `assets/` 下 route / widget chunk 命名更可读。

## 2. 插件：Environment 感知与状态共享

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
- `setDynamicImportPredicate()`：供 `webWidgetPlugin` 注册 widget 动态 import 过滤

不再使用模块级 global singleton 或事后扫描 `config.plugins` 写回状态（`webWidgetPlugin` 在 `configResolved` 中调用 `api.setDynamicImportPredicate`）。

## 3. 开发服务器：server 模块加载与 HMR

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

`router-config-plugin` 在 dev 时注入 `server.warmup.ssrFiles`（Vite 配置项名；预热 `entry.server` + `routemap.server.json`）；middleware 注册后额外调用 `environment.warmupRequest()`，避免首请求 transform 瀑布。

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

`fileSystemRouteGenerator` 的回调从 `update(padding)` 改为 `onRoutemapUpdated()`。在 `routemap.server.json` 写入后，对 server entry 与 routemap 相关模块调用：

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

## 4. 开发体验：样式、工具协作与容错

### Dev 样式收集

`getMeta(source)` 每次 HTML 请求重新收集 CSS，不做请求间缓存：

1. **静态源码分析**（`collectRouteModuleAssets`）— 输出 `<link href>`，rename 后模块图断裂仍可靠
2. **server 模块图 crawl** — 补充 inline CSS module 与 dynamic import 样式

`dev/meta.ts` 通过 `ServerDevEnvironment` 接口访问模块图与 transform 管线，不再直接依赖 `ViteDevServer` 上的 `moduleGraph` / `ssrLoadModule` / `transformRequest(url, { ssr: true })`。

### 路由模块路径（`x-module-source`）

Dev 下 CSS meta 注入需要知道当前渲染的路由源文件。契约集中在 `src/dev/module-source.ts`：

- `$source`：项目根相对路径（如 `/routes/index@route.tsx`），由 dev manifest loader 注入
- `manifest.moduleSource`：vite-plugin 注入，将 `$source` 写入 `x-module-source` response header（私有协作字段，不供应用代码使用）

`resolveModuleSourcePath()` 将 header 值解析为项目根下的绝对文件路径。

dev 相关的用户配置分散在 `@web-widget/web-router` 各接口：`exposeErrors` 顶层字段、`progressive` 通过 `defaultRenderOptions.progressive`。`manifest.moduleSource` 与 `manifest.exposeErrors` 为 vite-plugin 与 `@web-widget/web-router` 的私有协作字段：dev 下 vite-plugin 在 manifest 上注入 `exposeErrors = true`，使服务端错误页始终携带完整错误信息（等价于迁移前 `dev: true` 的行为），且优先级高于用户 `exposeErrors` 选项。`progressive` 在 dev 下仍为 `false`（Vite dev 不支持流式传输），由 `defaultRenderer.progressive` 默认值保证，无需额外注入。

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
| 后台 | 文件系统路由 `generateRoutemapFile` 失败                       | `.catch(logRoutemapError)`，不影响后续请求                             |
| 后台 | `onRoutemapChanged`（server 失效；结构变更时 full-reload）失败 | 回调内 + `generateRoutemapFile` 双层 catch，仅打日志                   |
| 后台 | `hotUpdate` 中 `invalidateServerDevModules` 失败               | `.catch()` 打日志（不 full-reload）                                    |

仍会在启动阶段 fail fast 的情况（预期行为，不应吞掉）：

- `configResolved` 缺少 plugin options
- 缺少 `entry.client` / `entry.server`（见上文约定文件）
- 未开启文件系统路由且缺少 `routemap.server.json`
- server environment 不是 `RunnableDevEnvironment`（catch 后打日志，但 router middleware 不会挂载）

## 5. 架构：插件拆分

原先 `entry.ts` 集中了配置、server entry transform、资源 emit、异步 hooks 移除等逻辑。现拆分为：

```
packages/vite-plugin/src/
├── environment.ts              # ServerDevEnvironment、importServerModule、applyToXxx
├── router-plugin-host.ts       # RouterPluginHost + WebRouterPlugin.api
├── web-router.ts               # 导出 webRouterPlugin
└── plugins/
    ├── router-config-plugin.ts # config / configEnvironment / builder
    ├── server-entry-plugin.ts  # import.meta.framework transform + HMR accept
    ├── entry-assets-plugin.ts  # generateBundle、buildApp 成功日志
    ├── collect-route-assets.ts # route/fallback 引用图扫描（Direction A）
    ├── build-entry-points.ts   # routemap → client/server rolldown input
    └── remove-async-hooks-plugin.ts
```

对外 API 不变：仍通过 `webRouterPlugin()` / `webWidgetPlugin()` 使用。

### 对外新增导出（可选使用）

- 类型 `ServerDevEnvironment`
- 函数 `asServerDevEnvironment(environment)`

便于测试或其它工具 mock server dev 环境。

## 6. 测试与 Playground

### 单元测试（`packages/vite-plugin`）

- `internal/ensure-convention-files.test.ts`：约定文件 auto-ensure（空 importmap、FS 路由生成 routemap、手写 routemap 缺失报错）
- `internal/build-entry-points.test.ts`：`index` 路径折叠、`@widget` 扩展名消歧、server chunk 基名解析
- `dev/routing/routemap-diff.test.ts`：routemap 结构变更检测
- `dev/meta.test.ts`：用 mock `ServerDevEnvironment` 验证 dev 时 CSS 收集（内联样式与 stylesheet link）
- `dev/resolve-dev-origin.test.ts`：验证 `server.origin` 优先、`resolvedUrls` 次之、dev 回退用 `config.server` 而非 `preview`
- `dev/dev-server-cache.test.ts`：WebRouter revision bust
- `plugins/collect-route-assets.test.ts`：Direction A 引用图扫描
- 扩展 `test/vite-stub.ts`：补充 `isCSSRequest` stub，供 Jest 使用

### Playground 集成（`playgrounds/router`）

- `test/build.test.ts`：断言 `dist/client/.manifest.json` 与 `dist/server/index.js` 等双构建产物
- `vite.config.ts`：开启 `future.*: 'warn'`，用于扫描生态中仍使用旧 API 的插件（见下文）

## 7. 对使用者的影响

### 无需修改

- 现有项目的 `vite.config.ts` 中 `webRouterPlugin({ ... })` 配置方式不变
- `filesystemRouting`、`ssr.target` 等行为保持不变
- `entry.server.ts` / `entry.client.ts` 结构不变（HMR accept 由插件在 dev 时自动注入）
- 已提交仓库中的 `importmap.client.json` / `routemap.server.json` 行为不变；仅 **缺失** 时触发 auto-ensure

### 新项目可少准备的文件

开启 `filesystemRouting: { enabled: true }` 时，不必事先创建 `importmap.client.json` 或 `routemap.server.json`，也不必预先创建空的 `routes/` 目录（插件会在 ensure 阶段创建）。仍须提供 `entry.client` 与 `entry.server`。

### 破坏性变更

- 移除 `autoFullBuild` 配置项；`vite build` 始终执行 client + server 双构建。若曾设置 `autoFullBuild: false` 仅打 client，请改为只运行 client 相关脚本或调整构建流程。

### 可能感知到的变化

- Dev：服务端代码修改后，浏览器会自动刷新；亦可在不刷新时通过下一次 HTTP 请求拿到新服务端逻辑
- Build：双环境构建在同一 `vite build` 内完成，日志会出现 `building client environment` / `building ssr environment`（后者为 Vite 日志中的 server 环境名）
- client manifest：route 不再标记为 `isEntry`；widget 与 CSS 为独立 entry
- **构建产物文件名**：client / server 的 `assets/` 下 chunk 名不再大量以 `index` 开头或带 `.index.` 段；若外部脚本硬编码了旧 hashed 路径，需改为依赖 manifest 或源路径 key，而非猜测 chunk basename
- 终端：若 playground 开启了 `future: 'warn'`，可能看到来自 `@vitejs/plugin-vue` / `plugin-vue2` 的 `[vite future]` 警告——不是 `@web-widget/vite-plugin` 的问题

## 8. 关于 `[vite future]` 警告

在 `playgrounds/router/vite.config.ts` 中配置了：

```ts
future: {
  removePluginHookSsrArgument: 'warn',
  removeSsrLoadModule: 'warn',
  removeServerWarmupRequest: 'warn',
  // ...
}
```

启动 dev 时若出现例如：

- `handleHotUpdate` → `hotUpdate`（vite:vue、vite:vue2）
- `options.ssr` → `this.environment`（vite:vue）
- `server.warmupRequest` → `environment.warmupRequest`

这些来自 Vue 官方 Vite 插件或 Vite 核心预热流程，不是本包未迁移的信号。`@web-widget/vite-plugin` 已不再使用上述遗留 API。

若不需要扫描，可删除或收紧 playground 中的 `future` 配置。

## 9. Webworker SSR resolve conditions

### 背景

`ssr.target === 'webworker'` 时，Vite 默认使用 `defaultClientConditions`（含 `browser`）。这会让第三方包命中其 DOM 版本入口（依赖 `window`/`document`），破坏 CF/Worker 运行时——这正是历史上在 `packages/vite-plugin/src/router/index.ts` 中硬编码 `WEBWORKER_SERVER_RESOLVE_CONDITIONS = ['worklet','worker','import','module','default']` 的原因。

但该硬编码存在三个问题：

1. **丢失 `development|production`**：dev 模式下无法命中 package.json `exports` 中的 `"development": "./src/*.ts"`（如 [packages/helpers/package.json](../../helpers/package.json) 的 `module/server`、`module/client` 子条件），只能走 `default` 的 dist 产物，丢失源码 HMR 与断点调试。
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

web-widget 作为通用框架，未使用 Environment API，缺少运行时防线，因此继续在解析层剔除 `browser` 是合理的权宜方案。已通过显式设置 `ssr.resolve.conditions` 提供 escape hatch——用户使用 `@cloudflare/vite-plugin` 等 Environment API 方案时可覆盖本插件默认值（见 [router/index.ts](../src/router/index.ts) 中 `resolveConditions` 计算）。

### 三种 target 的 conditions 对照

| Target                       | conditions                                 | 来源          |
| ---------------------------- | ------------------------------------------ | ------------- | ------------------------------------------------- |
| `ssr.target === 'node'`      | `['module','node','development             | production']` | Vite 默认 `defaultServerConditions`，无需插件介入 |
| `ssr.target === 'webworker'` | `['worklet','worker','module','development | production']` | 本插件基于 `defaultClientConditions` 构建         |
| client build                 | `['module','browser','development          | production']` | Vite 默认 `defaultClientConditions`，无需插件介入 |

### 验证

- 自家包（如 `@web-widget/helpers`）命中 `worker` → server 入口
- 第三方包无 `worker` 条件，退回 `module`/`default` → 通用版本，避开 DOM
- dev 模式命中 `"development"` 子条件 → 源码，支持 HMR 与断点

## 参考

- [Vite 8 Environment API for Plugins](https://vite.dev/guide/api-environment-plugins)
- [Vite 8 Environment API for Frameworks](https://vite.dev/guide/api-environment-frameworks)
- [SSR Using ModuleRunner API](https://vite.dev/changes/ssr-using-modulerunner)
- [this.environment in Hooks](https://vite.dev/changes/this-environment-in-hooks)
