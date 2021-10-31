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

## 模块格式

默认情况下 `src` 支持的是 ES module 模块，通过[插件](./plugins/overview.md)可以支持不同类型的格式，例如 [system-loader](./plugins/system-loader.md) 与 [umd-loader](./plugins/umd-loader.md)。

## 生命周期

默认情况下 Web Widget 容器 DOM 生命周期和应用的生命周期绑定在一起，通过异步的方式触发执行：

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

在容器上设置 `inactive` 属性，即可关闭与 DOM 生命周期的绑定，这时候可以通过容器[接口](./interfaces/html-web-widget-element.md)来手动控制应用的生命周期。

```js
const widget = document.createElement('web-widget');
widget.inactive = true;
widget.src = 'app.widget.js';
document.body.appendChild(widget);

widget.mount();
```

## 样式

默认情况下，Web Widget 容器开启了 [shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)，这样的好处是确保应用的 CSS 只影响自己。通过容器[接口](./interfaces/html-web-widget-element.md)可以关闭默认开启的 [shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)。