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
npm install --save @web-widget/container
```

在页面中引入应用容器的运行时。

```js
import '@web-widget/container';
```
