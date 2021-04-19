# WebWidget 标准

## 什么是 WebWidget

WebWidget 是一种用于网页的小挂件，和传统的命令式的 UI Library 不同，它介于组件与应用程序形态之间，并且接口被标准化、能够适应于无代码编程与跨技术栈兼容的需要。

## 为什么要设计 WebWidget

### 问题

1. 开源社区大量的组件只能在特定的技术框架中才能运行，甚至一些组件依赖了特定的技术框架版本
2. 开发者需要花大量的时间研究每一个命令式组件的接口，写很多胶水代码、测试胶水代码后才能完成一个应用
3. 开源组件组件以及其依赖的安全问题、和应用的兼容性问题通常难以被察觉

### 契机

1. 在 NoCode/LowCode 理念流行下，可视化 Web 应用搭建系统层出不求，这样的体系下需要大量的、开箱即用的组件才能满足客户的需求
2. 微前端成为流行的技术理念，[single-spa](https://single-spa.js.org/) 定义的生命周期格式让 Web 应用跨技术栈、标准化接口提供很好的实践范例
3. Npm 成为了一个托管资源庞大的前端组件的大仓库，基于它有多个开箱即用的公共 CDN 服务
4. Web Components 成为面向未来的组件标准，几乎所有流行开源框架都支持它
5. [AMP](https://amp.dev) 提供了极致的网页载入性能优化思路，它提出了工业化的解决方案
6. [WebSandbox.js](https://web-sandbox.js.org) 将虚拟化技术推进到 Web 前端领域，使得创建安全的第三方组件运行的容器化环境成为可能

### 愿景

建设 WebWidget 规范的直接动机来自于 NoCode 产品共同的需求驱动，例如可视化网页编辑器的开放式组件系统。

1. 让更多的人可以使用 WebWidget 来搭建产品，不仅仅是开发者
2. WebWidget 可以运行在不同的前端技术框架中
3. 所有的前端组件，都可轻松变成 WebWidget
4. 所有的 NoCode 产品，都可兼容 WebWidget
5. Npm 或 Github 成为 WebWidget 的开放应用市场，使用公共 CDN 随时分发

## 标准化内容

WebWidget 标准由如下三个部分组成：

### 容器

它是运行 WebWidget 应用的容器，使用 HTML 标签可以立即创建一个带有沙盒的容器并且启动应用：

```html
<web-widget src="my-app.widget.js" sandboxed></web-widget>
```

[规范文档](container.md)

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

[规范文档](application.md)

### 应用描述

WebWidget 应用使用 pageckage.json 来描述应用信息，这样可以将它发布在 Npm 平台，使用公共 CND 来加载应用。

```json
{
  "name": "my-app",
  "WebWidget": "1.0.0",
  "version": "0.0.1",
  "main": "dist/umd/index.widget.js",
  "……": "……"
}
```

[规范文档](describe.md)

## 其他

本章节非规范内容。

### SEO

因为 WebWidget 是一个标准的 Web Component，因此它的 SEO 问题本质上是 JavaScript 和 Web Component 的 SEO 问题。社区中有两种实践方式：

* 使用 [Light DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom#lightdom) 来描述关键内容
* 使用 [JSON-LD](https://json-ld.org/) 描述关键内容

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
