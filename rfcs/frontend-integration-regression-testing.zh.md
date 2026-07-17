# 前端集成回归测试方案

## 背景

当前前端集成回归主要依赖包级单元测试、playground HTML 快照和人工检查。它们可以证明局部转换函数符合预期、HTML 文本发生了预期变化，或者某次人工操作看起来正确，但不能证明以下完整链路：

```text
源模块
  -> Vite client/server 双环境转换
  -> SSR HTML 与资产交付
  -> 浏览器解析
  -> Widget hydration
  -> HMR 或 full reload
  -> 最终 DOM、样式和交互状态
```

CSS 是当前最常见的故障入口，但不是测试套件的边界。CSS Modules 导出变化、server/client 模块失效顺序、SSR 与客户端版本错位和框架 hydration 都可能表现为水合错误、样式丢失、状态丢失或错误刷新。

本方案建立一个独立于 playground 的真实浏览器集成回归套件。CSS 组合矩阵是首批场景，后续可以在同一套运行环境中增加 streaming、fallback、module loading、CSP 和跨框架 hydration 等场景。

## 测试套件边界

新的测试应用放在 `tests/integration`，不放入 `playgrounds/router`。

原因：

- playground 面向人工体验，页面和视觉结构会正常演进；测试 fixture 需要刻意稳定。
- HMR 测试会修改源文件，不能与开发者正在使用的 playground 互相干扰。
- 测试需要 dev/production、不同框架和可控源文件变更等专用配置，不能持续增加 playground 的条件分支。
- 同名 class、故意泄漏、故意 mismatch 等 fixture 不属于产品示例。
- HMR 串行测试和多浏览器生命周期不应拖慢现有 playground 快照套件。

`playgrounds/router` 只保留少量可人工体验的代表案例和现有宽范围 smoke test。测试套件验证能力，playground 展示能力，二者不共享测试页面。

## 目标与非目标

目标：

1. 自动证明 SSR、浏览器解析、hydration 和更新形成一致的状态迁移。
2. 自动证明 client/server 双环境消费了同一版本的模块语义。
3. 自动证明 route 和 Widget CSS 在浏览器中生效，而不只是出现在 HTML 或构建产物中。
4. 根据变更类型验证正确的更新策略：HMR、full reload 或无需客户端更新。
5. 捕获 hydration warning、recoverable error、DOM replacement、重复边界和静默样式错位。
6. 失败时能定位到解析、转换、资产收集、SSR、边界安装、hydration 或更新策略中的一层。
7. 用显式场景清单管理覆盖率，使测试套件可以扩展到 CSS 之外。

非目标：

- 不使用全页面截图替代语义断言。截图只用于失败诊断或少量布局基线。
- 不穷举所有维度的笛卡尔积。
- 不在每个浏览器中重复完整矩阵。
- 不验证业务页面的视觉设计。
- 不把人为制造的 hydration mismatch 当成通过条件；故障注入用例必须验证产品定义的恢复或诊断行为。

## 分层验证

| 层次              | 主要断言                                            | 定位的问题                 |
| ----------------- | --------------------------------------------------- | -------------------------- |
| 包级单元测试      | module graph、manifest、style map、reload policy    | 转换、映射和策略           |
| HTTP/构建协议测试 | SSR markup、资产位置、状态码、去重、版本标记        | 服务端序列化和交付         |
| 浏览器语义测试    | DOM 边界、computed style、事件、可交互性            | 用户最终得到的行为         |
| 状态迁移测试      | hydration identity、HMR/reload 次数、状态与错误通道 | client/server 时序和一致性 |

现有 HTML 快照继续作为宽范围变化探测器，但不能作为 CSS 或 hydration 正确性的最终证据。

## 可组合维度

首批场景使用以下维度：

| 维度          | 值                                                                   |
| ------------- | -------------------------------------------------------------------- |
| import path   | relative、alias                                                      |
| transform     | plain CSS、CSS Modules、Vue scoped、Vue scoped + module、JS/TS、Vue  |
| owner         | route、widget、shared                                                |
| boundary      | document、light Widget                                               |
| server mode   | dev、production                                                      |
| browser phase | SSR response、before hydration、hydrated、updated                    |
| mutation      | none、plain CSS、module CSS、component、server-only、route structure |
| update policy | HMR、full reload、none                                               |
| consistency   | matched、SSR-old/client-new、SSR-new/client-old                      |
| framework     | React、Vue 3、Preact、Solid、Svelte                                  |

约束：

- HMR 只在 dev 下存在；production 验证 SSR、资产和 hydration。
- route CSS 属于 document，Widget CSS 由 light DOM Widget 消费。
- Vue scoped 和 Vue CSS Modules 使用 Vue fixture；普通 CSS Modules 使用 React 覆盖公共链路。
- 故障注入的版本错位场景独立运行，不与普通静态矩阵做笛卡尔积。
- 框架完整矩阵只跑关键 hydration smoke；资产组合矩阵使用 React 和 Vue 3 代表公共链路与框架转换链路。

覆盖规则：

1. 每个维度值至少出现一次。
2. 高风险维度使用 pairwise coverage。
3. `widget × {module, scoped, scoped+module}` 为强制组合。
4. `mutation × update policy × hydration result` 必须逐项显式定义，不能依赖测试作者默认理解。
5. 每个框架至少有一个 production hydration 场景；React 和 Vue 3 额外覆盖 dev 更新。

Shadow DOM、DSD、ShadowRoot 样式所有权和 no-JS Shadow SSR 不属于当前阶段。等基础机制稳定后，由 Shadow 特性分支补充测试 fixture 与 playground 示例，不提前占用当前套件的设计和交付范围。

## 独立 Fixture 应用

建议目录：

```text
tests/integration/
  package.json
  playwright.config.ts
  fixtures/app/
    entry.client.ts
    entry.server.ts
    vite.config.ts
    routes/
      css-matrix@route.tsx
      hydration@route.tsx
      frameworks@route.tsx
    cases/
      route/
      widgets/
      hydration/
      hmr/
  src/
    cases.ts
    assertions.ts
    server-fixture.ts
    source-mutation.ts
    browser-errors.ts
  specs/
    css-static.spec.ts
    hydration.spec.ts
    updates.spec.ts
    mismatch.spec.ts
```

在 `pnpm-workspace.yaml` 增加 `tests/*`。fixture app 作为 `@tests/integration` 包运行，直接依赖 workspace 中的 Web Widget 包，不发布。

`cases.ts` 是唯一场景清单，HTTP、production browser 和 dev browser 测试读取同一份数据。场景定义至少包含：

```ts
interface IntegrationCase {
  id: string;
  route: string;
  owner: 'route' | 'widget' | 'shared';
  boundary: 'document' | 'light';
  transform: string;
  importPath: 'relative' | 'alias';
  selector: string;
  expected: Record<string, string>;
  frameworks?: string[];
}
```

场景生成器在测试启动时检查枚举覆盖和重复 ID，防止删除 fixture 时静默缩小矩阵。

## CSS 首批矩阵

每个 probe 使用唯一 `data-case`，并同时断言不可见 token 与真实呈现属性：

```css
.probe {
  --case-token: widget-light-alias-module;
  color: rgb(17, 34, 51);
  width: 37px;
}
```

不能只断言颜色，因为它可能来自错误的全局规则；也不能只断言 CSS 文本存在。测试必须精确选中 probe 并读取 `getComputedStyle()`。Vue scoped 场景要精确到 `.probe[data-v-xxx]`。

下表每一行在 dev 首次加载和 production Chromium 中执行：

| ID  | owner  | boundary | import   | transform           | 关键目的                        |
| --- | ------ | -------- | -------- | ------------------- | ------------------------------- |
| C01 | route  | document | relative | plain               | route CSS 基线                  |
| C02 | route  | document | alias    | module              | route alias 与 hash class       |
| C03 | route  | document | relative | Vue scoped          | scoped selector 与 SSR 属性一致 |
| C04 | route  | document | alias    | Vue scoped + module | 两种 Vue 转换组合不丢导出       |
| C05 | widget | light    | relative | plain               | Widget 依赖进入 document        |
| C06 | widget | light    | alias    | module              | alias CSS Modules 公共链路      |
| C07 | widget | light    | relative | Vue scoped          | Widget scoped CSS 收集          |
| C08 | widget | light    | alias    | Vue scoped + module | alias、scope、module 高风险交互 |

静态场景的 HTTP/SSR 断言包括：

- 所有 stylesheet 可请求且 MIME 正确；
- route 与 Widget 的 CSS 资产都能从 SSR HTML 定位且无重复交付；
- module/scoped 的服务端 class/attribute 与 CSS selector 一致。

## Hydration 不变量

“没有 console warning”只是最低要求。每个正常 hydration 场景都要验证：

- SSR probe 在客户端接管后保持 node identity；
- Widget host 和框架 mount root 未重复创建；
- hydration 前后文本、关键属性和 computed style 一致；
- 事件只绑定一次，首次点击只产生一次状态变化；
- hydration 完成后 Widget 可以更新和卸载；
- 没有框架 hydration warning、`onRecoverableError`、未处理异常、stylesheet 404 或边界恢复错误。

测试在应用代码之前通过 `addInitScript` 安装统一错误探针，并让各 adapter 的测试入口把 recoverable hydration error 上报到同一数组。失败时输出 framework、case id、SSR DOM 摘要、hydrated DOM 摘要和错误堆栈。

长期不应依赖 React/Vue console 文案识别水合错误。Web Widget 应提供边界级、可监听的 `web-widget:hydration-error` 事件，至少携带 Widget module URL、adapter、错误阶段和原始 error。阶段建议区分 `module-import`、`adapter-bootstrap`、`mismatch` 和 `boundary-recovery`。事件用于诊断和测试，不把 mismatch 自动视为成功恢复。

框架 smoke 矩阵：

| ID  | framework | boundary | mode       | 断言                                 |
| --- | --------- | -------- | ---------- | ------------------------------------ |
| Y01 | React     | light    | dev + prod | identity、事件、无 recoverable error |
| Y02 | Vue 3     | light    | dev + prod | scoped/module 与 hydration 一致      |
| Y03 | Preact    | light    | production | hydration smoke                      |
| Y04 | Solid     | light    | production | hydration registry 与事件            |
| Y05 | Svelte    | light    | production | recover 模式与事件                   |

Vue 2 不进入本套件。同一 Vite 应用内并存 Vue 2/3 runtime 会使 adapter 的裸 `vue` peer 解析发生冲突；Vue 2 保留现有包级测试，不在此集成 fixture 中规避或模拟该冲突。

## Dev 更新策略

不同文件的正确行为不同，不能统一断言“没有整页刷新”。当前实现中 `.module.css` 会触发 full reload，原因是 client-only HMR 可能先更新 class map，而缓存的 server renderer 仍输出旧 markup，导致下一次 hydration 不一致。

| ID  | mutation                 | 期望策略      | 必须断言                                                    |
| --- | ------------------------ | ------------- | ----------------------------------------------------------- |
| U01 | route plain CSS          | HMR           | computed style A -> B，页面与 Widget 状态不变               |
| U02 | widget plain CSS/light   | HMR           | style 更新，无 reload，状态不变                             |
| U03 | CSS Module               | full reload   | 恰好一次 reload，新 SSR/class map 一致，无 hydration error  |
| U04 | Vue scoped style         | framework HMR | selector/style 更新，按框架协议保留状态，无 hydration error |
| U05 | Vue style module         | framework HMR | module export、class 和 style 同步更新，无 hydration error  |
| U06 | shared Widget component  | framework HMR | 无 reload，渲染更新，状态保留规则符合框架                   |
| U07 | server-only route module | full reload   | 恰好一次 reload，页面来自新 SSR                             |
| U08 | route structure          | full reload   | routemap 更新后恰好一次 reload，新路由可访问                |

U05 的期望是 Vue SFC 作为一个 HMR 边界同步更新 template、module export 和 style。如果当前 client/server module graph 不能保证这一点，应将 Vue style module 加入 full reload policy，并同步修改此契约；不能只更新 CSS 而留下旧 class map。

每个更新测试记录 navigation id、页面随机 token、Widget 状态、host identity 和错误数组。期望 HMR 时这些 identity 不变；期望 full reload 时 navigation id 恰好增加一次，并在新文档 hydration 完成后重新执行全部一致性断言。

测试只修改专用 fixture，串行运行，在 `finally` 恢复文件。suite 结束后执行 fixture diff 检查，不能修改业务 CSS 或 playground 文件。

## 版本错位与水合错误

除了正常更新，还要主动制造 server/client 版本错位。测试通过请求拦截或 fixture 中的 hydration gate 暂停客户端入口，在 SSR HTML 已返回后修改源模块，再放行客户端加载。

| ID  | 注入方式                        | 风险                                      | 验收标准                                        |
| --- | ------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| M01 | SSR-old / client-new module CSS | class map 与 SSR class 不一致             | full reload 到一致版本；最终无 hydration error  |
| M02 | SSR-old / client-new component  | 文本或 DOM shape 不一致                   | 按定义恢复或明确失败；不得静默留下半水合 DOM    |
| M03 | SSR-new / cached client asset   | 客户端模块落后                            | 资产不可错误缓存；最终版本一致                  |
| M04 | hydration 期间再次发生更新      | invalidation 与 adapter bootstrap 竞态    | 最终只存在一个已水合实例，事件不重复            |
| M05 | SSR-old / client-new Vue module | SFC template、module export 或 scope 错位 | reload/版本守卫保证一致；最终无 hydration error |

M01 是当前 `.module.css -> full reload` 策略的浏览器级验收。若 full-reload 消息可能在浏览器连接 HMR websocket 前丢失，测试应稳定复现并推动引入版本握手或 hydration 前一致性检查，不能用重试掩盖。

M02 的“定义恢复”必须按 adapter 明确：React 可通过 recoverable error 通道重建，其他 adapter 可能选择终止并报告边界错误。测试套件记录差异，但每个 adapter 都必须有确定结果。M05 则确保 Vue SFC 不会绕过仅匹配 `.module.css` 文件名的 reload policy。

## Astro 参考与差异

本方案参考了本地 Astro `79aa99c648` 的测试与运行时实现。Astro 面临相同类别的问题：Vite client/server 双环境失效、SSR 内联 CSS 更新、岛屿 hydration、跨框架组件和 HMR/full reload 决策。

可以直接借鉴：

- `packages/astro/test/fixtures` 与 `packages/astro/e2e/fixtures` 将稳定 fixture 与 examples 分离，支持本方案将测试应用移出 playground 的决定。
- `packages/astro/e2e/test-utils.ts` 的 `testFactory()` 为每个测试文件分配独立端口、复用 fixture，并在 `afterEach` 恢复修改。
- `packages/astro/test/test-utils.ts` 的 `editFile()` 在写文件前订阅 watcher，记录原内容并提供 `resetAllFiles()`，避免 HMR 测试用固定 sleep 猜测文件是否被接收。
- `packages/astro/e2e/hmr.test.ts` 使用 Playwright `toHaveCSS()` 验证最终计算样式，并监听 `load` 区分 HMR 与 full reload。
- `packages/astro/src/vite-plugin-hmr-reload/index.ts` 将 style module、client-visible module 和 SSR-only module 分流，同时失效 SSR runner cache 与 route dev-CSS virtual module。
- `packages/astro/src/runtime/server/astro-island.ts` 对客户端模块 import 重试一次，并在最终失败时派发可取消、可冒泡的 `astro:hydration-error`。
- `packages/astro/e2e/astro-island-hydration-error.test.ts` 用请求拦截稳定制造首次/持续模块加载失败，分别验证重试成功和结构化错误事件。
- `waitForHydrate()` 以 island 的 `ssr` 属性移除作为明确完成信号，优于等待网络空闲或固定时间。

不应直接照搬：

- Astro 把 CSS Modules 也视为普通 style module，由客户端 CSS HMR 处理；其 E2E 只把 SCSS Module 的 `blue` 改成 `red`，没有改变 module export/class map，也没有制造 SSR-old/client-new，因此不能证明 Web Widget 遇到的 hydration mismatch 已被解决。
- Astro 的 “hydration race” 测试主要覆盖嵌套 slot 的脚本顺序，没有覆盖源文件在 SSR 返回与客户端 bootstrap 之间变化的版本竞态；本方案的 M01-M05 仍然必要。
- 部分 Astro HMR 测试先固定等待 500ms，部分 mismatch 测试匹配 React/Vue console 字符串。这些做法容易受时序和框架文案变化影响，本方案使用显式 ready/hydrated 信号和结构化错误通道。
- Astro CI 对浏览器测试允许两次 retry。Web Widget 的 mutation/hydration 竞态测试最多重试一次并保留首次 trace，不能用 retry 掩盖同步缺陷。
- Astro 直接修改 tracked fixture 后恢复，已经比手工测试可靠；本方案进一步为 mutation suite 使用临时工作副本，使进程被强制终止也不会污染工作区。

Astro 的 HMR 策略给了一个可评估的优化方向：若将来能够证明 CSS Module 的 class map 在内容变更下稳定，并保证 SSR runner 与 client module 原子失效，U03 可以从 full reload 收窄为 HMR。在 M01、class rename/add/remove 和 hydration gate 测试全部通过之前，不应只为了与 Astro 行为一致而移除当前保守策略。

## Server 与测试运行器

使用独立 `@playwright/test` 配置，现有 Vitest/Jest 继续负责包级和 HTTP 测试。Playwright 原生提供 browser project、web server、trace、console 和失败截图，更适合进程与状态迁移测试。

本地运行、目录职责和新增用例规范见 [`tests/integration/README.zh.md`](../tests/integration/README.zh.md)。

- production：构建一次后启动 `node server.js`，worker 复用构建结果；
- dev-static：启动独立 Vite server，并行运行只读场景；
- dev-mutation：另启 Vite server，单 worker 串行运行 U/M 场景；
- 所有 server 使用随机可用端口和健康检查，不使用固定 sleep；
- 每个 suite 使用独立 fixture 工作副本，避免并发测试互相修改；
- 失败保留 trace、console、server log、DOM 摘要和 style ownership 清单。

fixture 工作副本应放在临时目录，通过 workspace 包解析或显式 alias 指向当前源码。这样测试中断也不会污染 Git 工作区，比修改后再恢复 tracked fixture 更可靠。

## CI 分层

| 触发条件    | 内容                                             | 浏览器                    |
| ----------- | ------------------------------------------------ | ------------------------- |
| 每个 PR     | 包级测试、C01-C08、Y01-Y02、U01-U08、M01         | Chromium                  |
| main/发布前 | PR 全集 + Y03-Y05 + M02-M05                      | Chromium、Firefox、WebKit |
| 失败诊断    | trace、DOM/style diff、错误通道、server/HMR 日志 | 失败用例对应浏览器        |

Firefox/WebKit 不重复完整 HMR 矩阵，主要验证各 adapter 的 production hydration。测试最多重试一次并保留首次失败 trace；依赖重试才能通过的 hydration/HMR 用例视为竞态缺陷。

## 与现有测试的关系

保留并强化：

- `packages/vite-plugin` 的 module graph、CSS merge、manifest link、invalidation 和 reload policy 单元测试；
- `packages/web-widget` 的边界、style controller、polyfill 和 server serializer 单元测试；
- `playgrounds/router` 的展示页面、HTTP 快照和少量人工 smoke；
- production server 对构建产物和资源可访问性的协议断言。

由新套件接管：

- computed style 与样式隔离；
- hydration node identity、事件和 recoverable error；
- HMR/full reload 策略的浏览器级验证；
- client/server 版本错位和 hydration 竞态；
- 多框架 Widget hydration。

不要立即删除现有快照。新套件稳定运行后，只删除被语义断言完全覆盖且没有独立协议价值的大快照。

## 实施待办

本节是实施状态的唯一来源。每次只推进一个未完成事项；只有该事项的代码、自动化测试和下述验收全部完成后，才把 `[ ]` 改为 `[x]`。部分完成、仅本地通过或仍依赖人工验证时不得打勾。完成事项时在同一个提交或 PR 中更新本清单。

- [x] **T01：建立独立 workspace。** 创建 `tests/integration` 私有包，在 `pnpm-workspace.yaml` 注册 `tests/*`，接入 Playwright，并提供最小 dev/production fixture 页面。验收：包可独立启动、构建和运行一个 Chromium smoke test，不依赖 playground。
- [x] **T02：建立测试运行基础设施。** 实现随机端口、健康检查、server 生命周期、临时 fixture 工作副本、源文件修改与 watcher 同步、失败 trace/console/server log。验收：强制失败后 server 正常退出，Git 工作区无 fixture 差异。
- [x] **T03：建立场景注册表和浏览器断言。** 实现 `cases.ts`、重复 ID/枚举覆盖校验、computed style、navigation identity、Widget state 和资源错误 helper。验收：测试故意删除一个维度值时会明确失败。
- [x] **T04：完成 CSS 静态矩阵 C01-C08。** 覆盖 relative/alias、plain/module、Vue scoped/scoped+module、route/widget，在 dev 首次加载和 production Chromium 中运行。验收：同时验证 SSR class/selector、资源可访问性和浏览器 computed style。
- [x] **T05：建立结构化 hydration 错误通道。** 定义并实现 `web-widget:hydration-error`，接入 module import、adapter bootstrap、recoverable mismatch 和 boundary recovery，测试事件 payload 与未处理异常。验收：不能依赖 React/Vue console 文案判断通过或失败。
- [x] **T06：完成 hydration 基线 Y01-Y02。** 覆盖 React 和 Vue 3 的 dev/production light Widget。验收：SSR node identity、mount root、computed style、单次事件绑定、更新/卸载和错误数组全部符合预期。
- [x] **T07：完成 dev 更新策略 U01-U08。** 覆盖普通 CSS、CSS Modules、Vue scoped/style module、共享 Widget、server-only route 和 route structure。验收：每种 mutation 的 HMR/full reload 次数、状态保留和 hydration 结果符合策略表。
- [x] **T08：完成 CSS Module 版本错位 M01。** 在 SSR HTML 返回后、客户端 bootstrap 前修改 module CSS。验收：最终 server/client class map 一致，没有 hydration error；测试能稳定区分 websocket full-reload 丢失。
- [x] **T09：完成通用版本错位 M02-M05。** 覆盖 component DOM 变化、缓存客户端资产、hydration 中再次更新和 Vue SFC module 错位。验收：每个 adapter 有明确恢复或失败语义，不留下半水合 DOM 或重复事件。
- [x] **T10：扩展框架 hydration Y03-Y05。** 增加 Preact、Solid、Svelte production smoke；Vue 2 按上述范围决定排除。验收：每个框架均能完成 hydration 和一次交互，且无未声明错误。
- [x] **T11：接入分层 CI。** PR 运行 Chromium 核心集合，main/发布前运行扩展框架和 Firefox/WebKit 集合，保留首次失败 trace。验收：required check 可重复运行，mutation suite 串行且不依赖 retry 才通过。
- [x] **T12：收敛旧测试职责。** 新套件稳定后，删除被语义断言完全覆盖的冗余 playground 快照，保留展示页面与有独立协议价值的 smoke test。验收：删除清单逐项注明由哪个新 case 覆盖。

T12 删除清单：

- playground `/style` 的 dev/production body 快照：由 C01（route plain CSS）和 C05（light Widget plain CSS）覆盖浏览器样式语义；HTTP CSS 交付继续由 `server.test.ts` 保留。
- playground `/vue-module-css` 的 dev/production body 快照：由 C04 和 C08（Vue scoped + module 的 route/Widget 组合）覆盖 class、scope selector 与 computed style；SSR build export 和资产协议继续由 `build.test.ts`、`server.test.ts` 保留。
- playground `/react-and-vue` 的 dev/production body 快照：由 Y01 和 Y02 覆盖 React/Vue 3 hydration identity、事件与错误通道；跨框架 SSR 分组继续由 `server.test.ts` 和 framework catalog 测试保留。

## 首阶段完成标准

T01-T12 全部打勾后，首阶段测试套件应满足：

- C01-C08 在 dev 首次加载和 production Chromium 全部通过；
- Y01-Y05 hydration 后 identity、computed style 和事件正确；
- U01-U08 的更新策略、刷新次数和状态行为符合表中契约；
- M01-M05 最终进入确定的一致或错误状态，不存在静默半水合；
- 没有未声明的 hydration warning、recoverable error、资源 404 或未处理异常；
- mutation suite 不修改 Git 工作区；
- playground 不再承担核心集成回归职责。

这组门槛验证的是 SSR 到客户端更新的完整一致性。CSS 是重要输入，但测试套件最终保护的是模块、DOM、样式和运行状态共同组成的用户行为。
