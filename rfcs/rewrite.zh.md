# RFC：运行时 Rewrite（内部 URL 重写）

| 字段     | 值                                                                    |
| -------- | --------------------------------------------------------------------- |
| 状态     | Draft                                                                 |
| 作者     | @tangbin（草案）                                                      |
| 创建日期 | 2026-05-20                                                            |
| 影响范围 | `@web-widget/web-router`、`@web-widget/schema`、`@web-widget/helpers` |

## 摘要

在**不改变浏览器地址栏 URL** 的前提下，将请求在服务端改由另一条内部路径（同源）处理，由对应的 Route / Middleware 生成最终响应。

本 RFC 界定**运行时、可编程**的 rewrite 设计，不包含声明式配置（如 `next.config.js` 的 `rewrites`）、构建期路由表改写或平台配置文件。

```ts
return context.rewrite(new URL('/internal', request.url));
```

## 动机

### 与 Redirect 的区别

|            | Rewrite                      | Redirect（已有 `redirect()`） |
| ---------- | ---------------------------- | ----------------------------- |
| 浏览器 URL | 不变                         | 变为 `Location` 目标          |
| 路由       | 服务端重新匹配内部路径       | 客户端发起新请求              |
| 典型场景   | 门面路径、实验分流、渐进迁移 | 永久跳转、登录重定向          |

项目已有 `redirect()` 与对外 `proxy`，缺少**框架级内部路由重写**。自行 `dispatch` 二次请求易导致 params、中间件顺序、错误处理与框架行为不一致。

### 典型用例

- 对外路径与对内路由解耦（如 `/v1/*` → `/internal/*`）
- 结合 flags / cookie 分流到不同页面实现
- 保留对外 URL 的审计与 SEO，对内走新 Route（含 SSR）

### 非目标

- 声明式 rewrites 配置、构建期 routemap 改写
- rewrite 到外部 origin（归 `@web-widget/helpers/proxy`）
- rewrite 到 Action 端点
- 客户端 `context.rewrite()`

## 设计约束

当前 Web Router 对每个请求**只匹配一次路由**再进入 handler 链；`redirect()` 返回的 `Response` 不会触发重新匹配。Rewrite 要在**同一请求生命周期内**改由另一条内部路径完成 handler 链，并把该链路的 **`Response` 交回**给调用方（与 `next()` 交给上游的性质相同），而非 Context 上的薄封装。

## 目标

- 提供 `context.rewrite(destination)`：内部改由 `destination` 匹配并执行对应模块，**返回该链路的 `Response`**
- `context.request` 始终表示**对外 URL**（与地址栏一致）
- 返回的 `Response` 与 `next()` 一样，可原样 `return`、可先改 headers 再 `return`、可由外层 middleware 继续加工

## 公开 API

在既有 `FetchContext`（含 `request`、`params`、`state` 等）上**新增**：

```ts
interface FetchContext {
  /**
   * 内部重写到 destination（相对路径相对于 request.url 解析）。
   * 返回目标路径 handler 链的 Response，用法同 next()，见下文「返回值」。
   */
  rewrite(destination: string | URL): Response | Promise<Response>;
}
```

## 核心语义

### 对外 URL 与对内路由

- 业务继续以既有 `context.request` 为准（鉴权、日志、canonical）；rewrite 不改变其表示对外 URL 的语义。
- 框架在内部根据 `destination` 做路由匹配并执行目标链；匹配用 `params` 随目标路径更新。

### 返回值与中间件模型

`rewrite()` 在内部按 `destination` **重新匹配并跑完**该路径上的 handler 链（Route、该路径 middleware 等），得到一条真实的 `Response`，再交还给调用方。对该返回值的处理方式与 `await next()` **相同**：

- 可直接 `return await ctx.rewrite(...)`
- 可先改 headers / body 再 `return`
- 外层 middleware 在 `const res = await next()` 中拿到的，可以是内层 `rewrite()` 产生并经内层加工后的 `Response`

与 `redirect()` 的区别在于：`redirect()` 返回的 3xx 会改变浏览器后续请求；`rewrite()` 返回的是**内部路由链的实质响应**（通常 2xx 页面等），浏览器 URL 仍为 `context.request`。

| 能力         | 客户端 URL | 返回的 `Response` 含义              |
| ------------ | ---------- | ----------------------------------- |
| `next()`     | 不变       | 当前栈下游链路的处理结果            |
| `rewrite()`  | 不变       | **目标路径**上 handler 链的处理结果 |
| `redirect()` | 改变       | 指示客户端跳转的 3xx                |

### 重新匹配

`rewrite()` 触发时：

1. 按 `destination` 匹配路由；目标链路上的 handler 使用匹配后的 `params`（`context.request` 仍表示对外 URL）
2. 执行该路径上的 handler 链直至得到 `Response`
3. **不**默认重跑进入本次请求时已在全局层执行过的 middleware

### 与 `next()` 的关系

- 在**当前 handler** 内，`rewrite()` 与 `next()` 二选一：前者把「后续处理」委托给**另一条路径的链**，后者委托给**当前路径的下游**
- `return ctx.rewrite(...)` 之后不应再对**当前栈**调用 `next()`
- 已在 `await next()` 拿到 `Response` 之后再 `rewrite`：语义冲突，应拒绝

### Query

遵循 `URL` 解析：`destination` 未带 search 时**保留**原请求 query；显式写在 `destination` 中的 query 优先。

### 错误、安全与缓存

- 重写目标不存在或抛错：与直接访问该路径一致，走现有 404 / fallback
- 仅允许同源或相对 `destination`
- 缓存与 `Vary` 以**对外 URL** 为基准
- 须限制 rewrite 深度并检测环

### SSR

Rewrite 到 Route 时，应走与直接命中该 Route 相同的渲染与 layout 管道。

## 与现有能力的关系

| 能力                         | 关系                                            |
| ---------------------------- | ----------------------------------------------- |
| `redirect()`                 | 改变客户端 URL；不重新匹配                      |
| `proxy` / `fetchWithProxy`   | 对外 origin；与内部 rewrite 职责分离            |
| `dispatch(new Request(...))` | 手工 workaround；实现后文档引导改用 `rewrite()` |

## 行业参考

| 框架    | 做法                                                      |
| ------- | --------------------------------------------------------- |
| Next.js | `NextResponse.rewrite()`，返回 Response 形态，URL 栏不变  |
| Astro   | `context.rewrite()`；可选 `originPathname` 表示改写前路径 |
| 其它    | 多无一等 rewrite，或平台层 `fetch` 自建语义               |

共性：`return` 结束当前 middleware/handler；区分对外 URL 与对内路径；少暴露 rewrite 链或第二个 `Request`。

## 待探讨

1. **`destination` 是否接受 `Request`**（携带自定义 headers 的 internal 请求）
2. **全局 middleware 在 rewrite 后是否允许 opt-in 重跑**
3. **与 `ApplicationOptions.proxy` 的先后顺序**（对外 URL 与 forwarded 头的一致性）
4. **默认最大 rewrite 深度与环检测策略**（数值与错误响应形态）
5. **是否在后续版本公开 `originPathname`**（对标 Astro，对比 `ctx.state`）

## 示例

```ts
export const handler = defineMiddlewareHandler(async (ctx, next) => {
  const url = new URL(ctx.request.url);
  if (url.pathname.startsWith('/v1/')) {
    const res = await ctx.rewrite(
      new URL(url.pathname.replace(/^\/v1/, '/internal'), url)
    );
    res.headers.set('x-routed-by', 'v1-gateway');
    return res;
  }
  return next();
});
```

访问 `/v1/products/42` 时地址栏不变；响应体来自 `/internal/products/42` 的 Route，外层 middleware 仍可改写 headers 后返回。

## 参考

- [Next.js `NextResponse.rewrite`](https://nextjs.org/docs/app/api-reference/functions/next-response#rewrite)
- [Astro `context.rewrite` / `originPathname`](https://docs.astro.build/en/reference/api-reference/#rewrite)
- 项目内：`docs/helpers/redirect.md`
