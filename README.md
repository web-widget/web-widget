# WebWidget

[![CI](https://github.com/web-sandbox-js/web-widget/actions/workflows/main.yml/badge.svg?event=push)](https://github.com/web-sandbox-js/web-widget/actions/workflows/main.yml?query=event%3Apush)

WebWidget 是一种用于网页的小挂件的技术体系。

## 为什么要设计 WebWidget

建设 WebWidget 的直接动机来自于 NoCode/LowCode 产品共同的需求驱动，因为这样的体系下需要大量、开箱即用的组件才能满足客户的需求。

### 存在的问题

* 开源社区大量的组件只能在特定的技术框架中才能运行，甚至一些组件依赖了特定的技术框架版本，这是一种浪费
* 开发者需要花大量的时间研究每一个命令式组件的接口，写很多胶水代码、测试胶水代码后才能完成一个应用
* 开源组件的安全问题通常难以被察觉或者被忽视，以至于为应用隐患
* 不断变化的技术栈降低了软件的生命力

### 目标愿景

* 所有人可以使用可视化编辑器与 WebWidget 来搭建网页应用，不需要写代码
* WebWidget 可以运行在不同的前端技术框架中
* WebWidget 的应用能够作为物料的格式标准
* 所有的前端组件都可轻松转换成 WebWidget
* 所有的 NoCode/LowCode 产品，都可兼容 WebWidget
* 公共 CDN 可以随时加载托管在 Npm 或 Github 的 WebWidget、无副作用的运行

### 目标约束

* WebWidget 提供的是立即可用的服务，因此应用事件机制、应用的对外接口并非 WebWidget 的目标，这些是传统的 Library 的设计要素。当一个组件需要频繁的和外部交互，那么这适合使用传统 Library 代码复用方式
* WebWidget 和微前端的概念有众多相似的地方，但微前端有非常多的实践层面的问题并不是 WebWidget 目标，WebWidget 关注的是抽象设计，理想情况下它的抽象程度应当达到 Web 标准一样的力度，微前端等一些工程化手段可以基于 WebWidget 定义的标准而不断的实现具体工程化工具支持

### 实现目标的参考

#### Single-spa

[single-spa](https://single-spa.js.org/) 定义的生命周期格式让 Web 应用跨技术栈、标准化接口提供很好的实践范例，并且它提供了一整套的工程解决方案。

#### JS CDN

Npm 成为了一个托管资源庞大的前端组件的大仓库，基于它有多个开箱即用的公共 CDN 服务。受 ES module 规范的推广，越来越多的工具开始往运行时集成方向演进。

#### Web components

Web components 成为面向未来的组件标准，它提供了良好的隔离手段，并且具备较高的可用性，几乎所有流行开源框架都支持它。

#### Web plugins

在过去，`<embed>` 元素开启了 Web 辉煌的时互动时代，它可以载入远程插件以实现互动内容，例如 Flash。

```html
<embed src="somefilename.swf" width="550" height="400"></embed>
```

#### AMP

[AMP](https://amp.dev) 提供了极致的网页载入性能优化思路，它有一整套被重新设计的组件系统，这使得它能最大程度保证性能。

#### WebSandbox

[WebSandbox.js](https://web-sandbox.js.org) 将虚拟化技术推进到 Web 前端领域，使得创建安全的第三方组件运行的容器化环境成为可能。对应的类似的技术是 [AMP](https://amp.dev) 推出的 [worker-dom](https://github.com/ampproject/worker-dom)，不过它无法使用同步的 DOM API、只能使用少量的 DOM API。

#### OneBox

Google 的 OneBox 与百度的框计算是被规模化应用的小挂件形态（例如在搜索引擎搜索“天气预报”，它们都能给出天气的小挂件结果），这些组件具备非常长的生命力并且可以直达用户。

## 应用场景举例

* 用于可视化编辑器中的物料系统
* 微前端工程架构
* Web 应用插件系统
* 个性化卡片信息流展示（Google 的 OneBox 与百度的框计算）

## 设计

WebWidget 由如下三个部分组成：

### 容器

WebWidget 容器是一个标准的 Web Component 组件，标签名为 `<web-widget>`，其 `src` 属性为[应用](#应用)的 URL。

```html
<web-widget src="app.widget.js"></web-widget>
```

详情见 [容器规范文档](docs/container.md)

### 应用

WebWidget 应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的入口文件，它包含生命周期函数：

```js
// app.widget.js
export default () => ({
  async bootstrap: (properties) => {},
  async mount: (properties) => {},
  async unmount: (properties) => {},
  async unload: (properties) => {}
});
```

详情见 [应用规范文档](docs/application.md)

### 清单

WebWidget 清单使用了 NPM package.json 文件，它描述了应用名字、图标等信息，以便在组件系统 or 应用市场中展示。例如：

```json
{
  "name": "app",
  "WebWidget": "1.0.0",
  "version": "0.0.1",
  "main": "dist/umd/index.widget.js",
  "……": "……"
}
```

详情见 [应用清单规范文档](docs/describe.md)

## 生态

### 核心

* [@web-sandbox.js/web-widget](packages/web-widget) `<web-widget>` 元素

### 插件

* [@web-sandbox.js/router](packages/router) 专门用于驱动 WebWidget 的单页面应用的路由库
* [@web-sandbox.js/sandbox](packages/sandbox) 安全沙盒插件
* [@web-sandbox.js/web-widget-import](packages/web-widget-import) WebWidget 应用导入标签实现（`<web-widget.import>`）
* [@web-sandbox.js/umd-loader](packages/umd-loader) UMD 模块格式支持
* [@web-sandbox.js/system-loader](packages/system-loader) System 模块格式支持

## 使用示范

本章节非规范内容，仅用于辅助说明 WebWidget 的可扩展性。

### 运行第三方代码

开启 `sandboxed` 功能，并且设置内容安全策略。

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

[AMP](https://amp.dev) 的性能优先的工程设计为 WebWidget 的诞生提供了很多灵感，它的优化策略对采用 WebWidget 的网站也同样有效，一些推荐设置：

* HTML 中的布局、文本等关键元素通过服务器渲染，而 WebWidget 由客户端渲染
* 上述标签的 CSS 样式内嵌入在页面中
* 为 WebWidget 标签预设置尺寸，避免渲染回流
* 为 WebWidget 应用开启懒加载
* 为 WebWidget 提供占位符
* 为 WebWidget 的运行时文件采用异步加载

更多相关信息可以参考 [AMP](https://amp.dev) 的官网。

### 懒加载

类似 `<img>` 标签，使用 `loading="lazy"` 属性可以让元素进入视图才加载。

```html
<web-widget src="./app.widget.js" loading="lazy"></web-widget>
```

### 占位符

`<web-widget>` 元素的直接子元素 `<placeholder>` 标签将充当占位符。

```html
<web-widget src="./app.widget.js">
  <placeholder>
    loading..
  </placeholder>
</web-widget>
```

### 后备

`fallback` 元素将充当 WebWidget 容器的后备占位符号。用途：

* 浏览器不支持某个元素
* 内容未能加载（例如，推文被删除）
* 图片类型不受支持（例如，并非所有浏览器都支持 WebP）

```html
<web-widget src="video.js">
  <fallback hidden>
    <p>This browser does not support the video element.</p>
  </fallback>
</web-widget>
```

### 插槽

使用 `slot` 属性可以将元素在应用指定的位置渲染（渲染的位置由应用定义）：

```html
<web-widget src="./app.widget.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

```js
// app.widget.js
export default () => ({
  async mount({ container }) {
    container.innerHTML = `
      <h3><slot name="title"></slot></h3>
      <div><slot name="content"></slot></div>
    `;
  },

  async unmount({ container }) {
    container.innerHTML = '';
  }
});
```

### 主题

应用通过 `:host()` 选择器可以实现主题的定义，容器可以控制切换主题。例如使用 `class` 来切换主题：

```html
<web-widget class="you-theme" src="app.widget.js"></web-widget>
```

```js
// app.widget.js
export default () => ({
  async mount({ container }) {
    container.innerHTML = `
      <style>
        :host(.you-theme) h3 {
          color: #FFF;
          background: #000;
        }
      </style>
      <h3>hello world</h3>
    `;
  },

  async unmount({ container }) {
    container.innerHTML = '';
  }
});
```

### 多语言

> 需要完善

### SEO

因为 WebWidget 是一个标准的 Web Component，因此它的 SEO 问题本质上是 JavaScript 和 Web Component 的 SEO 问题。社区中有两种实践方式：

* 使用 [Light DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom#lightdom) 来描述关键内容
* 使用 [JSON-LD](https://json-ld.org/) 描述关键内容

### 路由驱动

通常情况下 WebWidget 会基于 DOM 的生命周期来触发应用的生命周期函数，如果给容器添加一个`inactive` 属性即可关闭与 DOM 生命周期的绑定，以便交给程序来控制它，例如前端路由库。

```html
<web-widget id="home" src="./index.widget.js" inactive></web-widget>
<web-widget id="news" src="./news.widget.js" inactive></web-widget>
<web-widget id="about" src="./about.widget.js" inactive></web-widget>
```

```js
import '@web-sandbox.js/web-widget';
import { collection, history } from  '@web-sandbox.js/router';

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

### HTML 模块化导入

```html
<web-widget.import as="hello-world" from="./slot.widget.js"></web-widget.import>

<hello-world>
  <p slot="main">hello wrold</p>
</hello-world>

<hello-world>
  <p slot="main">hello web-widget</p>
</hello-world>
```

```js
import '@web-sandbox.js/web-widget';
import '@web-sandbox.js/web-widget-import';
```

### 服务器渲染

> 需要完善

### 发布 WebWidget 应用

WebWidget 可以发布到任何地方，例如企业的私有 CDN。如果你想让所有人都可以使用到，推荐发布到 Npm 或者 Github，这样使用者可以通过公共 CDN 加载它。 

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

## 参考信息

* [WebWidget 设计过程](docs/design.md)
