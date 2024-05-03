# 深入 >> 路由驱动 || 70

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

Web Router 是一个技术栈中立的路由系统，Web Widget 能够与 Web Router 组合完成单页微前端架构：

```
            Start
              ▼
     ┌────────┴───────┐
     │ Backend Router │
     └────────┬───────┘
              ▼
       ┌──────┴─────┐
       │ Web Router │
       └──────┬─────┘
              ▼
  ┌───────────┴───────────┐
  │ Application Container │
  │      (Web Widget)     │
  └───────────┬───────────┘
              ▼
┌─────────────┴──────────────┐
│ Front-End Framework Router │
│ (React, Vue, Angular, ...) │
└─────────────┬──────────────┘
              ▼
       ┌──────┴──────┐
       │ Application │
       └──────┬──────┘
              ▼
             End
```

## 使用

```html
<web-router>
  <web-route path="/" element="web-widget" import="@examples/home"></web-route>
  <web-route
    path="/news"
    element="web-widget"
    import="@examples/news"></web-route>
  <web-route path="*" element="web-widget" import="@examples/404"></web-route>
</web-router>
```

<inline-notification type="warning">

Web Router 还在发展中，这是 RFC 地址：<https://github.com/growing-web/rfcs/discussions/10>。

</inline-notification>

## 最佳实践

### 我应该有一个父/根应用程序和子应用程序吗？

不可以。强烈建议 root 只用来管理路由，而不使用任何 UI 库（React、Vue 等），更不包括导航、侧边栏等 UI 部分。

为什么？你最终创建的结构具有微服务的所有缺点，但没有任何优点：这相当于将独立的单页应用开发变成了插件开发的模式，每一个单页面应用都将依赖宿主提供的接口才能完整运行，例如点亮导航等，整个工程将耦合在一起。好的微服务应当是完全独立的，而这种模式将会破坏这一点。

### 子路由应当如何管理？

你应当确保每个单页应用都可以独立运行，因此子路由也应当由具体的单页应用管理，例如使用 `vue-router` 等。
