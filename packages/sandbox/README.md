# WebWidget sandbox

这是 WebWidget 的沙盒特性功能。

## 安装

```bash
npm install @web-sandbox.js/sandbox --save
```

## 使用

```html
<web-widget type="umd" name="myWidget" sandbox src="app.widget.js"></web-widget>
```

```js
import '@web-sandbox.js/web-widget';
import '@web-sandbox.js/umd-loader';
import '@web-sandbox.js/sandbox';
```

## 原理

WebWidget 沙盒来源于 WebSandbox：WebSandbox 的目标是构建一个安全且轻量化的浏览器虚拟化容器，它采用使用 Web 标准技术来构建，它的使用场景：

* 作为 Web 应用的插件的安全运行环境、提供开放式的插件系统
* 让不同的技术栈、版本的组件能够在同一个页面中运行，避免陷入重构的泥潭

[https://web-sandbox.js.org/](https://web-sandbox.js.org/)

## 安全模型

* JS 语言安全——Realm: 基于 TC39 草案实现
* CSS 安全——Shadow DOM: Web 正式标准
* HTML 安全——Sanitizer: 基于 W3C 草案实现
* 内容安全策略——CSP: 基于 W3C 正式标准实现

## 资源虚拟化

### DOM 树

WebSandbox 拥有完整的 DOM 树结构，这些使用 ShadowRoot 隔离。

```html
<web-widget>          ——— window
  #shadow-root        ——— document
    <html>            ——— document.documentElement
      <head></head>   ——— document.head
      <body></body>   ——— document.body
    </html>
</web-widget>
```

### 内容安全策略

可以通过 CSP 配置来控制应用内部的脚本、样式、链接、表单、网络请求等行为。

```html
<web-widget
    src="app.widget.js"
    csp="
      default-src 'none';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net;
      style-src * 'unsafe-inline' cdn.jsdelivr.net;
      navigate-to 'self' web-sandbox.js.org;
    ">
</web-widget>
```

### 本地存储

拥有专属的本地存储空间，主文档或者父 WebSandbox 可以对它进行管理。

### Web Components

拥有完整的 Web Components 虚拟化实现，WebSandbox 内部注册的自定义元素不会影响主文档。

### Viewport

WebSandbox 中的 CSS 无法影响主文档，包括设置了 `position: fixed` 元素、`:host` 选择器。

### Task

`requestAnimationFrame()`、`setTimeout()`、`setInterval()` 等异步任务将随着 WebSandbox 销毁而自动结束。

### ChildWebSandbox

WebSandbox 的应用内部也可以使用 WebSandbox，并且将继承内容安全策略。

## 运行示例

```bash
npm run examples
```