# RFC：Web Router 混合编译匹配算法

状态：已实现

## 摘要

这是 Web Router 的路由匹配性能优化策略：现有 matcher benchmark 显示，典型路由组合和 10,000 条静态路由的吞吐分别达到逐条 URLPattern 基线的 1.55 倍和 1.59 倍。

## 动机

Web Router 选择 Web 标准 `URLPattern` 作为路由接口，以获得跨运行时一致的路径语法和匹配语义，包括参数、可选段、正则约束、通配符、百分号编码和 dot-segment 规范化。

直接实现通常需要为每条路由创建一个 `URLPattern`，并在请求到达时依次执行 `URLPattern.exec()`。这种方式简单且语义可靠，但匹配成本随路由数量线性增长；路由表扩大后，候选检查、捕获组和参数对象分配会成为请求热路径上的主要开销。

因此需要在保持 `URLPattern` 接口及其复杂路径语义的前提下，为常见路由建立更高效的候选索引，避免每次请求遍历整个路由表。

## 提议

采用混合编译匹配器替代逐条执行 `URLPattern`：静态路径使用精确查找表，简单动态路径根据桶大小使用正则或 segment trie，复杂路径通过字面量前缀筛选后交由 `URLPattern` 验证。编译计划按 method 惰性生成，并缓存近期 method + pathname 的匹配计划。

该方案将常见路由的匹配成本从遍历路由表转化为精确查找或路径深度相关的索引遍历，同时不重新实现复杂 URLPattern 语义。

## 详细设计

### 路由分类

`add()` 首先构造 `URLPattern`，因此非法 pattern 在注册时失败。随后根据规范化后的 `pattern.pathname` 分类。

| 类别         | 示例                                         | 注册期表示                     | 请求期验证                         |
| ------------ | -------------------------------------------- | ------------------------------ | ---------------------------------- |
| 静态路径     | `/assets/app.js`                             | `Map<pathname, routes[]>`      | 字符串精确查找                     |
| 简单参数路径 | `/users/:id`                                 | 静态 token + 参数 token        | 小桶正则或 segment trie            |
| 复杂路径     | `/users/:id?`、`/item/:id(\\d+)`、`/files/*` | 字面量前缀 + 原始 `URLPattern` | 前缀筛选后执行 `URLPattern.exec()` |

“简单”是一个有意收窄的集合：路径必须以 `/` 开头，每段只能是安全静态文本或合法命名的完整参数段。任何无法证明可由内部匹配器等价处理的 pattern 都进入复杂路径。

### 编译模型

#### 注册期元数据

每条路由获得单调递增的 `routeId`，用于恢复注册顺序。注册期还记录：

- method、handler 和规范化后的 pattern pathname
- 是否为静态路径
- 简单路径的 token、参数名及参数所在 segment 下标
- 复杂路径在第一个动态语法前的保守字面量前缀
- 作为语义后备的 `URLPattern` 实例

新增路由会清空所有 method 编译计划与匹配计划缓存。这样注册可以保持简单，同时保证后续请求不会读取陈旧索引。

#### 按 method 惰性编译

首次匹配某个 method 时，路由表被筛选为“该 method 或 `ALL`”，并生成独立的 `CompiledPlan`。后续相同 method 直接复用。

编译计划包含：

- `staticRoutes`：静态 pathname 精确表
- `linearBuckets`：小规模简单动态路由桶
- `trieMatcher`：大规模简单动态路由共享的 segment trie
- `fallbackMatcher`：复杂路径的字面量前缀 trie

简单动态路由先按首个 token 分桶。桶大小不超过 8 时，每条路由编译一个锚定正则；更大的桶进入共享 trie。阈值 8 是实现常量，不是 API 承诺，可由 benchmark 调整。

小桶使用正则是因为少量直接执行通常比构造和遍历额外索引更便宜；大桶使用 trie，使候选选择主要取决于请求路径深度而不是桶内路由数量。

### 匹配流程

#### 1. 安全快速路径判定

内部匹配器仅处理以 `/` 开头、且不需要 dot-segment 规范化的 pathname。路径若包含独立的 `.`、`..` 或其 `%2e` 编码形式，则绕过内部索引，逐条交给 `URLPattern`，避免快速路径改变标准规范化语义。

仅含静态路由时可直接从全局静态表返回；该路径不需要创建 method 编译计划。

#### 2. 匹配计划缓存

缓存键为 `method + NUL + pathname`。命中后缓存项被移动到 Map 尾部，以维护 LRU 顺序。

缓存保存的是：

- `routeId`
- 已解码参数的 `[name, value]` 列表
- 是否需要为无参数的 URLPattern 匹配创建新对象

它不缓存最终结果和 params 对象。每次命中仍物化新的动态 params，从而同时满足低匹配成本和引用隔离契约。缓存上限为 128；超过上限时删除最旧条目。

#### 3. 候选收集

未命中缓存时按以下来源收集候选：

1. 精确命中的静态路由
2. 大桶 trie 匹配的简单动态路由
3. 首 segment 对应小桶及无静态首段通用桶中的正则匹配
4. 复杂路径前缀 trie 选出的候选，经 `URLPattern.exec()` 二次确认

pathname 只在 trie 确实需要时扫描一次。扫描结果保存为 segment 的 `[start, end)` 下标，参数值仅在最终候选上通过 `slice()` 提取，避免为所有 segment 预先创建字符串。

#### 4. Segment trie

trie 节点至多包含：

- `Map<string, Node>` 静态子节点
- 一个参数子节点
- 在当前深度终止的路由列表
- 终端通配符路由列表（用于复杂前缀候选索引）

遍历使用显式栈，不依赖递归。静态分支和参数分支都可能成立，因此两者都会入栈；当前实现后压入静态分支，使其先被访问。这个访问次序只影响候选产生顺序，最终结果仍按 `routeId` 排序。

复杂路径 trie 中的通配符表示“此前缀之后仍可能匹配”，不是对用户 pattern 的自行解释。候选仍必须通过原始 `URLPattern`。

#### 5. 参数与结果物化

参数提取分三条路径：

- trie：根据预编译的 segment 下标切片
- 小桶正则：读取捕获组
- fallback：读取 `URLPatternResult.pathname.groups`

只有包含 `%` 的参数才调用 `decodeURIComponent()`。候选超过一个时按 `routeId` 升序排序，随后创建最终 `[handler, params, patternPathname]` 数组。

### 复杂度

令：

- `R` 为该 method 的路由数
- `S` 为 pathname 的 segment 数
- `B` 为命中的小桶大小，且 `B <= 8`
- `C` 为复杂前缀索引选出的 URLPattern 候选数
- `M` 为最终匹配数

| 阶段            | 时间复杂度                             | 说明                           |
| --------------- | -------------------------------------- | ------------------------------ |
| 注册单条路由    | `O(pattern length)`                    | 创建 URLPattern 与分类元数据   |
| 首次编译 method | `O(R * average depth)`                 | 筛 method、分桶、构建 trie     |
| 静态匹配        | 平均 `O(1 + M)`                        | Map 查找并物化结果             |
| 简单动态大桶    | 平均 `O(S + M)`                        | 分支重叠时与实际探索节点数相关 |
| 简单动态小桶    | `O(B * pathname length + M)`           | `B` 有固定上限                 |
| 复杂路径        | `O(S + C * URLPattern cost + M log M)` | 性能取决于前缀选择性           |
| LRU 命中        | `O(M)`                                 | 跳过候选选择，仍物化结果       |

最坏情况下不能宣称 `O(S)`：大量相同形状的参数路由会在 trie 中形成重叠匹配，大量缺少字面量前缀的复杂路由会使 `C` 接近 `R`，而返回所有匹配本身至少需要 `O(M)`。

## 性能测试

### 框架性能对比

以下端到端 HTTP 结果来自 2026-07-16 19:15:23 生成的 `performance-chart-2026-07-16T11-15-23-686Z.txt`。所有框架使用相同的静态、必选参数和嵌套参数路由，测试环境为 Node.js 24.4.1、macOS arm64；使用 50 个并发连接、4 路 pipelining，每轮预热 2 秒、测试 5 秒，共运行 3 轮。

```text
web-router          ██████████████████████████████████████████████████ 80518 req/s (100.0%)
fastify             ████████████████████████████████████████████████░░ 77843 req/s (96.7%)
koa                 █████████████████████████████████████████░░░░░░░░░ 66224 req/s (82.2%)
hono                ████████████████████████████████████████░░░░░░░░░░ 65034 req/s (80.8%)
web-router#manifest ████████████████████████████████████░░░░░░░░░░░░░░ 58026 req/s (72.1%)
express             █████████████████████████████████░░░░░░░░░░░░░░░░░ 52797 req/s (65.6%)

Legend: █ = Performance bar, ░ = Empty space
```

Web Router 在该组测试中吞吐最高，比 Fastify 高 3.4%，但不足以单凭一次本机 benchmark 断言稳定领先；相较 Koa、Hono 和 Express，吞吐分别高 21.6%、23.8% 和 52.5%。该对比测量完整服务器链路，除路由算法外还包含各框架的 Node adapter、Request/Response 创建、handler 调度和 socket 开销。

图中的 `web-router` **不是 manifest 模式**。benchmark 通过 `new WebRouter()` 创建应用，以 `app.get(pathname, handler)` 逐条注册 handler，并使用官方 `NodeAdapter` 启动 Node HTTP 服务。这条路径主要测量底层路由、应用调度和 Node adapter，未包含 manifest 模式的完整模块运行时。

`WebRouter.fromManifest()` 是面向 Web Widget 生产应用的声明式启动方式，会从模块清单建立完整应用管线。它与直接注册模式共用底层 matcher，但包含额外的模块运行时开销，因此作为 Web Router 自身的模式单列，不参与框架间的排名比较。

### 匹配算法对比

以下 matcher 微基准来自 `router-benchmark-results-2026-07-16T08-48-44-252Z.json`。测试环境为 Node.js 24.4.1、macOS arm64 和原生 `URLPattern`；每个场景预热 150 ms，采集 3 个 300 ms 样本并取中位数。`radix-tree` 是本文描述的混合匹配器，`url-pattern` 是逐条 URLPattern 匹配基线。

| 场景                        | 路由数 |      混合匹配器 | URLPattern 基线 | 相对性能 |
| --------------------------- | -----: | --------------: | --------------: | -------: |
| 典型静态/参数路由组合       |     10 | 11.31 M match/s |  7.31 M match/s |    1.55x |
| 静态路由，命中最后一条      | 10,000 | 41.86 M match/s | 26.39 M match/s |    1.59x |
| 同属 `/api` 的动态路由      | 10,000 |  4.52 M match/s |  3.23 M match/s |    1.40x |
| 分散首 segment 的动态路由   |  1,000 |  4.95 M match/s |  5.77 M match/s |    0.86x |
| 五种 method 混合的动态路由  |  1,000 |  4.76 M match/s |  3.26 M match/s |    1.46x |
| 终端通配符路由              |  1,000 |  3.63 M match/s |  0.18 M match/s |   19.95x |
| 同一路径命中 100 条参数路由 |    100 |  0.24 M match/s |  0.09 M match/s |    2.72x |

这些数据表明，优化收益主要来自大路由表中的候选筛选，并非所有分布都更快。1,000 条动态路由拥有不同首 segment 时，URLPattern 基线在该次测试中快约 16%；这类反例应保留为后续优化和回归判断的基准。

matcher 微基准在计时前完成正确性检查、batch 校准和 warmup，并重复调用有限的 pathname，因此表示稳定路由表上的热匹配吞吐，不覆盖冷启动成本。报告中的 `setupMs` 和 `firstMatchUs` 应分别用于观察注册与惰性编译成本。

## 测试场景覆盖

各 matcher benchmark suite 对应的算法压力如下：

| Suite                | 主要验证点                         |
| -------------------- | ---------------------------------- |
| `scale-static`       | 静态 Map 是否与路由数解耦          |
| `scale-shared`       | 同首段大桶进入 trie 后的扩展性     |
| `scale-distributed`  | 首段分布带来的候选隔离             |
| `hit-position`       | 性能是否依赖注册位置               |
| `method-selectivity` | method 级编译计划的筛选收益        |
| `wildcard`           | 复杂前缀索引与 URLPattern 验证成本 |
| `overlap`            | 返回所有匹配时的输出敏感成本       |
| `complex-urlpattern` | `C` 增大时 fallback 的退化趋势     |

报告比较或回归判断必须固定 Node 版本、URLPattern 实现、硬件、配置和代码版本。短样本结果适合 smoke test，不应作为发布性能结论。

## 正确性不变量

- `URLPattern` 构造失败必须在 `add()` 时转为 `UnsupportedPathError`
- `ALL` 路由参与任意 method 的编译与匹配
- 多个命中必须按注册顺序返回
- 静态、简单动态和复杂路径可同时命中同一 pathname
- 百分号编码参数只解码一次
- 动态 params 在重复 `match()` 调用间不得复用对象
- 需要路径规范化时必须由 URLPattern 完整匹配
- `add()` 后不得复用旧编译计划或旧 LRU 项

## 权衡与限制

### 写入换读取

注册会创建 URLPattern 和分类元数据；首次使用每个 method 还会构建独立计划。该选择适合“启动期注册、运行期高频读取”的服务端路由器。运行中频繁 `add()` 会反复清空计划，不是优化目标。

### 内存

每条路由同时保留 URLPattern 与优化元数据，并可能被 method 计划引用。不同 method 的计划会重复部分索引结构；LRU 另保存最多 128 组轻量匹配描述。这些开销换取请求期更少的匹配与分配。

### 复杂路由退化

复杂 pattern 的字面量前缀越短，候选筛选能力越弱。无前缀的大量复杂路由仍可能退化为近似线性 URLPattern 执行。设计优先保证语义正确，而不是对任意 pattern 承诺同等吞吐。

### 缓存工作集

128 项 LRU 对热点 URL 有效，但高基数 pathname（例如参数值持续变化）命中率可能很低。缓存键包含原始 pathname，因此 `/users/1` 与 `/users/2` 是不同条目。调整上限需要同时衡量吞吐、参数字符串驻留和实际访问分布。
