# RFC：跨平台部署与运行时适配

状态：草案

## 摘要

Web Widget 的服务端核心已经以 Web 标准 `Request`、`Response`、`Headers`、`URL` 和 Stream 为主要协议，`WebRouter.handler(request, env, executionContext)` 也能接收 Node 环境变量或 Cloudflare bindings。然而，用户仍需自行配置 Vite SSR target、resolve conditions、平台入口、静态资源服务和部署文件。当前 Node 示例还需要手写 Koa server；Cloudflare 则缺少与 Wrangler、Workers Static Assets 和本地 workerd 模拟集成的一等入口。

本 RFC 提议引入 **Deployment Integration（部署集成）** 协议，并首先提供 Node 与 Cloudflare 两个官方实现。部署集成属于构建期；平台请求与 Web Router 之间的运行时代码继续使用项目已有的 **Adapter（适配器）** 语义：

```ts
// vite.config.ts - Node
import { defineConfig } from 'vite';
import { webRouterPlugin } from '@web-widget/vite-plugin';
import { node } from '@web-widget/node/deployment';

export default defineConfig({
  plugins: [
    webRouterPlugin({
      deployment: node({ mode: 'standalone' })
    })
  ]
});
```

```ts
// vite.config.ts - Cloudflare Workers
import { defineConfig } from 'vite';
import { webRouterPlugin } from '@web-widget/vite-plugin';
import { cloudflare } from '@web-widget/cloudflare/deployment';

export default defineConfig({
  plugins: [
    webRouterPlugin({
      deployment: cloudflare()
    })
  ]
});
```

应用 route、middleware、action 和 Widget 代码不因平台改变。Deployment Integration 负责选择 server target、组织静态资源、提供开发模拟和验证能力兼容性；生成的平台入口通过 `./adapter` 运行时子路径完成宿主协议转换。

## 背景与问题

当前代码已具备跨平台内核的主要条件：

- `WebRouter.handler()` 接收标准 `Request`，返回标准 `Response`；第二、第三参数分别承载 bindings 与 execution context。
- server build 默认使用 `webworker` target，并为 Worker 环境调整 resolve conditions。
- server assets 虚拟模块通过 `import.meta.url` 与动态 ESM import 查表，不依赖 `node:fs`、`node:path` 或 `node:url`。
- Vitest 会根据 server target 选择 Node 或 edge runtime 环境。
- `@web-widget/node` 已能在 Node HTTP 与 Web Fetch 协议之间转换。

但这些能力尚未形成用户可理解的部署产品：

1. 用户必须知道 `ssr.target`、resolve conditions 和 external 的内部约束。
2. Node 用户需要手写 server、静态文件 middleware、host/port 和进程环境读取。
3. Cloudflare 用户需要自行创建 Worker 入口、传递 `env`/`ctx`、配置 assets binding，并协调 Cloudflare Vite plugin。
4. 构建系统无法在构建前判断 Node-only import、filesystem、streaming 或 bindings 是否与目标平台兼容。
5. “UI 框架 adapter”与“部署 adapter”没有名称和职责上的明确区分。

这不是路由运行时缺少另一个抽象，而是统一 server build 到具体宿主之间缺少稳定边界。

## 调研结论

主流元框架将平台选择放在构建/部署边界，而不是业务路由中：

- SvelteKit 把统一 `Builder` 交给 Node 或 Cloudflare adapter；adapter 生成平台入口与部署文件。
- Astro adapter 同时声明 server entrypoint、build output 与能力支持，框架在构建期验证组合。
- Nuxt 将目标矩阵下沉给 Nitro preset。
- Qwik 通过脚手架生成平台 Vite config 与可编辑入口。
- React Router 保持共享 request handler，只在平台 package 中实现很薄的 bridge。

Web Widget 适合采用 SvelteKit/Astro 的显式 adapter 体验，并保留 React Router 式的低层 bridge。完整调研见 [元框架多运行时支持调研](./references/meta-framework-multi-runtime-research.md)。

## 目标

- 用户通过一个显式配置选择 Node 或 Cloudflare，不需要手写默认平台入口。
- route、middleware、action、SSR renderer 与 Widget 模块保持平台无关。
- 将 Vite server target、resolve conditions、external/noExternal 等策略收归 adapter。
- 生成可直接运行或部署的入口，并正确处理 client assets 与 SSR fallback。
- 将 Node 环境变量和 Cloudflare bindings 映射到现有 `context.env`。
- 将 Node execution context 和 Cloudflare `ctx` 映射到现有 `context.executionContext`。
- 在构建期声明并验证平台能力，尽早报告不兼容组合。
- dev、test、preview、build 对平台上下文保持一致。
- 允许第三方实现新的 deployment integration 与 runtime adapter，而无需修改 Web Router 内核。

## 非目标

- 不统一所有云厂商的配置格式或资源模型。
- 不在首版实现 Vercel、Netlify、Deno、Bun 或 AWS adapter。
- 不让普通业务代码直接依赖 Wrangler、Miniflare 或 Node HTTP 对象。
- 不替换 Vite Environment API 或实现平行构建系统。
- 不重新设计 `WebRouter.handler()`、route context 或 bindings 泛型。
- 不在首版根据 CI 环境变量自动选择平台。
- 不保证所有 npm 包都能在 Worker 中运行；deployment integration 只负责检测和给出诊断。
- 不移除 `@web-widget/node` 现有 middleware/handler API。

## 术语与命名

| 名称 | 含义 |
| --- | --- |
| `WebWidgetAdapter` | 现有 UI 框架转换协议；其 `./adapter` 是条件导出的运行时渲染与容器入口 |
| `RuntimeAdapter` | 本 RFC 沿用的运行时概念，负责 Node HTTP 或 Worker fetch 与 `WebRouter.handler()` 之间的协议转换 |
| `DeploymentIntegration` | 本 RFC 新增的构建期协议，负责 Vite 配置、模拟环境、能力验证和平台产物 |
| `Server Build` | 平台无关的 Web Router ESM 产物，默认导出 `WebRouter` |
| `Deployment Entry` | integration 生成的平台入口；它导入对应 `./adapter`，例如 Node standalone server 或 Worker `fetch` export |
| `Bindings` | 请求级可用的平台资源；Node 默认为环境变量，Cloudflare 为 Worker `env` |
| `Execution Context` | `waitUntil`、`passThroughOnException` 等请求生命周期能力 |

`adapter` 在本项目中专指会进入最终 bundle 的运行时适配模块。公开 API、错误消息和文档必须使用完整名称 `DeploymentIntegration` 描述构建期对象，不得将 `configure()`、`emulate()` 或 `adapt()` 的实现称为 adapter。

## 用户接入

### Node standalone

```ts
import { node } from '@web-widget/node/deployment';

webRouterPlugin({
  deployment: node({
    mode: 'standalone',
    hostEnv: 'HOST',
    portEnv: 'PORT',
    assets: { precompress: true }
  })
});
```

`vite build` 产出可执行 server。启动命令只需：

```bash
node dist/index.js
```

server 先服务 `dist/client` 中的静态资源，未命中时调用 Web Router。默认读取 `HOST`、`PORT` 和 `process.env`，并支持 `base`、HEAD、streaming response、HTTP/1.1 与 HTTP/2 兼容行为。

### Node middleware/library

```ts
webRouterPlugin({
  deployment: node({ mode: 'middleware' })
});
```

该模式保留平台无关 server build，不启动端口。用户继续使用 `@web-widget/node` 的 `NodeAdapter` 接入 Koa、Express、原生 HTTP 或已有 server：

```ts
import NodeAdapter from '@web-widget/node';
import router from './dist/server/index.js';

const middleware = new NodeAdapter(router, {
  defaultOrigin: 'https://example.com'
}).middleware;
```

首版默认 `mode` 为 `middleware`，避免现有项目升级后意外多出 server 入口；新的项目模板使用 `standalone`。

### Cloudflare Workers

```ts
import { cloudflare } from '@web-widget/cloudflare/deployment';

webRouterPlugin({
  deployment: cloudflare({
    configPath: 'wrangler.jsonc',
    assets: {
      binding: 'ASSETS',
      strategy: 'asset-first'
    }
  })
});
```

integration 生成 module Worker 入口；入口本身只组合 server build 与运行时 adapter：

```ts
import { createFetchHandler } from '@web-widget/cloudflare/adapter';
import router from './server/index.js';

export default createFetchHandler(router);
```

`asset-first` 仅对 `GET`/`HEAD` 请求查询 assets binding；2xx/3xx 静态响应直接返回，404/405 再进入 Web Router。`worker-first` 则由 Worker route 处理所有请求，应用可显式读取 `env.ASSETS`。具体行为必须稳定，不得以异常捕获作为正常的静态资源 miss 分支。

Cloudflare deployment integration 使用官方 Cloudflare Vite plugin 提供 workerd runtime、bindings、remote bindings 与本地持久化；Web Widget 不自行实现 Worker 模拟器。

### 自定义 Worker 入口

高级用户可以关闭入口生成：

```ts
webRouterPlugin({
  deployment: cloudflare({ entry: false })
});
```

然后直接导入 server build，并使用 `@web-widget/cloudflare/adapter` 创建 handler；也可以在完全自定义的宿主中直接调用 `router.handler(request, env, ctx)`。deployment integration 仍负责 Worker target、构建条件、测试环境和能力验证。

## 运行时 Adapter

运行时 adapter 延续 UI 框架包的 `./adapter` 子路径语义：它是最终 server/Worker bundle 的一部分，不导入 Vite，不读取构建配置，也不生成文件。

Node 已有 `NodeAdapter` 属于这一层。`@web-widget/node/adapter` 将作为根导出的等价子路径加入，现有 `import NodeAdapter from '@web-widget/node'` 保持兼容。Cloudflare 提供：

```ts
import type WebRouter from '@web-widget/web-router';

interface CloudflareAdapterOptions {
  assets?: {
    binding?: string;
    strategy?: 'asset-first' | 'worker-first';
  };
}

function createFetchHandler<E>(
  router: WebRouter<{ Bindings: E }>,
  options?: CloudflareAdapterOptions
): ExportedHandler<E>;
```

Node 和 Cloudflare adapter 不强制实现一个虚假的共同类接口：Node 需要暴露 `handler`/`middleware` 并转换 `IncomingMessage`，Cloudflare 需要生成 `ExportedHandler` 并处理 assets binding。它们共享的协议是内部都必须把请求映射到：

```ts
router.handler(request, bindings, executionContext)
```

条件导出也不负责在 Node 与 Cloudflare 之间做选择。UI adapter 的 `worker`/`browser` conditions 表示同一组件在 server/client 两个运行阶段的实现；部署平台是一次显式构建决策，由 `deployment` 配置决定。

## Deployment Integration v1 协议

协议由 `@web-widget/vite-plugin` 导出。第三方 integration 必须通过 `./deployment` 工厂函数返回对象，用户不直接调用生命周期方法。

```ts
interface DeploymentIntegrationV1<Options = unknown> {
  readonly apiVersion: 1;
  readonly name: string;
  readonly options: Readonly<Options>;
  readonly server: DeploymentServerConfig;
  readonly capabilities: DeploymentCapabilities;

  configure?(context: DeploymentConfigureContext):
    | DeploymentConfiguration
    | Promise<DeploymentConfiguration>;

  emulate?(context: DeploymentEmulationContext):
    | DeploymentEmulator
    | Promise<DeploymentEmulator>;

  adapt?(builder: DeploymentBuilder): void | Promise<void>;
}

interface DeploymentServerConfig {
  target: 'node' | 'webworker';
  resolveConditions?: string[];
  noExternal?: boolean | string[];
  external?: string[];
}

interface DeploymentCapabilities {
  runtime: 'node' | 'workerd' | string;
  streaming: 'supported' | 'limited' | 'unsupported';
  filesystem: 'read-write' | 'read-only' | 'unsupported';
  staticAssets: 'filesystem' | 'binding' | 'external';
  backgroundTasks: boolean;
  nodeBuiltins: boolean;
  serverInstrumentation: boolean;
}
```

`apiVersion` 是协议兼容边界。未知版本必须报错，不能按结构猜测。`name` 进入构建日志、诊断和产物 metadata。`options` 只用于诊断，框架不得读取 integration 私有字段。

`deployment` 是构建期 integration 对象，可能包含方法和第三方插件实例，不属于 Web Router 的可序列化领域配置。`createRouterPlugins()` 必须在调用现有 `parseWebRouterConfig()` 之前提取并校验它，只把其余 route、input、output 等字段交给 Zod schema。resolved router config、routemap 和运行时 manifest 都不得包含 integration 实例。

### 配置阶段

`configure()` 在 Vite 环境最终确定前运行，可返回：

- integration 私有 Vite plugins；
- server/client environment 的受限增量配置；
- deployment entry 的虚拟模块或源码入口；
- 需要 watch 的平台配置文件；
- integration 产生的类型声明。

integration 不得覆盖 Web Router 的 routemap、server assets 虚拟模块、构建顺序或用户 entry。发生冲突时应按“用户显式配置 > deployment integration > Web Router 通用默认值”合并；但会破坏平台正确性的配置必须报错，而不是静默覆盖。例如 Cloudflare integration 不能接受最终 `ssr.target === 'node'`。

### 构建产物阶段

`adapt(builder)` 在 server、client 和通用 server-assets 数据全部生成后执行。`DeploymentBuilder` 暴露稳定、受限的产物 API：

```ts
interface DeploymentBuilder {
  readonly integration: string;
  readonly root: string;
  readonly base: string;
  readonly mode: string;
  readonly paths: {
    out: string;
    client: string;
    server: string;
    serverEntry: string;
    clientManifest?: string;
  };
  readonly routes: readonly DeploymentRoute[];
  readonly assets: readonly DeploymentAsset[];

  mkdir(path: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  write(path: string, contents: string | Uint8Array): Promise<void>;
  generateEntry(options: GenerateEntryOptions): Promise<string>;
}
```

integration 不接收 Vite 内部 `RouterPluginHost`，也不能修改已经完成的 route/client module graph。这样第三方 integration 依赖公开 build contract，而不是绑定插件内部状态。

`mkdir`、`copy`、`write` 和 `generateEntry` 只允许写入 `paths.out` 内部。包含 `..`、符号链接逃逸或绝对外部目标的写入必须拒绝，防止第三方 integration 越过构建输出边界。

### 开发与预览阶段

`emulate()` 返回平台上下文工厂和清理函数：

```ts
interface DeploymentEmulator<E = unknown> {
  createRequestContext(request: Request): Promise<{
    env: E;
    executionContext: ExecutionContext;
  }>;
  close(): void | Promise<void>;
}
```

Vite dev、preview 和 Vitest 使用同一个 emulator。Cloudflare integration 委托官方 plugin/workerd；Node integration 返回 `process.env` 和 Node execution context。一次进程只创建一个 emulator，热更新不得泄漏代理或监听端口。

## 平台无关运行时契约

跨平台的稳定边界继续是：

```ts
router.handler(request, bindings, executionContext): Response | Promise<Response>
```

平台映射如下：

| Web Router 参数 | Node | Cloudflare |
| --- | --- | --- |
| `request` | 由 `IncomingMessage` 转换的 Web `Request` | Worker 原生 `Request` |
| `bindings` / `context.env` | `process.env`，或用户自定义对象 | Worker `env` bindings |
| `executionContext` | 提供兼容 `waitUntil` 的 Node context | Worker `ctx` |
| response | 转换回 `ServerResponse` | Worker 原生 `Response` |

route 不应 import `@web-widget/node` 或 `@cloudflare/workers-types` 才能完成普通请求处理。使用平台能力时，通过 `Env` 泛型声明 bindings：

```ts
interface CloudflareBindings {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS: Fetcher;
}

type AppEnv = { Bindings: CloudflareBindings };
```

平台类型属于应用或 deployment package，不进入 `@web-widget/schema` 的通用协议。

## 构建策略

### 通用构建保持不变

Web Router 继续先构建 server，再构建 client，最后生成 `.server-assets.js`。deployment integration 只能在通用 build 完成后包装产物，不能让 route transform 直接感知目标 provider。

通用 server build 继续默认导出 `WebRouter`。这是可测试、可嵌入的 library boundary，也是 custom server/Worker 的低层入口。

### Node 策略

- `server.target = 'node'`。
- resolve conditions 至少包含 `node`、`import`、`module`、`default`。
- Node builtins 可 external；production dependencies 的 external 策略由 Node integration 明确生成。
- standalone entry 负责静态文件、origin、host/port、graceful shutdown 和 Web Router bridge。
- 不把 devDependencies 偶然留给生产环境解析；integration 必须对 external 清单给出可复现策略。

### Cloudflare 策略

- `server.target = 'webworker'`。
- conditions 优先 `worklet`、`worker`，且不得回落到浏览器 DOM 实现。
- server bundle 默认 `noExternal: true`，避免部署时残留无法解析的 npm dependency。
- Node builtins 在 module graph 中视为错误；只有框架明确提供的 compile-time shim 可例外。
- 输出 ESM module Worker，不支持 Service Worker 旧格式。
- Wrangler 配置是用户所有的输入。integration 可验证和读取，不得覆盖用户已有文件。
- 当配置缺失时可生成带注释的建议文件到 build 输出，但不得修改项目根目录。

`node:async_hooks` 是当前已知特殊项。若 `asyncContext.enabled` 为 `false`，构建工具可以用无状态 shim 移除它；若为 `true`，Cloudflare integration 必须证明目标 compatibility flags/runtime 提供兼容实现，否则构建失败。不得让 Node builtin 以 external 形式进入 Worker 产物。

## 能力声明与验证

框架与功能提供者可声明需求：

```ts
interface DeploymentRequirements {
  streaming?: boolean;
  filesystem?: 'read' | 'write';
  backgroundTasks?: boolean;
  nodeBuiltins?: string[];
  bindings?: string[];
}
```

构建前汇总 route/module resource、renderer、插件和用户配置的需求，与 integration capabilities 比较。错误必须包含：integration 名称、需求来源、缺失能力和可行动替代方案。

示例：

```text
@web-widget/cloudflare: route "reports/export@route.ts" imports "node:fs".
The cloudflare deployment does not support Node built-ins.
Move filesystem access behind a binding or select node().
```

首阶段至少验证：

- Worker server graph 不含 Node builtins；
- Node/Cloudflare target 与最终 Vite config 一致；
- Cloudflare assets binding 存在且名称匹配；
- deployment entry 只生成一个；
- streaming 与 instrumentation 的显式不兼容；
- 必需的 platform config 可解析。

## 静态资源与路由

client build 是静态资源的唯一来源。deployment integration 不重新构建 client graph，只消费通用 manifest 与 asset 清单。

Node standalone 直接从 client output 服务文件，必须：

- 阻止路径穿越与目录列表；
- 对 hashed immutable assets 发送长期缓存头；
- 正确选择 `.br`/`.gz` 预压缩文件并设置 `Vary: Accept-Encoding`；
- 对未命中资源进入 SSR，而不是固定返回静态 404。

Cloudflare integration 将 client output 指向 Workers Static Assets，并生成或校验 binding/route 配置。`base` 不为 `/` 时，磁盘路径与请求 URL 必须保持一致。headers、redirects 和 Worker invocation rules 属于 deployment integration 产物，不能由 route renderer 隐式写入。

## 配置确定性

首版只支持显式 `deployment`。未设置时保留现有行为，并打印一次迁移提示；框架不得读取 `CF_PAGES`、`VERCEL` 等变量猜测目标。

未来可增加 `deployment: auto()`，但必须满足：

- 构建日志打印最终 integration 与判定依据；
- 用户可显式覆盖；
- 无唯一结果时失败；
- 相同输入与环境产生相同产物；
- `auto()` 只是 integration 选择器，不进入业务运行时。

## 错误处理与可观测性

integration 生命周期错误统一添加 `[deployment:<name>]` 前缀。构建日志至少输出：

```text
deployment: @web-widget/cloudflare
runtime: workerd
server target: webworker
entry: dist/worker.js
assets: dist/client -> binding ASSETS
```

生产入口不得把 stack trace 直接返回客户端。Node 与 Cloudflare runtime adapter 都应把未处理错误交给 Web Router 的 error pipeline；只有入口初始化失败才由宿主 bridge 生成通用 500。

integration 应允许接入 instrumentation，但 capability 为 `false` 时构建必须失败，不能静默丢弃用户 instrumentation。

## 包结构

```text
@web-widget/vite-plugin
  └─ DeploymentIntegrationV1 类型、验证、生命周期编排

@web-widget/node
  ├─ .                 现有 NodeAdapter 根导出（兼容入口）
  ├─ ./adapter         NodeAdapter runtime bridge（规范入口）
  └─ ./deployment      node() deployment integration

@web-widget/cloudflare
  ├─ .                 Worker bindings/context 类型
  ├─ ./adapter         createFetchHandler() runtime bridge
  └─ ./deployment      cloudflare() deployment integration
```

`./deployment` 子路径只能在构建配置中导入，可以依赖 Vite、Wrangler 和 provider 构建工具；`./adapter` 子路径会进入生产 bundle，禁止依赖 Vite 或构建工具。Cloudflare runtime adapter 不得被 Node integration 依赖，Node runtime adapter 不得进入 Worker bundle。

这一结构复用 UI 框架包的核心原则：构建工具负责发现和注入，`./adapter` 负责运行时。但 deployment options 具有 provider 特定类型，首版仍使用显式 `./deployment` 工厂，不复制 `webWidgetAdapter` 的 package metadata 自动发现。若未来引入 `webWidgetDeployment` metadata，它也只能声明 `integration: './deployment'` 与 `adapter: './adapter'` 的对应关系，不能把两者合并为同一模块。

## 向后兼容与迁移

### 第一阶段：协议与显式 integration

- 增加 `deployment` 配置和 v1 协议。
- 实现 Node `middleware` integration，只表达现有行为，不改变输出。
- 为 Node 增加 `./adapter` 兼容子路径。
- 实现 Cloudflare runtime adapter、deployment integration、Worker entry 与基础 assets binding。
- 未配置 deployment 的项目保持当前 `ssr.target` 逻辑。

### 第二阶段：完整用户体验

- 增加 Node standalone entry、静态资源和优雅退出。
- dev/preview/test 统一使用 integration emulator。
- 新建 Node 与 Cloudflare 官方 examples。
- CLI/template 要求用户显式选择部署目标。

### 第三阶段：能力与生态

- 开放第三方 integration contract；runtime adapter 保持宿主专用 API。
- 接入模块资源能力声明。
- 评估 `auto()`，但不作为默认值。
- 根据实际需求扩展其他平台。

现有如下用法继续工作：

```ts
new NodeAdapter(router, { defaultOrigin }).middleware;
new NodeAdapter(router, { defaultOrigin }).handler;
router.handler(request, env, executionContext);
```

`@web-widget/node` 默认导出在本 RFC 中不改变。

## 测试策略

每个平台实现需要同时测试 deployment integration 与 runtime adapter：

1. **契约测试**：integration metadata、配置合并、能力验证和生命周期顺序。
2. **产物测试**：入口 export、目录、manifest、assets rules 和禁止依赖的快照/语义断言。
3. **运行时测试**：真实 Node server 与 workerd 请求，覆盖 request body、streaming、cookies、redirect、HEAD、error 和 `waitUntil`。
4. **部署 smoke**：使用官方 CLI 在隔离 fixture 中执行 dry-run 或本地启动；Cloudflare 使用官方 Vite plugin/workerd，不以 Node mock 代替。

必测矩阵：

| 场景 | Node middleware | Node standalone | Cloudflare |
| --- | --- | --- | --- |
| SSR route | 是 | 是 | 是 |
| client hashed assets | 宿主负责 | 是 | 是 |
| streaming response | 是 | 是 | 是 |
| bindings/env | `process.env`/自定义 | `process.env` | Worker bindings |
| `waitUntil` | 是 | 是 | 是 |
| base path | 是 | 是 | 是 |
| static miss -> SSR | 宿主负责 | 是 | 是 |
| Node builtin 诊断 | 不适用 | 不适用 | 是 |
| dev/HMR | 是 | 是 | 是 |
| production smoke | 是 | 是 | 是 |

测试必须检查最终 bundle 中不存在意外的 `node:` import、Cloudflare entry 不引用 Vite/Node runtime、Node standalone 不引用 Wrangler，以及 emulator 在关闭后不残留端口和后台任务。

## 被否决的方案

### 在业务代码中动态判断平台

```ts
if (typeof process !== 'undefined') {
  // Node
} else {
  // Worker
}
```

这无法解决静态 import 的 Node builtin、bundle conditions、平台入口和静态资源产物，而且会把平台分支扩散到 route。否决。

### 只提供 `ssr.target`

Vite target 只决定 bundle 语义，不能生成 server、Worker entry、assets rules、bindings、preview 或部署诊断。当前问题正是 target 已存在但用户接入仍不完整。否决。

### 首版采用 preset 字符串

`deployment: 'cloudflare'` 简洁，但无法类型化平台 options，也迫使核心维护所有 provider 注册表。工厂函数允许 package 自治和 tree-shaking，更符合现有插件生态。首版否决；未来可在 CLI 上提供字符串交互，再生成显式工厂配置。

### 只提供脚手架文件

生成 Worker/server 入口易于理解，但 target、capabilities、dev emulator 和产物规则仍会漂移。自定义入口应作为高级扩展点，而不是唯一接入模式。否决。

### 让 Cloudflare integration 自行实现模拟器

这会重复 workerd、bindings、compatibility flags 和 Wrangler 配置语义。应使用 Cloudflare 官方 Vite plugin。否决。

## 实施待办

- [ ] **T01：定义 Deployment Integration v1 类型与校验。** 验收：未知版本、重复 entry、错误 target 和配置冲突有确定诊断。
- [ ] **T02：把 deployment 生命周期接入 `webRouterPlugin`。** 验收：configure 在环境配置前执行，adapt 在通用 server-assets 完成后执行，插件内部状态不泄漏给 integration。
- [ ] **T03：实现 Node middleware integration。** 验收：未改变现有 server build 与 `NodeAdapter` 行为，显式配置可取代手写 `ssr.target`。
- [ ] **T04：实现 Node standalone integration。** 验收：`node dist/index.js` 可服务 hashed assets、SSR、HEAD 与 streaming，并支持优雅退出。
- [ ] **T05：建立 runtime adapter 子路径。** 验收：`@web-widget/node/adapter` 与现有根导出等价；`@web-widget/cloudflare/adapter` 不依赖 Vite、Wrangler 或 Node runtime。
- [ ] **T06：建立 deployment integration 子路径。** 验收：`@web-widget/node/deployment` 与 `@web-widget/cloudflare/deployment` 返回 `DeploymentIntegrationV1`，后者封装官方 Cloudflare Vite plugin。
- [ ] **T07：实现 Cloudflare Worker entry 与 assets。** 验收：生成入口从 `@web-widget/cloudflare/adapter` 创建 handler；workerd 中 SSR、bindings、`waitUntil`、static hit/miss 和 base path 正确。
- [ ] **T08：实现 capability 验证。** 验收：Worker bundle 的 Node builtin、缺失 binding 和不支持特性在构建前失败。
- [ ] **T09：统一 dev、preview 与 Vitest emulator。** 验收：三者获得相同 bindings/context shape，关闭后无资源泄漏。
- [ ] **T10：增加 Node/Cloudflare examples 与文档。** 验收：从空安装到本地运行及生产构建只有一个平台选择步骤。
- [ ] **T11：增加真实运行时 CI。** 验收：Node 与 workerd production smoke 成为 required check，并检查最终 bundle 依赖边界。

## 参考

### Web Widget 当前实现

- [UI adapter 的运行时条件导出与 `webWidgetAdapter` metadata](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/react/package.json)
- [构建工具读取 metadata 并解析 `./adapter` 运行时入口](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/vite-plugin/src/widget/adapter.ts)
- [`WebRouter.handler()` 的跨平台签名](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/web-router/src/application.ts)
- [Web Router bindings 与 execution context 类型](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/web-router/src/types.ts)
- [Vite server target 与 Worker resolve conditions](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/vite-plugin/src/router/index.ts)
- [平台无关 server assets 虚拟模块](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/vite-plugin/src/router/server-assets-plugin.ts)
- [现有 Node request/response bridge](https://github.com/web-widget/web-widget/blob/295be4b7c75bf40aab5b6567c43bc783e7ffaf95/packages/node/src/adapter.ts)

### 元框架实现

- [SvelteKit adapter build contract](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/kit/src/core/adapt/index.js)
- [SvelteKit Node adapter](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/adapter-node/index.js)
- [SvelteKit Cloudflare adapter](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/adapter-cloudflare/index.js)
- [Astro adapter capability contract](https://github.com/withastro/astro/blob/79aa99c648b4b40b95a31d4a961b77074cf7963c/packages/astro/src/types/public/integrations.ts)
- [Astro adapter validation](https://github.com/withastro/astro/blob/79aa99c648b4b40b95a31d4a961b77074cf7963c/packages/astro/src/core/dev/adapter-validation.ts)
- [Astro Cloudflare integration](https://github.com/withastro/astro/blob/79aa99c648b4b40b95a31d4a961b77074cf7963c/packages/integrations/cloudflare/src/index.ts)
- [Nuxt deployment preset interface](https://github.com/nuxt/nuxt/blob/369a6c64f47095a04e1ba63821088751ff27fe19/docs/1.getting-started/16.deployment.md)
- [Qwik Cloudflare Pages Vite adapter](https://github.com/QwikDev/qwik/blob/c59a430cb87c98a13ec0c8f2a3bc6369fe16f55f/packages/qwik-city/src/adapters/cloudflare-pages/vite/index.ts)
- [React Router Cloudflare bridge](https://github.com/remix-run/react-router/blob/182479060d9419839e538edac7afe64651513d05/packages/react-router-cloudflare/worker.ts)
