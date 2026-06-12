# RFC：运行时 Rewrite（内部 URL 重写）

状态：已实现

## 摘要

在不改变浏览器地址栏 URL 的前提下，将服务端对内路由切换到另一条同源路径，由对应的 Route / Middleware 生成最终响应。不包含声明式配置、构建期 routemap 改写或平台配置文件。

```ts
return context.rewrite('/internal');
```

## 动机

应用常需要**对外 URL 与对内路由分离**（地址栏 `/v1/products`，对内由 `/internal/products` 处理含 SSR），且须在**同一次 HTTP 请求**内完成——`redirect()` 负责 3xx 场景，`rewrite()` 负责内部切换。

## 目标

- 提供 `context.rewrite(input, init?)`，签名对齐 `Request` 构造器
- 典型模式：`return context.rewrite(...)`，与 `return next()`、`return redirect(...)` 同级
- rewrite 后 re-match 时，本请求中**已开始执行**的 handler 不再重复执行

## 非目标

- 声明式 rewrites 配置、构建期 routemap 改写
- rewrite 到外部 origin（归 `@web-widget/helpers/proxy`）
- rewrite 到 Action 端点
- 客户端 `context.rewrite()`
- 用户代码对 `context.request` 的赋值

## 公开 API

```ts
interface FetchContext {
  readonly request: Request; // 对内路由；rewrite 后由框架更新
  readonly originalRequest: Request; // 客户端原始 Request
  rewrite(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Response | Promise<Response>;
}
```

`context.rewrite(input, init?)` 与 `new Request(input, init ?? context.request)` 同形；相对 URL 相对于调用时的 `context.request.url` 解析。未传 `init` 时继承当前对内 Request 的 method、headers、body 等。

| 调用                     | 等价构造                                                |
| ------------------------ | ------------------------------------------------------- |
| `rewrite('/path')`       | `new Request('/path', context.request)`                 |
| `rewrite('/path', init)` | `new Request('/path', { ...context.request, ...init })` |
| `rewrite(request)`       | 该 `Request`（须同源）                                  |
| `rewrite(request, init)` | `new Request(request, init)`                            |

## 行为规范

### Request 视图

| 字段                      | 可写性               | 含义                                         |
| ------------------------- | -------------------- | -------------------------------------------- |
| `context.originalRequest` | 只读                 | 客户端原始 `Request`；整个请求生命周期内不变 |
| `context.request`         | 只读（用户不可赋值） | 当前 handler 所见的对内 `Request`            |

`Request` 实例不可变；框架通过 `new Request(...)` 替换引用。

`context.rewrite()` 与 `context.request`：调用方 middleware 执行期间（含 `await rewrite()` 返回后）所见 `context.request` **不变**。rewrite 目标栈内的 handler，以及调用方 `next()` 之后的下游 handler，使用重写后的对内 `Request`。

对外 URL（鉴权、日志、canonical、SEO、HTTP 缓存键）读 `originalRequest`；对内 match、params、route 逻辑读当前 handler 所见的 `request`。

### 控制流

Rewrite 与 `redirect()` 一样由 `return` 驱动：

| 能力                          | 作用                     | 浏览器 URL | 返回值            |
| ----------------------------- | ------------------------ | ---------- | ----------------- |
| `return next()`               | 沿当前对内路径继续下游栈 | 不变       | 下游栈 `Response` |
| `return context.rewrite(...)` | 执行 rewrite 目标栈      | 不变       | 目标栈 `Response` |
| `return redirect(...)`        | 改变客户端 URL           | 改变       | 3xx `Response`    |

规则：

- 切换对内路由时使用 `return context.rewrite(...)`
- 可在 `await context.rewrite(...)` 后修改 `Response` 再返回
- `rewrite()` 之后应在同一 handler 内 `return` 其结果
- `await next()` 完成后再调用 `rewrite()`：同步抛出 `Error`

### 执行流程

`context.rewrite(input, init?)` 调用时，框架依次：

1. 按上表构造对内 `Request`（相对 URL 相对于 `context.request.url`）
2. 同源校验；失败抛出 `Error`
3. 检测 rewrite 环（pathname + search）；再次命中抛出 `HTTPException`（508）
4. 失效 route 激活状态（`module`、`meta`、`html` 等）
5. 以重写后的 `Request` re-match 目标栈（跳过本请求已执行的 handler），返回 `Response`

### Route 激活

不变量：已激活的 route module 必须对应当前 match 结果。

- `rewrite()` 时清除 route 衍生状态
- 目标栈按新 match 重新激活 module
- `params`、`pathname` 随 matched handler 更新

Rewrite 到 Route 时，走与直接命中该 Route 相同的渲染与 layout 管道。

### Query

不自动继承 rewrite 前对内 query；对内 query 仅来自 `input` / `init`。

### 错误与安全

- 重写目标不存在或抛错：与直接访问该路径一致，走 404 / fallback
- 仅允许同源或相对 `input`；跨 origin 抛出 `Error`
- rewrite 环：同一请求内不得 rewrite 到已访问过的 destination（pathname + search）
- `await next()` 完成后再 `rewrite()`：同步抛出 `Error`

### 缓存

**HTTP 共享缓存（CDN / 浏览器）** — 以 `originalRequest.url` 为键。

**应用内缓存 / 失效** — 以 rewrite 后的对内 match 路径为键。

**Vary** — 框架不因 rewrite 自动添加 URL 相关 `Vary`；由 route 或 middleware 按需设置。

## 与现有能力的关系

| 能力                       | 关系                                 |
| -------------------------- | ------------------------------------ |
| `redirect()`               | 改变客户端 URL                       |
| `next()`                   | 不切换对内路径                       |
| `proxy` / `fetchWithProxy` | 对外 origin；与内部 rewrite 职责分离 |

## 示例

### Gateway

```ts
export const handler = defineMiddlewareHandler(async (ctx, next) => {
  const { pathname } = new URL(ctx.originalRequest.url);
  if (!pathname.startsWith('/v1/')) return next();

  const res = await ctx.rewrite(pathname.replace(/^\/v1/, '/internal'));
  res.headers.set('x-routed-by', 'v1-gateway');
  return res;
});
```

### 传入 Request 或覆盖 method

```ts
return context.rewrite(new Request('/internal/preview', ctx.request));
return context.rewrite('/internal/submit', { method: 'POST' });
```

## 参考

- [Fetch `Request` 构造器](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request)
- [Next.js `NextResponse.rewrite`](https://nextjs.org/docs/app/api-reference/functions/next-response#rewrite)
- [Astro `context.rewrite`](https://docs.astro.build/en/reference/api-reference/#rewrite)
- 项目内：`docs/helpers/redirect.md`
