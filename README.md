# WebWidget 标准`草案`

WebWidget 是一种用于网页的小挂件，和传统的命令式的 UI Library 不同，它介于组件与应用程序形态之间，并且接口被标准化、能够适应于无代码编程与跨技术栈兼容的需要。

## 为什么要设计 WebWidget

### 问题

1. 开源社区大量的组件只能在特定的技术框架中才能运行，甚至一些组件依赖了特定的技术框架版本
2. 开发者需要花大量的时间研究每一个命令式组件的接口，写很多胶水代码、测试胶水代码后才能完成一个应用
3. 开源组件的安全与兼容性问题通常难以被察觉

### 契机

1. 在 NoCode/LowCode 理念流行下，可视化 Web 应用搭建系统层出不求，这样的体系下需要大量的、开箱即用的组件才能满足客户的需求
2. 微前端成为流行的技术理念，[single-spa](https://single-spa.js.org/) 定义的生命周期格式让 Web 应用跨技术栈、标准化接口提供很好的实践范例
3. Npm 成为了一个托管资源庞大的前端组件的大仓库，基于它有多个开箱即用的公共 CDN 服务
4. Web Components 成为面向未来的组件标准，几乎所有流行开源框架都支持它
5. [AMP](https://amp.dev) 提供了极致的网页载入性能优化思路，它提出了工业化的解决方案
6. [WebSandbox.js](https://web-sandbox.js.org) 将虚拟化技术推进到 Web 前端领域，使得创建安全的第三方组件运行的容器化环境成为可能

### 愿景

建设 WebWidget 规范的直接动机来自于 NoCode 产品共同的需求驱动，例如可视化网页编辑器的开放式组件系统。

1. 所有人可以使用 WebWidget 来搭建产品，不仅仅是开发者
2. WebWidget 可以运行在不同的前端技术框架中
3. 所有的前端组件，都可轻松变成 WebWidget
4. 所有的 NoCode 产品，都可兼容 WebWidget
5. Npm 或 Github 成为 WebWidget 的开放应用市场，使用公共 CDN 随时分发

## 标准化内容

WebWidget 标准由如下三个部分组成：

### 容器

它是运行 WebWidget 应用的容器，使用 HTML 标签可以立即创建一个带有沙盒的容器并且启动应用：

```html
<web-widget name="my-app" src="my-app.widget.js" sandboxed></web-widget>
```

[容器规范文档](docs/container.md)

### 应用

它是应用的入口文件，实现特定的生命周期接口即可被 WebWidget 容器调用，例如：

```js
// my-app.widget.js
export default {
  async bootstrap: (properties) => {},
  async mount: (properties) => {},
  async unmount: (properties) => {},
  async unload: (properties) => {}
}
```

[应用规范文档](docs/application.md)

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

[应用描述规范文档](docs/describe.md)

## API 设计过程的探索

[WebWidget 设计背后演化](docs/design.md)

## 应用场景

本章节非规范内容，仅用于辅助说明 WebWidget 的概念。

### 性能

如果想要实现极致的首屏载入速度，一些推荐的设置：

* 布局、文本、图片直出渲染
* CSS 样式嵌入在页面中
* 为 WebWidget 应用开启懒加载
* 为 WebWidget 提供占位符
* WebWidget 的运行时文件使用异步加载

更多系统性的优化策略可以见 [AMP](https://amp.dev)。

### SEO

因为 WebWidget 是一个标准的 Web Component，因此它的 SEO 问题本质上是 JavaScript 和 Web Component 的 SEO 问题。社区中有两种实践方式：

* 使用 [Light DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom#lightdom) 来描述关键内容
* 使用 [JSON-LD](https://json-ld.org/) 描述关键内容

### 路由驱动

通常情况下 WebWidget 会基于 DOM 的生命周期来自动响应生命周期，给 WebWidget 容器添加一个`inactive` 属性即可关闭生命周期联动，以便交给路由库来管理。

```html
<web-widget id="home" src="./index.widget.js" inactive></web-widget>
<web-widget id="news" src="./news.widget.js" inactive></web-widget>
<web-widget id="about" src="./about.widget.js" inactive></web-widget>
<script type="module">
  import '../../src/HTMLWebWidgetElement.js';
  import { register, start } from  '../../src/WebWidgetRouter/index.js';

  register(
    document.querySelector('#home'),
    location => location.pathname === '/'
  );

  register(
    document.querySelector('#news'),
    location => location.pathname.startsWith('/news')
  );

  register(
    document.querySelector('#about'),
    location => location.pathname.startsWith('/about')
  );

  start();
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

## 仓库代码目录

* [src/HTMLWebWidgetElement.js](src/HTMLWebWidgetElement.js) 基于 Web Components 的 WebWidget 的实现
* [src/HTMLWebWidgetImportElement.js](src/HTMLWebWidgetImportElement.js) WebWidget 应用导入标签实现
* [src/HTMLWebComponentImportElement.js](src/HTMLWebComponentImportElement.js) 原生 Web Components 模块导入实现
* [src/WebWidgetRouter.js](src/WebWidgetRouter.js) 专门用于驱动 WebWidget 应用的路由库实现 
