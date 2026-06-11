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
- `context.originalRequest` 始终指向客户端原始请求
- `context.request` 为用户只读、由框架维护的对内路由视图
- 全局 middleware（`*`）在请求级只执行一次

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

`rewrite(input, init?)` 与 `new Request(input, init ?? context.request)` 同形；相对 URL 相对于 `context.request.url` 解析。未传 `init` 时继承当前对内 Request 的 method、headers、body 等。

| 调用                     | 等价构造                                                |
| ------------------------ | ------------------------------------------------------- |
| `rewrite('/path')`       | `new Request('/path', context.request)`                 |
| `rewrite('/path', init)` | `new Request('/path', { ...context.request, ...init })` |
| `rewrite(request)`       | 该 `Request`（须同源）                                  |
| `rewrite(request, init)` | `new Request(request, init)`                            |

对外 URL 读 `originalRequest`；对内 match / params 读 `request`。

## 行为规范

### Request 视图

| 字段                      | 可写性               | 含义                                                      |
| ------------------------- | -------------------- | --------------------------------------------------------- |
| `context.originalRequest` | 只读                 | 客户端原始 `Request`；整个请求生命周期内不变              |
| `context.request`         | 只读（用户不可赋值） | 当前对内路由所用的 `Request`；由框架在 `rewrite()` 时更新 |

`Request` 实例本身不可变；框架通过 `new Request(...)` 创建新实例并替换对内视图引用。

需要对外 URL（鉴权、日志、canonical、SEO、HTTP 缓存键）时，读取 `context.originalRequest.url`。需要对内 match、params、route 逻辑时，读取 `context.request`。rewrite 之后二者不同是预期行为。

### 控制流

Rewrite 与 `redirect()` 一样由 `return` 驱动：

| 能力                          | 作用                            | 浏览器 URL | `originalRequest` | `request`（对内） | 返回值            |
| ----------------------------- | ------------------------------- | ---------- | ----------------- | ----------------- | ----------------- |
| `return next()`               | 沿当前对内路径继续下游栈        | 不变       | 不变              | 不变              | 下游栈 `Response` |
| `return context.rewrite(...)` | 切换对内 `Request` 并执行目标栈 | 不变       | 不变              | 更新              | 目标栈 `Response` |
| `return redirect(...)`        | 改变客户端 URL                  | 改变       | 不变              | 不适用            | 3xx `Response`    |

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
4. 失效 route 激活状态（`module`、`meta`、`render`、`html`、`_handler` 等）
5. 更新 `context.request`
6. 按新的 `context.request` re-match 尚未执行的 handler，执行目标栈并返回 `Response`
7. 不重跑本请求中已执行过的全局 middleware（`*`）

### Route 激活

不变量：已激活的 route module 必须对应当前 `context.request` 的 match 结果。

- `rewrite()` 时清除 route 衍生状态
- 目标栈执行时按当前 `context.request` 重新激活 module
- `params`、`pathname` 随 matched handler 更新

Rewrite 到 Route 时，走与直接命中该 Route 相同的渲染与 layout 管道。

### Query

不自动继承 rewrite 前 `context.request` 的 query；对内 query 仅来自 `input` / `init`。对外 query 通过 `context.originalRequest.url` 读取。

### 错误与安全

- 重写目标不存在或抛错：与直接访问该路径一致，走 404 / fallback
- 仅允许同源或相对 `input`；跨 origin 抛出 `Error`
- rewrite 环：同一请求内不得 rewrite 到已访问过的 destination（pathname + search）
- `await next()` 完成后再 `rewrite()`：同步抛出 `Error`

### 缓存

**HTTP 共享缓存（CDN / 浏览器）** — 以 `context.originalRequest.url` 为键。

**应用内缓存 / 失效** — 以 rewrite 后 `context.request` 的 match 结果（对内路径）为键。

**Vary** — 框架不因 rewrite 自动添加 URL 相关 `Vary`；由 route 或 middleware 按需设置。

## 与现有能力的关系

| 能力                       | 关系                                         |
| -------------------------- | -------------------------------------------- |
| `redirect()`               | 改变客户端 URL；不更新对内 `context.request` |
| `next()`                   | 不切换对内路径                               |
| `proxy` / `fetchWithProxy` | 对外 origin；与内部 rewrite 职责分离         |

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
