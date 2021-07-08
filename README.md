# WebWidget 标准`草案`

WebWidget 是一种用于网页的小挂件，和传统的命令式的 UI Library 不同，它介于组件与应用程序形态之间，并且接口被标准化、能够适应于无代码编程与跨技术栈兼容的需要。

## 为什么要设计 WebWidget

建设 WebWidget 规范的直接动机来自于 NoCode/LowCode 产品共同的需求驱动，因为这样的体系下需要大量、开箱即用的组件才能满足客户的需求，面对这些现实的问题这使得我们在思考如何构建一个面向服务的组件标准。

### 问题

1. 开源社区大量的组件只能在特定的技术框架中才能运行，甚至一些组件依赖了特定的技术框架版本
2. 开发者需要花大量的时间研究每一个命令式组件的接口，写很多胶水代码、测试胶水代码后才能完成一个应用
3. 开源组件的安全与兼容性问题通常难以被察觉

### 契机

1. 微前端成为流行的技术理念，[single-spa](https://single-spa.js.org/) 定义的生命周期格式让 Web 应用跨技术栈、标准化接口提供很好的实践范例
2. Npm 成为了一个托管资源庞大的前端组件的大仓库，基于它有多个开箱即用的公共 CDN 服务
3. Web Components 成为面向未来的组件标准，几乎所有流行开源框架都支持它
4. [AMP](https://amp.dev) 提供了极致的网页载入性能优化思路，它提出了工业化的解决方案
5. [WebSandbox.js](https://web-sandbox.js.org) 将虚拟化技术推进到 Web 前端领域，使得创建安全的第三方组件运行的容器化环境成为可能

### 愿景

1. 所有人可以使用 WebWidget 来搭建产品，不仅仅是开发者
2. WebWidget 可以运行在不同的前端技术框架中
3. 所有的前端组件都可轻松转换成 WebWidget
4. 所有的 NoCode/LowCode 产品，都可兼容 WebWidget
5. 公共 CDN 可以随时加载托管在 Npm 或 Github 的 WebWidget

### 非目标

WebWidget 的本质是组件的服务化治理，而服务意味着更少的过程式的交互。

* 应用事件机制、应用的对外接口并非 WebWidget 的目标。如果一个组件需要频繁的和外部交互那么它并非 WebWidget 的适用范围，这种情况更适合使用传统 npm 包进行共享。虽然如此，我们也要需要确保 WebWidget 所提炼的功能是足够原子化的，能够允许开发者在 WebWidget 之上提供插件所要求的专属 API 或者事件机制
* WebWidget 不能取代 `<iframe>` 标签或者 Web Component 的自定义元素标签，它们各自核心价值无法被取代

> 需要讨论：事件机制是否要纳入 WebWidget。

## 标准化内容

WebWidget 标准由如下三个部分组成：

### 容器

它是运行 WebWidget 应用的容器，使用 HTML 标签可以立即创建一个带有沙盒的容器并且启动应用：

```html
<web-widget name="my-app" src="my-app.widget.js" sandboxed></web-widget>
```

详情见 [容器规范文档](docs/container.md)

### 应用

它是应用的入口文件，实现特定的生命周期接口即可被 WebWidget 容器或者其他兼容的加载器调用。入口文件示例：

```js
// my-app.widget.js
export default {
  async bootstrap: (properties) => {},
  async mount: (properties) => {},
  async unmount: (properties) => {},
  async unload: (properties) => {}
}
```

详情见 [应用规范文档](docs/application.md)

### 应用描述

应用有自己的名字、图标等信息，以便在组件系统 or 应用市场中展示。例如：

```json
{
  "name": "my-app",
  "WebWidget": "1.0.0",
  "version": "0.0.1",
  "main": "dist/umd/index.widget.js",
  "……": "……"
}
```

详情见 [应用描述规范文档](docs/describe.md)

## API 设计过程的探索

详情见 [标准化微前端容器— WebWidget 设计过程](docs/design.md)

## 规范的实现

* [src/index.js](src/index.js) WebWidget 的核心实现
  * `application`（实验性）
  * `inactive`
  * `importance`（取决于浏览器 `fetch()` API 对此特性的支持程度）
  * `loading`
    * `"lazy"`
  * `name`
  * `src`
  * `text`
  * `sandboxed`（需要依赖 [WebSandbox.js](https://github.com/web-sandbox-js/web-sandbox)）
  * `status`
  * `portalDestinations`
  * `load()`
  * `bootstrap()`
  * `mount()`
  * `update()`
  * `unmount()`
  * `unload()`
  * `<fallback>`（尚未实现）
  * `<placeholder>`（尚未实现）
  * 预加载（实验性）

WebWidget 辅助工具：

* [extensions/WebWidgetCollection.js](extensions/WebWidgetCollection.js) WebWidget 应用集合抽象，可以用来和历史记录库组合使用
* [extensions/WebWidgetRouter.js](extensions/WebWidgetRouter.js) 专门用于驱动 WebWidget 应用的路由库实现
* [extensions/HTMLWebWidgetImportElement.js](extensions/HTMLWebWidgetImportElement.js) WebWidget 应用导入标签实现
* [extensions/HTMLWebComponentImportElement.js](extensions/HTMLWebComponentImportElement.js) 原生 Web Components 模块适配器（实验性）

> 辅助工具不属于本项目的内容，因此后续将从当前项目中移除，以便独立维护。

## 应用场景

本章节非规范内容，仅用于辅助说明 WebWidget 的可扩展性。

### 为应用启用沙盒与专属的内容安全策略

```html
<web-widget
  src="./app.widget.js"
  sandboxed
  csp="
    default-src 'none';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net web-sandbox.js.org;
    style-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
    navigate-to 'self' web-sandbox.js.org;
  ">
</web-widget>
```

如果父节点的 WebWidget 启用了 `sandboxed` 属性，子节点（包括 ShadowRoot）中的 WebWidget 也将继承沙盒的权限。

```html
<web-widget
  src="./app.widget.js"
  sandboxed
  csp="
    default-src 'none';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net web-sandbox.js.org;
    style-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
    navigate-to 'self' web-sandbox.js.org;
  ">
    #shadow-root (closed)
      <web-widget src="./a.widget.js"></web-widget>
    <web-widget src="./b.widget.js"></web-widget>
</web-widget>
```

### 首屏载入速度优化

[AMP](https://amp.dev) 通过性能优先的工程设计为 WebWidget 的诞生提供了很多灵感，其中 [AMP](https://amp.dev) 的优化策略对采用 WebWidget 的网站也同样有效，一些推荐设置：

* HTML 中的布局、文本等关键元素通过服务器渲染，而 WebWidget 由客户端渲染
* 上述标签的 CSS 样式内嵌入在页面中
* 为 WebWidget 标签预设置尺寸，避免渲染回流
* 为 WebWidget 应用开启懒加载
* 为 WebWidget 提供占位符
* 为 WebWidget 的运行时文件采用异步加载

更多相关信息可以参考 [AMP](https://amp.dev) 的官网。

### 懒加载

```html
<web-widget src="./app.widget.js" loading="lazy"></web-widget>
```

### SEO

因为 WebWidget 是一个标准的 Web Component，因此它的 SEO 问题本质上是 JavaScript 和 Web Component 的 SEO 问题。社区中有两种实践方式：

* 使用 [Light DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom#lightdom) 来描述关键内容
* 使用 [JSON-LD](https://json-ld.org/) 描述关键内容

使用 [Light DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom#lightdom)：

```html
<web-widget name="my-app" src="my-app.widget.js">
  <h3 slot="header">Hello</h3>
  <p slot="main">World</p>
</web-widget>
```

### 路由驱动

通常情况下 WebWidget 会基于 DOM 的生命周期来触发应用的生命周期函数，如果给容器添加一个`inactive` 属性即可关闭与 DOM 生命周期的绑定，以便交给程序来控制它，例如前端路由库。

```html
<web-widget id="home" src="./index.widget.js" inactive></web-widget>
<web-widget id="news" src="./news.widget.js" inactive></web-widget>
<web-widget id="about" src="./about.widget.js" inactive></web-widget>
<script type="module">
  import '@web-sandbox.js/web-widget';
  import { collection, history } from  '@web-sandbox.js/web-widget/dist/esm/extensions/web-widget-router';

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

  function reroute() {
    collection.change(location);
  }

  history.listen(reroute);
  reroute();
</script>
```

## WebWidget HTML 模块化导入

```html
<web-widget.import as="hello-world" src="./slot.widget.js"></web-widget.import>

<hello-world>
  <p slot="main">hello wrold</p>
</hello-world>

<hello-world>
  <p slot="main">hello web-widget</p>
</hello-world>

<script type="module">
  import '@web-sandbox.js/web-widget';
  import '@web-sandbox.js/web-widget/dist/esm/extensions/web-widget-import';
</script>
```

## Web Components HTML 模块化导入

```html
<web-component.import as=tagName src=webComponentsUrl></web-component.import>
```

它拥有和 `<web-widget.import>` 一样的属性，不同的是它只支持标准的 Web Components 模块格式。Web Components 模块无需打包成 UMD 规范，也无需遵循 WebWidget 的生命周期定义。只需要按照 Web Components 的要求实现自定义元素的构造器，并且使用 `customElements.define(name, Element)` 注册。例如：

```js
// my-element.js
class MyElment extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot = `
      <main><slot name="main">hello wrold</slot></main>
    `;
  }
}
customElements.define('my-element', MyElment);
```

```html
<web-component.import as="slot-demo" src="./my-element.js"></web-component.import>

<slot-demo>
  <p slot="main">Hello Wrold</p>
</slot-demo>

<script type="module">
  import '@web-sandbox.js/web-widget';
  import '@web-sandbox.js/web-widget/dist/esm/extensions/web-widget-import';
  import '@web-sandbox.js/web-widget/dist/esm/extensions/web-component-import';
</script>
```

### 服务器渲染

> 文档待补充。

### 发布 WebWidget 应用

WebWidget 可以发布到任何地方，例如企业的私有 CDN，如果你想让所有人都可以使用到，推荐发布到 Npm 或者 Github，这样使用者可以通过公共 CDN 加载它。 

### WebWidget 应用自动升级

一些公共 CDN 提供了自动更新的机制，例如 [jsdelivr](https://www.jsdelivr.com)，你可以通过它实现 WebWidget 应用的自动升级。

始终使用最新版本：

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget"></web-widget>
```

以兼容性的方式自动更新：

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget@2"></web-widget>
```

禁止更新：

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget@2.0.0"></web-widget>
```

## 待讨论问题

* 如何通过 CSS 来控制 WebWidget 的状态？
* WebWidget 容器是否应该默认开启 ShadowDOM 或提供选项可配置？
