# 容器化 >> 路由驱动 || 70

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

引入路由后，我们可以通过 Web Widget 来架设渐进式的微前端架构。

<inline-notification type="warning">

Web Widget 的路由驱动的架构方案还处于试验性状态。

</inline-notification>

## 安装

```bash
npm install @web-widget/router --save
```

## 使用

通常情况下 Web Widget 会基于 DOM 的生命周期来触发应用的生命周期函数，如果给容器添加一个`inactive` 属性即可关闭与 DOM 生命周期的绑定，以便交给路由管理程序控制它。

```html
<web-widget id="home" src="./index.widget.js" inactive></web-widget>
<web-widget id="news" src="./news.widget.js" inactive></web-widget>
<web-widget id="about" src="./about.widget.js" inactive></web-widget>
```

```js
import '@web-widget/container';
import { collection, history } from  '@web-widget/router';

collection.add(
  document.querySelector('#home'),
  location => location.pathname === '/'
);

collection.add(
  document.querySelector('#news'),
  location => location.pathname.startsWith('/news')
);

collection.add(
  document.querySelector('#about'),
  location => location.pathname.startsWith('/about')
);

collection.change(location);
history.listen(() => collection.change(location));
```

更多请阅读 [Router 插件文档](../../docs/container/plugins/router.md)。

## 最佳实践

### 我应该有一个父/根应用程序和子应用程序吗？

不可以。强烈建议 root 只用来管理路由，而不使用任何 UI 库（React、Vue 等），更不包括导航、侧边栏等 UI 部分。

为什么？你最终创建的结构具有微服务的所有缺点，但没有任何优点：这相当于将独立的单页应用开发变成了插件开发的模式，每一个单页面应用都将依赖宿主提供的接口才能完整运行，例如点亮导航等，整个工程将耦合在一起。好的微服务应当是完全独立的，而这种模式将会破坏这一点。

### 子路由应当如何管理？

你应当确保每个单页应用都可以独立运行，因此子路由也应当由具体的单页应用管理，例如使用 `vue-router` 等。
