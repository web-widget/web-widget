# 架构 >> 路由驱动 || 20

通常情况下 Web Widget 会基于 DOM 的生命周期来触发应用的生命周期函数，如果给容器添加一个`inactive` 属性即可关闭与 DOM 生命周期的绑定，以便交给程序来控制它，例如前端路由库。

## 安装

```bash
npm install @web-widget/router --save
```

## 使用

```html
<web-widget id="home" src="./index.widget.js" inactive></web-widget>
<web-widget id="news" src="./news.widget.js" inactive></web-widget>
<web-widget id="about" src="./about.widget.js" inactive></web-widget>
```

```js
import '@web-widget/core';
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