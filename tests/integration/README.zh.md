# 前端集成回归测试

**[English](./README.md)**

本 workspace 验证从 Vite 转换、SSR 输出到 Web Widget hydration 和开发期更新的浏览器可见契约。

## 测试范围

当前测试集覆盖：

- `C01-C08`：CSS 所有者、边界、转换类型和导入路径矩阵；
- `Y01-Y05`：React、Vue 3、Preact、Solid 和 Svelte hydration；
- `U01-U08`：修改源码后的 Vite HMR 与 full reload 策略；
- `M01-M05`：服务端/客户端版本错位和 hydration 竞态；
- Shadow SSR：React、Vue 3、Preact、Solid 和 Svelte 的原生 DSD 解析、内部 mount root 恢复、样式隔离与顺序、命名 slot、pending 清理和交互；
- production 交付：由独立 Node server 运行构建后的 SSR entry 并服务带哈希的客户端资产，运行时不依赖 Vite；
- 结构化 hydration 错误、资源加载失败和 fixture 生命周期。

Vue 2 被明确排除在这个 workspace 之外，以避免 Vue 2/Vue 3 插件和运行时的共存冲突。Vue 2 继续使用独立的包级测试。

## 本地运行

先安装 workspace 依赖和 Playwright Chromium：

```sh
pnpm install
pnpm --filter @tests/integration exec playwright install chromium
```

运行与 Pull Request 相同的 Chromium 测试集：

```sh
pnpm --filter @tests/integration test:ci:core:dev
pnpm --filter @tests/integration test:ci:core:production
```

常用的聚焦命令：

```sh
# 运行单个 spec 或用例 ID
pnpm --filter @tests/integration exec playwright test specs/updates.spec.ts --project=chromium --workers=1
pnpm --filter @tests/integration exec playwright test --project=chromium --grep U04

# 完整的本地 dev 测试集
pnpm --filter @tests/integration test:dev

# 使用独立 Node server 的完整 production 模式测试集
pnpm --filter @tests/integration test:production

# 在 Chromium、Firefox 和 WebKit 中验证 production hydration
BROWSER_MATRIX=extended pnpm --filter @tests/integration test:production

# 类型检查
pnpm --filter @tests/integration typecheck
```

Mutation 测试必须串行运行。测试会在随机端口启动 Vite server，并修改临时 fixture 副本，因此即使测试中断也不会改变 Git 跟踪的源文件。不要让测试直接操作 playground，也不要用固定 sleep 替代 watcher 同步。

Production 测试会生成 `dist/client` 和 `dist/server/entry.server.js`，然后运行 `scripts/production-server.mjs`。运行进程会加载构建后的 SSR entry，并在不使用 Vite 的情况下服务带哈希的客户端资产。Mutation 和 mismatch spec 依赖 Vite dev module graph 与 watcher，因此会被 production 配置排除。

Playwright 会保留失败用例的 trace。浏览器 console、资源错误诊断和临时 Vite server 日志会附加到 `test-results/`。

## 目录职责

| 路径                              | 职责                                                   |
| --------------------------------- | ------------------------------------------------------ |
| `src/cases.ts`                    | 静态场景注册表和矩阵完整性校验                         |
| `src/cases/`                      | 矩阵使用的 CSS 和 Vue fixture                          |
| `src/hydration/`                  | 各框架的 hydration fixture                             |
| `src/entry.server.ts`             | Production 请求路由和动态 SSR 响应契约                 |
| `src/assertions.ts`               | computed style、navigation identity 和 Widget 状态断言 |
| `src/source-mutation.ts`          | 修改源码并等待 Vite watcher 确认                       |
| `src/server-fixture.ts`           | 临时 fixture 副本和随机端口 Vite 生命周期              |
| `specs/css-static.spec.ts`        | SSR、CSS 资产、selector 和 computed style 行为         |
| `specs/hydration*.spec.ts`        | hydration identity、生命周期和结构化错误               |
| `specs/shadow-ssr.spec.ts`        | Declarative Shadow DOM 解析、恢复、样式和 slot         |
| `specs/updates.spec.ts`           | 开发期 HMR/full reload 策略                            |
| `specs/mismatch.spec.ts`          | 版本错位和 hydration 竞态恢复                          |
| `specs/production-server.spec.ts` | Production HTTP、缓存、fallback 和安全行为             |
| `scripts/production-server.mjs`   | 加载构建后的 SSR entry，并在无 Vite 环境服务客户端资产 |
| `vite.config.ts`                  | fixture 转换、更新策略和测试控制端点                   |

## 新增测试

首先判断新行为属于哪个类别。如果只是现有契约的新维度，应扩展现有用例编号系列；只有验收契约不同的行为才引入新系列。实现测试时必须同步记录新用例及其验收契约。

### 静态 CSS 或资产行为

1. 在 `src/cases/` 下添加满足复现条件的最小 fixture。
2. 在 `src/cases.ts` 注册 owner、boundary、transform、import path、selector 和预期 computed style。
3. 新增矩阵维度时扩展注册表枚举。该维度不再被任何用例覆盖时，注册表测试必须失败。
4. 同时断言服务端/协议输出和浏览器语义。仅添加 DOM 快照不够。
5. 分别在 dev 和 production 模式运行聚焦测试。

### Hydration 或框架行为

1. 在 `src/hydration/` 添加最小框架 fixture，并通过 `src/server-fixture.ts` 或 fixture Vite plugin 渲染匹配的 SSR markup。
2. 需要验证 identity 时，在 hydration 前记录 host、mount root 和 probe node。
3. 等待明确的 hydration-ready 信号和 Widget status，不要匹配框架 console 文案。
4. 断言 node identity、computed style、一次交互、update/unmount 生命周期、`window.__hydrationErrors`、console error 和资源错误。
5. 引入新 adapter 时增加 production 浏览器覆盖。

### Shadow DOM SSR 行为

Shadow DOM 用例放在 `specs/shadow-ssr.spec.ts`，不要把 `shadow` 直接加入 document/light CSS 矩阵。浏览器导航前先断言原始 DSD 协议，导航后再断言解析得到的 open `ShadowRoot`、唯一直属 `web-widget-root`、样式所有权与顺序、slot assignment、pending 清理、框架交互和错误通道。开发模式覆盖 React/Vue 核心路径，production 使用构建后的包产物覆盖五个 hydration fixture。

`specs/shadow-vite-plugin.spec.ts` 专门负责核心 fixture 未建模的 bundler 边界。开发测试运行 router playground 的临时副本，源码 mutation 不会污染工作区；production 测试构建真实 playground，使 workspace package alias 和多 environment client entry 使用真实解析模型。

| 风险维度                  | Dev 契约                                                                                 | Production 契约                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Route/Widget 与 CSS alias | Vue Widget 通过 package alias，全部 Widget 通过 `~` 解析共享 CSS                         | 真实 workspace build 解析相同 import              |
| CSS Modules               | 原始 DSD、类名映射与 computed style 使用同一转换版本                                     | Widget CSS 嵌入每个 DSD 边界                      |
| Vue scoped CSS            | Vue 2/3 virtual style 会嵌入、HMR，并出现在新的 SSR 响应中                               | 构建后 scoped selector 仍只属于 ShadowRoot        |
| Route/Widget CSS 所有权   | route CSS 作用于 document probe，但不能影响 shadow button                                | route CSS 由 document asset 交付，不复制进 DSD    |
| HMR                       | CSS Module 只 reload 一次；SFC scoped CSS 不导航更新；fresh SSR 必须最新                 | 不适用                                            |
| 水合错误                  | `hydration-errors.spec.ts` 在保留 ShadowRoot/mount root 时覆盖 load/bootstrap/mount 错误 | `shadow-ssr.spec.ts` 继续覆盖 production 正常水合 |

不要把这些断言降级为 style tag 数量。每个所有权用例必须同时断言原始服务端 HTML 与浏览器 computed style；每次 mutation 后还必须请求新的 SSR，避免活动页面 HMR 成功掩盖服务端 `devStyles` 过期。

### HMR 或 reload 策略

1. 在 `specs/updates.spec.ts` 添加串行 `Uxx` 场景。
2. 只通过 `mutateSource()` 修改临时 fixture；该方法会确认 Vite 已观察到文件变化。
3. 对 HMR 断言输出已更新、navigation identity 不变、只有一次初始 `load`、DOM/state 按框架约定保留，并且没有 hydration error。
4. 对 full reload 断言 navigation identity 改变、恰好发生两次 `load`、页面使用新的 SSR 输出，并且最终 hydration 状态干净。
5. 在同一个变更中更新 `vite.config.ts` 的策略，并在本 README 中记录契约。不要为了迎合当前实现而削弱契约断言。

### 版本错位或竞态行为

当时序本身属于契约时，在 `specs/mismatch.spec.ts` 添加 `Mxx` 场景，例如旧 SSR 配合新客户端模块，或 hydration 过程中发生更新。使用明确的测试端点或信号控制时序，断言最终进入一致状态或结构化错误状态，并保持 retry 关闭。

### Production 交付行为

在 `specs/production-server.spec.ts` 添加 production HTTP 和部署边界断言。必须通过 Playwright request 或浏览器 API 访问构建后的 URL，不要导入源码模块或 Vite server API。同时覆盖成功响应和失败边界，包括 status、content type、缓存/安全 header，以及是否允许 document fallback。独立 server 应保持零第三方依赖，以此证明服务构建产物时不需要 Vite runtime。Route、redirect、API 和错误行为应实现在 `src/entry.server.ts`，并同时验证 HTTP 结果和动态 route 的 hydration。

## Review 检查清单

- 故意破坏新增行为时，测试会失败。
- 断言覆盖用户可见语义，而不是框架日志文案或宽泛快照。
- 发生 mutation 时，明确断言 HMR/reload 次数、navigation identity、状态和 hydration error。
- fixture 使用确定的 ready/watcher 信号，不使用固定 sleep。
- dev 和 production 覆盖符合该行为的适用范围。
- Production 测试不会启动 Vite，也不会使用 dev-only mutation endpoint。
- 新增核心 fixture 框架时不引入 Vue 2；router 边界 fixture 可以复用 playground 已有的 Vue 2 package。
- 用例属于不同 CI 层级时同步更新 CI script。
- 在本 README 中记录新增的用例类别或更新策略契约。

## 后续覆盖候选

优先补充已知的契约缺口：

1. CSS Module class rename、addition 和 removal 后的 SSR/client invalidation。
2. 被多个 route 和 Widget 导入的共享样式依赖。
3. HMR transform 失败后再次成功编辑并恢复。
4. Vite websocket 中断后的重连行为。
5. 具有独立样式更新的嵌套 Widget 或 shadow boundary Widget。
6. 更新期间的 adapter error boundary 恢复，包括事件触发次数。
7. Production asset base、preload 和 code-split CSS 行为。
8. 更新或 hydration 尚未完成时发生导航。

每个候选场景应先写成明确契约：输入 mutation、预期更新策略、最终 DOM/style/state、错误通道以及浏览器/CI 范围。根据这份契约判断它属于 `C`、`Y`、`U` 还是 `M`。
