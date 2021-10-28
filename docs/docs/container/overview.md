---
eleventyNavigation:
  key: 容器 >> 概述
  title: 概述
  parent: 容器
  order: 1
---

# Web Widget 容器

Web Widget 容器标签名为 `<web-widget>`，其 `src` 属性为[应用](../application/overview.md)的 URL。

```html
<web-widget src="app.widget.js"></web-widget>
```

## 安装

```bash
npm install --save @web-widget/core
```

## 模块格式

默认情况下 `src` 支持的是 ES module 模块，通过[插件](./plugins/overview.md)可以支持不同类型的格式，例如 [system-loader](./plugins/system-loader.md) 与 [umd-loader](./plugins/umd-loader.md)。

## 生命周期

Web Widget 容器对应的 DOM 生命周期回调将异步触发应用的生命周期：

```js
const widget = document.createElement('web-widget');
widget.src = 'app.widget.js';

// load -> bootstrap -> mount
document.body.appendChild(widget);

// update
widget.update({ name: 'demo' });

// unmount -> unload
document.body.removeChild(widget);
```