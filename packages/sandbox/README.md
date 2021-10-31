# WebWidget sandbox

这是 WebWidget 的沙盒特性功能（试验性特性）。

[文档](https://web-widget.js.org/docs/container/plugins/sandbox/)

## 安装

```bash
npm install @web-widget/sandbox --save
```

## 使用

```html
<web-widget type="umd" name="myWidget" sandboxed src="app.widget.js"></web-widget>
```

```js
import '@web-widget/container';
import '@web-widget/umd-loader';
import '@web-widget/sandbox';
```

> 沙盒目前无法支持 ES module 的 WebWidget 应用格式，仅支持 umd 或者 system 模块类型（需要安装对应的加载器插件）。

## 原理

WebWidget 沙盒来源于 WebSandbox：WebSandbox 的目标是构建一个安全且轻量化的浏览器虚拟化容器，它采用使用 Web 标准技术来构建，它的使用场景：

* 作为 Web 应用的插件的安全运行环境、提供开放式的插件系统
* 让不同的技术栈、版本的应用能够在同一个页面中运行，避免陷入重构的泥潭

[https://web-sandbox.js.org/](https://web-sandbox.js.org/)

## 安全模型

* JS 语言安全——Realm: 基于 TC39 草案实现
* CSS 安全——Shadow DOM: Web 正式标准
* HTML 安全——Sanitizer: 基于 W3C 草案实现
* 内容安全策略——CSP: 基于 W3C 正式标准实现

## DOM 树

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

## 内容安全策略

可以通过 CSP 配置来控制应用内部的脚本、样式、链接、表单、网络请求等行为。

```html
<web-widget
    src="app.widget.js"
    sandboxed
    csp="
      default-src 'none';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net;
      style-src * 'unsafe-inline' cdn.jsdelivr.net;
      navigate-to 'self' web-sandbox.js.org;
    ">
</web-widget>
```

## 本地存储

拥有专属的本地存储空间，主文档或者父 WebSandbox 可以对它进行管理。

## Web components

拥有完整的 Web components 虚拟化实现，WebSandbox 内部注册的自定义元素不会影响主文档。

## Viewport

WebSandbox 中的 CSS 无法影响主文档，包括设置了 `position: fixed` 元素、`:host` 选择器。

## Task

`requestAnimationFrame()`、`setTimeout()`、`setInterval()` 等异步任务将随着 WebSandbox 销毁而自动结束。

## ChildWebSandbox

WebSandbox 的应用内部也可以使用 WebSandbox，并且将继承内容安全策略。

## 运行示例

```bash
npm run examples
```

## 限制

* 受 Realm 垫片实现影响，远程的脚本与样式必须允许同源访问
* 受 Realm 垫片实现影响，脚本中在严格模式下运行
* 受 Realm 垫片实现影响，脚本中不能包含 HTML 注释语句 `<!--->`
* 受 Realm 垫片实现影响，脚本中不能使用 ES6 `import` 导入模块
* 受 Realm 垫片实现影响，脚本中不能**直接**使用 `eval()` 语句；允许**间接**使用，例如 `(0, eval)(code)`。这个限制会导致一些依赖 `eval()` 语句动态编译模板的框架无法运行，这些模板必须在构建阶段编译后才能运行，例如 Vue
* 受内置安全策略影响，不能使用主文档定义好的自定义元素
* 受内置安全策略影响，脚本通过 `element.innerHTML` 等类似的 API 插入内容的时候可能会被过滤掉有危险的标签与属性
* 受内置安全策略影响，主文档无法通过 `localStorage` 给沙箱脚本共享数据，因为 `localStorage` 被隔离
* 受内置安全策略影响，无法捕获脚本运行时的全局错误，只允许主文档捕获
* 受内置安全策略影响，不支持 `data:` 协议
* 不支持 CSS 的 vw/vh 单位
* 不支持 CSS 媒体查询
* 不支持 CSS 的 `import` 语句导入样式

受安全策略与项目进展的影响，浏览器的 API 以白名单的方式提供，细节请查阅 [Web API 兼容性报告](https://web-sandbox.js.org/docs/web-compat/)。

## 兼容性披露

WebSandbox 基于 Realms Stage 2 规范实现，前一段时间 Realms 进入了 Stage 3，它有了非常大的 API 变更，这使得 WebSandbox 需要重新进行适配，未来可能会影响 WebWidget 的沙盒的行为。