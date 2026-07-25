# RFC：跨平台部署与运行时适配

状态：草案

## 摘要

Web Widget 已有基于 Web 标准的跨平台路由内核，但用户仍需手动配置构建目标、平台入口、静态资源和部署工具。

本 RFC 提议引入构建期 **Deployment Integration（部署集成）**，并首先提供 Node 与 Cloudflare 官方实现。应用代码保持平台无关，运行时 **Adapter（适配器）** 只负责宿主协议转换。

## 动机

`WebRouter.handler(request, env, executionContext)` 已经使用标准 `Request` 和 `Response`，`@web-widget/node` 也已能转换 Node HTTP 请求。但完成部署仍要求用户了解框架内部约束：

- Node 用户需要手写 server、静态文件 middleware 和进程配置。
- Cloudflare 用户需要协调 Worker 入口、Wrangler、Workers Static Assets 和 workerd。
- 用户必须手动选择 `ssr.target`、resolve conditions 和 external/noExternal 策略。
- 构建系统无法及时诊断 Worker bundle 中的 Node builtin、缺失 binding 或错误平台配置。

现有缺口集中在构建产物到部署宿主的边界，而不是 route、middleware、action 或 Widget API。

## 提议

主流框架通常将平台差异保留在业务路由之外。SvelteKit 和 Astro 使用构建期 adapter，Nuxt 使用 Nitro preset，React Router 保留很薄的平台 bridge，Remix v3 则将 Node Fetch bridge、静态文件 middleware 和应用 handler 拆成独立模块。

Web Widget 选择显式 Deployment Integration 来协调 Vite server/client 双构建、manifest 与 provider 配置，同时保留可独立使用的 Runtime Adapter。

用户在 Vite 配置中显式选择部署目标：

```ts
// Node standalone
import { node } from '@web-widget/node/deployment';

webRouterPlugin({
  deployment: node({ mode: 'standalone' })
});
```

```ts
// Cloudflare Workers
import { cloudflare } from '@web-widget/cloudflare/deployment';

webRouterPlugin({
  deployment: cloudflare({ configPath: 'wrangler.jsonc' })
});
```

Deployment Integration 负责：

- 选择 server target、resolve conditions 和 dependency externalization 策略。
- 生成或组织平台入口与静态资源产物。
- 接入平台官方的开发、预览和测试环境。
- 验证最终配置和 bundle 与部署目标兼容。

Runtime Adapter 会进入最终运行时 bundle，只负责把宿主请求映射到：

```ts
router.handler(request, bindings, executionContext)
```

Runtime Adapter 不读取 Vite 配置、不生成文件，也不决定静态资源路由。

首版支持三种输出：

| 输出 | 平台入口 | 静态资源 |
| --- | --- | --- |
| Node middleware | 用户宿主调用 `NodeAdapter` | 用户的 Koa、Express 或其他 server 负责 |
| Node standalone | integration 生成可执行 server | 生成的 server 从 client output 服务 |
| Cloudflare Workers | integration 生成 module Worker | Workers Static Assets 平台负责 |

### 构建后的使用

所有模式都使用同一个构建命令：

```bash
vite build
```

Node standalone 默认生成：

```text
dist/
├── index.js        # 可执行 server 入口
├── server/         # Web Router server build
└── client/         # client assets 与 public files
```

用户直接启动：

```bash
node dist/index.js
```

`dist/` 整个目录是一个部署单元。若 server build 保留了 external production dependencies，部署环境还必须提供对应的 `node_modules`；integration 必须在构建日志中说明这一点。

Node middleware 默认保留可导入的 server build：

```text
dist/
├── server/index.js  # 默认导出 WebRouter
└── client/          # 由宿主静态文件 middleware 服务
```

用户在自有 server 中导入它：

```ts
import NodeAdapter from '@web-widget/node/adapter';
import router from './dist/server/index.js';

app.use(serve('./dist/client'));
app.use(new NodeAdapter(router).middleware);
```

`serve()` 代表用户选择的 Koa、Express 或其他静态文件 middleware，不由 Web Widget 强制实现。

Cloudflare 构建会生成 Worker、client assets 和 Cloudflare Vite plugin 的输出 `wrangler.json`。用户可以在 workerd 中预览：

```bash
vite preview
```

或部署：

```bash
wrangler deploy
```

Wrangler 自动定位构建生成的输出配置，用户不直接运行或导入 Worker 产物。CI 中的完整流程为 `vite build && wrangler deploy`。

构建成功后，integration 必须输出部署目标、入口、静态资源位置和下一步命令。用户不应该需要检查内部 manifest 才能运行或部署产物。

首版不统一云厂商的资源模型，不重新设计 `WebRouter.handler()`，也不实现 Node 和 Cloudflare 以外的平台。

未配置 `deployment` 时保留现有构建行为，不根据 CI 环境变量猜测平台。

## 详细设计

### 协议与包边界

协议先服务 Node 和 Cloudflare 官方实现，只保留实现生命周期所需的最小字段。

```ts
interface DeploymentIntegration {
  readonly name: string;
  readonly server: {
    target: 'node' | 'webworker';
    resolveConditions?: string[];
    noExternal?: boolean | string[];
    external?: string[];
  };

  configure?(context: DeploymentConfigureContext):
    | DeploymentConfiguration
    | Promise<DeploymentConfiguration>;
  emulate?(context: DeploymentEmulationContext):
    | DeploymentEmulator
    | Promise<DeploymentEmulator>;
  adapt?(builder: DeploymentBuilder): void | Promise<void>;
}
```

`deployment` 对象可能包含方法和 Vite plugin，不能进入 resolved router config、routemap 或运行时 manifest。构建工具只校验必需字段和生命周期函数的类型，不实现版本协商。

包边界如下：

```text
@web-widget/vite-plugin
  └─ DeploymentIntegration 与生命周期编排

@web-widget/node
  ├─ . / ./adapter    NodeAdapter
  └─ ./deployment    node()

@web-widget/cloudflare
  ├─ ./adapter        createFetchHandler()
  └─ ./deployment     cloudflare()
```

`./adapter` 不得依赖 Vite、Wrangler 或其他构建工具。`./deployment` 只用于构建配置。

### 生命周期

`configure()` 在 Vite environment 最终确定前运行，可增加平台 Vite plugins、受限配置、虚拟入口、watch 文件和类型声明。

`adapt()` 在 server build、client build 和 server-assets 数据完成后运行。Builder 只暴露路由、资源清单和输出目录内的受限文件操作；必须拒绝绝对外部路径、`..` 和符号链接逃逸。

`emulate()` 为请求创建 `env` 和 `executionContext`。dev、preview 和 Vitest 必须提供等价的 context 形状和生命周期语义，但可以使用不同 emulator 实例。Cloudflare 委托官方 Vite plugin/workerd，Web Widget 不自行实现 Worker 模拟器。

配置项按所有权合并：

- **locked**：integration 决定，冲突时报错，例如 Cloudflare 必须使用 `webworker` target。
- **defaulted**：integration 提供默认值，用户可覆盖，例如 host/port 环境变量名。
- **merged**：按文档化顺序去重合并，例如 plugins 和 resolve conditions。
- **owned-by-user**：integration 只读取和验证，例如项目根目录中的 Wrangler 配置。

### Node

Node middleware 模式保留平台无关 server build，不启动端口也不服务静态文件。用户继续将 `NodeAdapter.middleware` 接入 Koa、Express 或现有 server。

Node standalone 模式生成可直接运行的 server：

```text
Node standalone entry
├── static asset handler
├── NodeAdapter
└── WebRouter
```

`NodeAdapter` 仍然只转换 Node HTTP 与 Fetch 协议；静态文件 handler 是 standalone entry 的独立组成部分，不依赖 Koa。

Vite 将 `public/` 和 client assets 输出到 `dist/client`，生产 server 不读取源码目录。请求先匹配 client output，静态 miss 后进入 Web Router。

静态文件 handler 必须：

- 阻止路径穿越、目录列表和越出 client output 的符号链接。
- 支持 `GET`、`HEAD`、MIME、ETag 或 `Last-Modified` 以及 `304`。
- 对 hashed assets 发送 immutable 长期缓存，对 public files 使用可重验证缓存。
- 选择已存在的 `.br`/`.gz` 文件并设置 `Vary: Accept-Encoding`。`assets.precompress: true` 表示构建时生成这些文件。
- 明确支持单区间 `Range`，或在首版明确拒绝并用测试固定行为。

`base` 是 URL mount point，必须在转换为磁盘路径前完成 pathname 匹配和规范化。

### Cloudflare

Cloudflare integration 必须：

- 使用 `webworker` target、Worker resolve conditions 和 ESM module Worker。
- 默认 `noExternal: true`，并拒绝最终 server graph 中未明确支持的 Node builtin。
- 使用官方 Cloudflare Vite plugin 和 workerd。
- 将 client output 指向 Workers Static Assets，读取和验证用户拥有的 Wrangler 配置，不覆盖项目根目录中的文件。

Cloudflare Runtime Adapter 保持为纯 bridge：

```ts
function createFetchHandler<E>(
  router: WebRouter<{ Bindings: E }>
): ExportedHandler<E>;
```

静态资源顺序交给 Workers Static Assets：

```ts
cloudflare({
  assets: {
    binding: 'ASSETS',
    runWorkerFirst: false
  }
});
```

`runWorkerFirst: false` 表示平台先匹配静态资源，命中时 Worker 不执行，miss 时才进入 Web Router。`true | string[]` 映射到 Cloudflare 同名配置。只有 worker-first 下的自定义逻辑需要显式调用 `env.ASSETS.fetch(request)`。

高级用户可以通过 `entry: false` 关闭入口生成，然后直接使用 `createFetchHandler()` 或 `router.handler()`。

### 验证、兼容与测试

首版只验证能从最终配置或 module graph 证明的事实：

- Node/Cloudflare target 与最终 Vite 配置一致。
- Worker server graph 不含不支持的 Node builtin。
- 需要自定义 assets binding 时，binding 存在且名称匹配。
- platform config 可解析，deployment entry 没有重复生成。

错误必须包含 integration 名称、不兼容来源、检测到的事实和可行动替代方案。不用单一 capability 枚举对 streaming、filesystem 或 instrumentation 做无法证明的承诺。

未配置 deployment 的项目和现有 `NodeAdapter.handler`/`middleware` API 保持兼容。Node integration 默认使用 `middleware` 模式，新项目模板可以显式选择 `standalone`。

每个平台实现需要覆盖：

- integration 元数据、配置所有权和生命周期的契约测试。
- 入口、目录、assets rules 和禁止依赖的产物测试。
- Node 与 workerd 真实请求的运行时测试。
- 真实官方 CLI/runtime 的 production smoke test。

## 参考

### Web Widget

- [UI adapter metadata](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/react/package.json)
- [Vite plugin 解析 `./adapter`](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/vite-plugin/src/widget/adapter.ts)
- [`WebRouter.handler()`](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/web-router/src/application.ts)
- [Node request/response bridge](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/node/src/adapter.ts)
- [元框架多运行时支持调研](./references/meta-framework-multi-runtime-research.md)

### 其他框架与平台

- [SvelteKit adapter build contract](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/kit/src/core/adapt/index.js)
- [SvelteKit Node adapter](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/adapter-node/index.js)
- [Astro adapter capability contract](https://github.com/withastro/astro/blob/79aa99c648b4b40b95a31d4a961b77074cf7963c/packages/astro/src/types/public/integrations.ts)
- [React Router Cloudflare bridge](https://github.com/remix-run/react-router/blob/182479060d9419839e538edac7afe64651513d05/packages/react-router-cloudflare/worker.ts)
- [Remix v3 package boundaries](https://github.com/remix-run/remix)
- [Remix v3 Node Fetch server](https://github.com/remix-run/remix/tree/main/packages/node-fetch-server)
- [Remix v3 Files and Assets](https://guides.remix.run/files-and-assets/)
- [Cloudflare Workers Static Assets routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
