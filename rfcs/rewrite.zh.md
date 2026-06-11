# RFC：运行时 Rewrite（内部 URL 重写）

状态：实施中

## 摘要

在不改变浏览器地址栏 URL 的前提下，将服务端对内路由切换到另一条同源路径，由对应的 Route / Middleware 生成最终响应。

本 RFC 界定**运行时、可编程**的 rewrite 设计，不包含声明式配置（如 `next.config.js` 的 `rewrites`）、构建期路由表改写或平台配置文件。

典型用法：

```ts
context.rewrite('/internal');
return next();
```

## 动机

应用常需要**对外 URL 与对内路由分离**：浏览器地址栏保持 `/v1/products`，服务端改由 `/internal/products` 的 Route 处理（含 SSR）。这应在**同一次 HTTP 请求**内完成，而不是返回 3xx 让客户端重新请求——后者由已有的 `redirect()` 负责。

`rewrite()` 填补的是框架级**内部路由切换**能力：在 middleware 中改写对内路径，并令后续 handler 栈按新路径继续执行。

## 非目标

- 声明式 rewrites 配置、构建期 routemap 改写
- rewrite 到外部 origin（归 `@web-widget/helpers/proxy`）
- rewrite 到 Action 端点
- 客户端 `context.rewrite()`

## 核心抽象

`context.rewrite(destination)` 的本质是更新 Context 的对内路由视图，语义上等价于：

```ts
context.request = new Request(destination, context.request);
```

并附带框架必需的调度副作用（见下文「重新匹配」与「Route 激活」）。

这与 Koa 的 `ctx.path = newPath` 同类：`rewrite` 之后，所有后续读取 `context.request.url` 的逻辑看到的都是**对内路径**。与 Koa 不同的是，Web Router 存在**被激活的路由模块**；`context.request` 改变后，`context.module` 及其衍生状态（`meta`、`html` 等）必须随之失效并在后续 handler 中按新路径重新激活。

浏览器地址栏 URL 始终不变；通过 `context.originalRequest` 可以访问原始的请求（见「公开 API」）。

## 目标

- 提供 `context.rewrite(destination)`：更新对内 `Request`，失效 route 状态，重新匹配尚未执行的 handler 栈
- 典型模式为 `rewrite(...); return next()`，由后续栈经 `next()` 产生并回传 `Response`
- `context.originalRequest` 始终指向客户端原始请求
- 全局 middleware（`*`）在请求级只执行一次

## 公开 API

在既有 `FetchContext` 上扩展：

```ts
interface FetchContext {
  /**
   * 当前对内路由所用的 Request。
   * rewrite 之后其 URL 为 destination；首次进入请求时为客户端原始 Request。
   */
  request: Request;

  /**
   * 客户端原始 Request。
   * 始终指向本次 HTTP 请求进入框架时的 Request，rewrite 不改变此引用。
   */
  originalRequest: Request;

  /**
   * 内部重写到 destination（相对路径相对于 context.request.url 解析）。
   * 更新 context.request，失效 route 激活状态，并重新匹配剩余 handler 栈。
   * 不返回 Response；应配合 return next() 使用。
   */
  rewrite(destination: string | URL): void;
}
```

## 核心语义

### context.request 与 originalRequest

| 字段                      | 含义                                                                              |
| ------------------------- | --------------------------------------------------------------------------------- |
| `context.request`         | 当前对内路由所用的 `Request`；`rewrite` 后更新为 `new Request(destination, prev)` |
| `context.originalRequest` | 客户端原始 `Request`；整个请求生命周期内不变                                      |

需要对外 URL（鉴权、日志、canonical、SEO、缓存键）时，应读取 `context.originalRequest.url`（或其在 `context.state` 中的等价快照），而非假设 `context.request.url` 与地址栏一致。

### 与 next() 的关系

| 能力        | 作用                                                         |
| ----------- | ------------------------------------------------------------ |
| `rewrite()` | 切换对内 `Request`，失效 route 状态，重新匹配剩余 handler 栈 |
| `next()`    | 在（可能已更新的）栈上继续执行下游 handler                   |

规则：

- 允许且推荐：`context.rewrite(...); return next()`
- 禁止：`await next()` 完成后再 `rewrite()`（与 Koa 一致，语义冲突）
- 禁止：`rewrite()` 后在不 re-match 的情况下继续旧路径的 handler 栈（由实现保证）

`rewrite()` 不返回 `Response`。`Response` 由 `rewrite` 之后的新栈经 `next()` 产生，并可被外层 middleware 读取、修改后返回。

### 重新匹配

`rewrite()` 触发时：

1. 将 `context.request` 设为 `new Request(resolvedDestination, context.request)`（同源校验见下文）
2. 失效当前 route 激活状态（`module`、`meta`、`render`、`html`、`_handler` 等）
3. 按新的 `context.request` 重新匹配尚未执行的 handler，替换当前栈的剩余部分
4. 不重跑本请求中已执行过的全局 middleware（`*`）

已在当前 handler 之前执行完毕的 middleware 不受影响；`return next()` 进入的是与新对内路径对应的下游栈。

### Route 激活

不变量：Context 上已激活的 route module 必须对应当前 `context.request` 的匹配结果。

- `rewrite()` 时：清除 route 衍生状态
- 后续 handler 进入时：Engine 按当前 `context.request` match 到的 module 重新激活
- `params`、`pathname`：随当前执行的 matched handler 更新（与直接访问目标路径一致）

Rewrite 到 Route 时，应走与直接命中该 Route 相同的渲染与 layout 管道。

### Query

不自动继承当前 `context.request` 的 query；对内 query 仅来自 `destination` 自身。对外 query 通过 `context.originalRequest.url` 读取。

### 错误与安全

- 重写目标不存在或抛错：与直接访问该路径一致，走现有 404 / fallback
- 仅允许同源或相对 `destination`；跨 origin 或非法 `destination` 时 `rewrite()` 同步抛出 `HTTPException`
- 须检测 rewrite 环：同一请求内不得 rewrite 到已访问过的 destination（pathname + search）；再次命中时同步抛出 `HTTPException`（status 508）
- `await next()` 完成后再调用 `rewrite()`：同步抛出 `Error`（与 Koa 一致）

### 缓存

Rewrite 不改变浏览器地址栏 URL，但会切换对内 route。不同缓存层使用的键不同：

**HTTP 共享缓存（CDN / 浏览器）**

以 `context.originalRequest.url`（客户端可见 URL）为缓存键基准。边缘缓存与浏览器只感知对外请求；同一对外 URL 若总是 deterministic 地 rewrite 到同一对内路径，不必按对内路径再分桶。

**应用内缓存 / 失效**

以当前对内 route 路径（rewrite 后 `context.request` 的 match 结果）为基准。若框架提供按 path 失效的能力（类似 Next.js `revalidatePath`），应对 destination 路径操作，而非地址栏中的 source path。

**Vary**

遵循 HTTP 标准语义：`Vary` 声明哪些请求头会导致响应不同，而非 URL 本身。框架不因 rewrite 自动添加 URL 相关 `Vary`。需要按对外 URL 或自定义维度区分响应时，由 route 或 middleware 自行设置 `Cache-Control` / `Vary`。

### 控制流对比

| 能力                   | 浏览器 URL | `context.request` | 返回值                           |
| ---------------------- | ---------- | ----------------- | -------------------------------- |
| `next()`               | 不变       | 不变              | 下游栈的 `Response`              |
| `rewrite()` + `next()` | 不变       | 更新为对内路径    | 新栈的 `Response`（经 `next()`） |
| `redirect()`           | 改变       | 不适用            | 3xx `Response`                   |

## 与现有能力的关系

| 能力                       | 关系                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `redirect()`               | 改变客户端 URL；不更新对内 `context.request`                         |
| `proxy` / `fetchWithProxy` | 对外 origin；与内部 rewrite 职责分离                                 |
| 直接赋值 `context.request` | 不推荐；应使用 `context.rewrite()` 以集中同源校验、环检测与 re-match |

## 外部参考

| 框架 / 生态 | 做法                                                                |
| ----------- | ------------------------------------------------------------------- |
| Koa         | `ctx.path` / `ctx.url` 可变；改路径后 `next()` 下游按新路径理解请求 |
| Astro       | `context.rewrite()`；`originPathname` 表示改写前路径                |
| Next.js     | `NextResponse.rewrite()`；内部路由与对外 URL 分离                   |

Web Router 的 rewrite 对齐 Koa 的可变路由视图模型，并扩展 route module 激活与剩余栈 re-match 语义。

## 示例

### Gateway middleware

```ts
export const handler = defineMiddlewareHandler(async (ctx, next) => {
  const url = new URL(ctx.request.url);
  if (url.pathname.startsWith('/v1/')) {
    ctx.rewrite(url.pathname.replace(/^\/v1/, '/internal'));
    const res = await next();
    res.headers.set('x-routed-by', 'v1-gateway');
    return res;
  }
  return next();
});
```

访问 `/v1/products/42` 时：

- 浏览器地址栏仍为 `/v1/products/42`
- `ctx.originalRequest.url` 为 `/v1/products/42`
- `rewrite` 之后 `ctx.request.url` 对应 `/internal/products/42` 的对内路径
- 响应体来自 `/internal/products/42` 的 Route；外层 middleware 仍可改写 headers

### 读取对外 URL

```ts
export const handler = defineMiddlewareHandler(async (ctx, next) => {
  const externalPath = new URL(ctx.originalRequest.url).pathname;
  ctx.state.externalPath = externalPath;
  return next();
});
```

## 参考

- [Koa Context](https://koajs.com/#context)
- [Astro `context.rewrite` / `originPathname`](https://docs.astro.build/en/reference/api-reference/#rewrite)
- [Next.js `NextResponse.rewrite`](https://nextjs.org/docs/app/api-reference/functions/next-response#rewrite)
- 项目内：`docs/helpers/redirect.md`
