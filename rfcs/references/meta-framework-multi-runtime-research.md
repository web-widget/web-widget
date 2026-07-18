# 元框架多运行时支持调研

调研日期：2026-07-18

## 结论摘要

成熟的元框架通常不在业务路由层分叉 Node 与 Cloudflare。它们将共享部分收敛为 Web 标准的 `Request`、`Response`、`Headers`、`URL` 和流；将运行时差异推迟到构建/部署边界。差异实现通常包括：

1. **构建 adapter**：读取统一的构建产物和 manifest，改写为目标平台所需的入口、目录、静态资源规则和打包条件。
2. **运行时 bridge**：把平台事件（例如 Cloudflare `EventContext`）转换为统一请求处理器的输入，并将 bindings、`waitUntil`、缓存等能力通过显式 context 注入。
3. **能力声明与验证**：adapter 必须声明支持的输出形态和特性，框架在构建时阻止不兼容组合，而不是让部署后才失败。
4. **目标选择**：小型框架直接选 adapter；Nuxt/Nitro 采用 string preset；React Router 将少量运行时专属 API 放到独立 package。

这使应用的 loader/action/route handler 保持可移植，同时允许部署层利用 Node 文件系统、Cloudflare assets binding、KV、路由清单等原生能力。

## 对比

| 框架 | 选择机制 | 共享内核 | Node 侧实现 | Cloudflare 侧实现 |
| --- | --- | --- | --- | --- |
| SvelteKit | `kit.adapter` | `Builder`、server manifest、prerender 结果 | Rollup 生成 ESM server 和 Node entrypoints | 生成 Worker、`_routes.json`、`_headers`、`_redirects`，读取 Wrangler 配置 |
| Astro | 集成调用 `setAdapter()` | Astro SSR 输出、hooks、route/header 元数据 | adapter 声明 `serverEntrypoint` 和 Node preview entrypoint | 集成 Cloudflare Vite plugin，并保留 Worker 所需 client/server 目录 |
| Nuxt | `nitro.preset` 或 `NITRO_PRESET` | Nuxt 应用与 Nitro/H3 server API | `node-server` preset | 由 Nitro provider preset 选择目标（Nuxt 仓库不内嵌具体 preset） |
| Qwik City | Vite adapter | `viteAdapter()` 和 route/SSG 选项 | Node 静态生成器使用 `worker_threads` | Vite 设为 `webworker` target，并输出 Pages 约定文件 |
| React Router | 平台 package | `createReactRouterRequestHandler(build, mode)` | `react-router-node` 提供 stream、文件 session、Node listener | `react-router-cloudflare` 把 Pages context 转成 `loadContext` |

## 1. SvelteKit：显式 builder 契约 + 目标 adapter

SvelteKit 核心在 `adapt()` 中构造一个 `Builder`，其中包含路由、prerender 结果、server metadata、写入 client/server 文件、生成 manifest、压缩文件和日志等能力，然后只调用用户配置的 `adapter.adapt(builder)`。核心无需知晓目标是 Node 还是 Cloudflare。

Node adapter 的职责是复制 client/prerender 文件、可选压缩，并用 Rollup 打包 Node entrypoint。它设置 `nodeResolve({ preferBuiltins: true, exportConditions: ['node'] })`，且保留 production dependencies 为 external。这是将 Node 内建模块和部署依赖留在 Node 环境的明确边界。

Cloudflare adapter 则读取 Wrangler 配置，写入 Worker 入口和 manifest，把静态文件放进 assets 目录，并针对 Pages 生成 `_routes.json`；还产生 `_headers`、`_redirects` 或 `.assetsignore`。它通过 Wrangler 的 `getPlatformProxy()` 在本地开发模拟 `env`、`ctx`、`caches` 和 `cf`，使开发与部署的 platform context 形状一致。

`adapter-auto` 是一个保守的便利层：根据 `CF_PAGES`、`VERCEL`、`NETLIFY`、`GCP_BUILDPACKS` 等构建环境变量选择并安装相应 adapter。它没有试图把运行时自动检测带到业务代码。

关键源码：

- [SvelteKit `adapt/index.js`](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/kit/src/core/adapt/index.js)：创建并交付 `Builder`。
- [SvelteKit `adapter-node/index.js`](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/adapter-node/index.js)：Node Rollup、入口替换和能力声明。
- [SvelteKit `adapter-cloudflare/index.js`](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/adapter-cloudflare/index.js)：Wrangler 解析、Worker/静态资源产物和本地平台模拟。
- [SvelteKit `adapter-auto/adapters.js`](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/adapter-auto/adapters.js)：CI/build 环境到 adapter 的映射。

## 2. Astro：adapter metadata 参与框架决策

Astro 的 `AstroAdapter` 是声明式契约，而不只是一个 build callback。其 metadata 包括唯一名称、preview/server entrypoint、adapter features、支持的 Astro 特性和可选 client 配置。`adapterFeatures` 可要求 `static` 或 `server` 输出、选择 `classic`/`edge` middleware，并要求保留特定 client/server 目录结构。

框架在 `validateSetAdapter()` 中拒绝多个 deployment integration 或 server 输出与 static-only adapter 的组合。支持矩阵因此成为构建期约束。

Node integration 在 `astro:config:done` 调用 `setAdapter(getAdapter(...))`，声明 Node server entrypoint 和 preview entrypoint，并在 config hook 安装 Node 专用 Vite 配置及默认 filesystem session driver。Cloudflare integration 在相同 hook 中设置 adapter metadata、注入 Cloudflare 类型、将带 base path 的 client 输出嵌套到对应目录，并使用 Cloudflare Vite plugin；它还显式保留 client/server 构建目录，适应 Worker assets binding 对磁盘 URL 的解析。

关键源码：

- [Astro `integrations.ts`](https://github.com/withastro/astro/blob/79aa99c648b4b40b95a31d4a961b77074cf7963c/packages/astro/src/types/public/integrations.ts)：`AstroAdapter`、features 与 capability 类型。
- [Astro `adapter-validation.ts`](https://github.com/withastro/astro/blob/79aa99c648b4b40b95a31d4a961b77074cf7963c/packages/astro/src/core/dev/adapter-validation.ts)：适配器冲突和 output 不兼容检查。
- [Astro Node adapter](https://github.com/withastro/astro/blob/79aa99c648b4b40b95a31d4a961b77074cf7963c/packages/integrations/node/src/index.ts)：Node adapter 注册及配置。
- [Astro Cloudflare adapter](https://github.com/withastro/astro/blob/79aa99c648b4b40b95a31d4a961b77074cf7963c/packages/integrations/cloudflare/src/index.ts)：Cloudflare adapter 注册、Vite/类型/目录处理。

## 3. Nuxt：将目标矩阵下沉给 Nitro preset

Nuxt 对外暴露的是 `nitro` 配置，而不是要求每个 Nuxt 模块感知部署环境。文档允许在 `nuxt.config.ts` 中设置 `nitro.preset: 'node-server'`，或在构建时使用 `NITRO_PRESET=node-server`。Nuxt 的 pages、server handlers、runtime config 和 route rules 通过 Nitro/H3 类型和 hooks 接入通用 server pipeline；具体 provider 输出由 Nitro 负责。

这套分层的要点是：Nuxt 仓库保留应用框架与 Nitro 的集成（例如 `nitro:init`、`nitro:build:before`），但不复制所有云厂商构建器。部署目标增长时主要扩展 Nitro preset，而非修改 Nuxt route/runtime。

关键源码：

- [Nuxt deployment docs](https://github.com/nuxt/nuxt/blob/369a6c64f47095a04e1ba63821088751ff27fe19/docs/1.getting-started/16.deployment.md)：preset 配置与环境变量入口。
- [Nuxt pages module](https://github.com/nuxt/nuxt/blob/369a6c64f47095a04e1ba63821088751ff27fe19/packages/nuxt/src/pages/module.ts)：页面路由规则通过 `nitro:init` / `nitro:build:before` 进入 Nitro。
- [Nuxt core initialization](https://github.com/nuxt/nuxt/blob/369a6c64f47095a04e1ba63821088751ff27fe19/packages/nuxt/src/core/nuxt.ts)：初始化 Nitro、透传 runtime config 和 route rules。

注：本次 `meta-frameworks/nuxt` checkout 未包含 Nitro provider preset 的实现；不能据此断言 Cloudflare preset 的具体产物细节。

## 4. Qwik City：Vite target + 平台约定文件

Qwik City 的 Cloudflare Pages adapter 复用 `viteAdapter()`，只覆写平台差异：设定 `resolve.conditions` 为 `webworker`/`worker`、SSR target 为 `webworker`、禁止 external（`noExternal: true`）、输出 ESM。生成阶段再按 Pages 约定写 `_routes.json` 和 `_worker.js`，Worker 默认导入 server 输出的 `fetch`。

相对地，Qwik 的 Node 静态生成器直接使用 `node:worker_threads` 和 `node:os` 并发渲染。这表明构建时任务也可以按环境分离，不应把 Node-only 实现放入 edge bundle 可达的共享模块。

关键源码：

- [Qwik Cloudflare Pages Vite adapter](https://github.com/QwikDev/qwik/blob/c59a430cb87c98a13ec0c8f2a3bc6369fe16f55f/packages/qwik-city/src/adapters/cloudflare-pages/vite/index.ts)。
- [Qwik Node static generator](https://github.com/QwikDev/qwik/blob/c59a430cb87c98a13ec0c8f2a3bc6369fe16f55f/packages/qwik-city/src/static/node/node-main.ts)。

## 5. React Router：共享 handler + 极薄的平台 bridge

React Router 的 `react-router-node` package 输出 Node listener、Node stream 互操作和 filesystem session storage；Cloudflare package 输出 Workers KV session storage 与 Workers/Pages request handler。二者并不复制路由处理：Cloudflare bridge 创建共享的 `createReactRouterRequestHandler(build, mode)`，随后把 `EventContext` 的 `request`、`request.cf`、`waitUntil`、`passThroughOnException` 和 global `caches` 放入显式 `loadContext`。

Pages handler 还先尝试 `context.env.ASSETS.fetch()`，静态资源未命中才调用应用 handler。这个顺序将平台资产服务与框架 SSR 清晰分层。

关键源码：

- [React Router Node exports](https://github.com/remix-run/react-router/blob/182479060d9419839e538edac7afe64651513d05/packages/react-router-node/index.ts)。
- [React Router Cloudflare exports](https://github.com/remix-run/react-router/blob/182479060d9419839e538edac7afe64651513d05/packages/react-router-cloudflare/index.ts)。
- [React Router Cloudflare worker bridge](https://github.com/remix-run/react-router/blob/182479060d9419839e538edac7afe64651513d05/packages/react-router-cloudflare/worker.ts)。

## 可采纳设计

对于需要同时支持 Node 与 Cloudflare 的框架/工具，建议采用以下最小模型：

1. 定义不依赖 Node 的 `ServerBuild`（路由 manifest、SSR handler、静态资源清单、prerender 结果）。共享 handler 仅接收 Web `Request` 和显式 `PlatformContext`。
2. 定义 `Adapter`：`name`、`capabilities`、`adapt(build)`；其中 `capabilities` 至少描述 SSR/static、streaming、filesystem read、edge middleware、bindings 和 Node builtins。
3. 将 Node 和 Cloudflare 各放到独立 package/entrypoint。Node adapter 可 externalize runtime dependencies；Cloudflare adapter 强制 worker condition、ESM 和无 Node builtin，并生成 Wrangler/Pages 约定文件。
4. 将平台能力注入 context，而不让业务代码读 `process`、`caches`、Workers bindings 等全局值。为每个平台提供类型增强和本地模拟。
5. 在构建前验证 capabilities；对不支持的组合给出可行动错误。为每个 adapter 维护产物快照/部署 smoke test，而非仅测试共享 handler。

## 用户如何接入：四种模式

用户不会在每条路由中选择 Node 或 Cloudflare。选择发生在应用配置、构建命令或部署入口；业务路由继续使用框架的通用 API。不同框架的差异主要在“框架替用户生成多少平台胶水代码”。

### A. 配置选择 adapter：SvelteKit 与 Astro

这是最常见的模式。用户安装一个部署 adapter，并在项目的唯一框架配置文件中引用它；框架把完整的 build manifest 交给 adapter。用户通常只需要保留平台的部署配置，例如 `wrangler.jsonc`。

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: { adapter: adapter() }
};
```

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: cloudflare()
});
```

切换 Node 时只替换 adapter（例如 SvelteKit 的 `@sveltejs/adapter-node` 或 Astro 的 `@astrojs/node`）；路由代码不变。SvelteKit 的 adapter 还可以声明 `emulate()` 来让本地开发获得 Cloudflare `env`/`ctx` 等 platform context。Astro 使用 integration hook 内部的 `setAdapter()` 注册，不要求用户直接处理 adapter metadata。

**适用场景**：框架可稳定定义通用 build contract，且目标平台差异主要是构建产物和部署配置。对于应用开发者，这是最低摩擦的体验。

### B. preset：Nuxt/Nitro

Nuxt 用户通过一个字符串选择 Nitro 部署目标，既能写在版本化的配置中，也能由 CI 注入：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: { preset: 'node-server' }
});
```

```bash
NITRO_PRESET=node-server nuxt build
```

Cloudflare 则同样选用 Nitro 提供的对应 preset。Nuxt module 只通过 `nitro:init`、`nitro:build:before` 等 hook 添加 routes、handlers 与 route rules；它们不需要知道最终 provider。

**适用场景**：存在大量 provider，且希望把目标矩阵、默认值和输出生成集中在一个下层部署引擎。代价是 preset 名称和行为成为面向用户的兼容性 API，必须有明确文档和版本策略。

### C. 脚手架生成平台入口：Qwik City

Qwik 的用户运行 `qwik add cloudflare-pages`。命令会加入 `adapters/cloudflare-pages/vite.config.ts` 和 `src/entry.cloudflare-pages.tsx`，然后以该 Vite config 构建 server：

```ts
// adapters/cloudflare-pages/vite.config.ts（简化）
import { cloudflarePagesAdapter } from '@builder.io/qwik-city/adapters/cloudflare-pages/vite';

export default defineConfig({
  plugins: [cloudflarePagesAdapter()]
});
```

生成的入口使用 Cloudflare Pages middleware，将请求交给 Qwik server `fetch`。用户获得一个可编辑的桥接点，能加入认证、bindings 或自定义 middleware；adapter 仍负责 worker target、`_worker.js` 和 `_routes.json`。

**适用场景**：用户常常需要修改平台入口，或框架希望避免隐藏运行时代码。代价是项目多出平台专属文件，升级时需要脚手架迁移策略。

### D. 显式平台 bridge：React Router

React Router 的 Cloudflare 支持是独立包。用户安装 `@react-router/cloudflare` 和 Workers 类型，然后在 Workers/Pages 入口创建 handler，并定义如何从平台 context 构造路由的 `loadContext`：

```ts
import { createRequestHandler } from '@react-router/cloudflare';
import build from 'virtual:react-router/server-build';

export default createRequestHandler({
  build,
  getLoadContext({ context }) {
    return { env: context.cloudflare.env, waitUntil: context.cloudflare.ctx.waitUntil };
  }
});
```

这里 `loadContext` 是刻意保留给用户的扩展点：业务 loader/action 可从 context 获取绑定值，但不会直接依赖 `EventContext`。Node 用户则使用 `react-router-node` 的 listener、stream 和 file session APIs。

**适用场景**：框架内核很轻，宿主（Workers、Express、自定义 server）多样，且应用需要完全掌控 request 生命周期。代价是用户需要理解并维护 bridge。

### 自动选择：仅作为便利层

SvelteKit `adapter-auto` 通过构建环境变量（如 `CF_PAGES`、`VERCEL`、`NETLIFY`）选择 adapter。它适合托管平台的标准 CI，用户只配置 `adapter-auto`；但它本质上仍属于模式 A 的便利包装。

不建议将自动选择作为唯一方式：本地构建、跨平台发布或自托管时，环境变量可能使同一提交产生不同产物。应始终支持显式 adapter/preset 覆盖，并在构建日志中打印最终目标。

## 面向用户的推荐接口

若为本项目设计接入接口，建议同时提供两层：

```ts
// 首选：显式、可版本化、可本地复现
export default defineConfig({
  deploy: { adapter: cloudflare({ assets: 'binding' }) }
});

// 可选：适合托管 CI 的便利选项
export default defineConfig({
  deploy: { adapter: 'auto' }
});
```

adapter 应提供一个可选但强类型的 `createContext(platformEvent)`，将 Node request 或 Cloudflare event 映射为统一 `PlatformContext`。当应用需要 custom Worker 时，允许配置 `entry` 或暴露生成的 entry；不要要求普通用户为默认部署手写 bridge。

## 风险与边界

- 不能仅依靠 `typeof process` 或环境变量在运行时切换：edge bundle 可能已因静态 import Node API 而无法部署。
- 静态资源、路由绕过规则、headers/redirects 是平台产物的一部分；仅输出一个通用 handler 通常不足以支持 Cloudflare Pages/Workers。
- Cloudflare bindings、cache 与延后任务必须通过 context 传递，否则共享业务代码难以测试也难以获得类型安全。
- adapter 自动选择适合构建环境明确的托管平台；自托管或本地构建应要求显式选择，避免产物随 CI 环境隐式变化。
