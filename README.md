# WebWidget

本规范定义了一种通用的网页小挂件标准格式，它可以集成在不同的 Web 技术开发的应用中。

## 什么是 WebWidget

WebWidget 是一种轻量级的应用程序，它有点类似 iOS 与 Android 的小挂件，它可以当作小应用被宿主随时加载与启动，它依赖于 Web 技术（尤其是 CSS 和 JavaScript）。

## 为什么要设计 WebWidget

### 问题

1. 社区大量的开源组件只能在特定的技术框架中才能运行，甚至一些组件依赖了特定的技术框架版本
2. 开发者需要花大量的时间研究每一个接口与服务、写很多胶水代码、测试胶水代码后才能让应用运行起来
3. 开源组件的安全问题、和应用的兼容性问题通常难以被察觉

### 契机

1. NoCode/LowCode 思想下，可视化 Web 应用搭建系统层出不求，这样的体系下需要大量开箱即用的组件才能满足客户的需求
2. 微前端成为流行的技术理念，single-spa 定义的生命周期格式让 Web 应用跨技术栈、标准化接口提供很好的实践范例
3. Npm 成为了一个托管资源庞大的前端组件的大仓库，基于它有多个开箱即用的公共 CDN 服务
4. WebComponents 作为标准的、面向未来的组件解决方案，几乎所有流行开源框架都支持它
5. 虚拟化技术延伸到了 Web 前端领域（例如 [WebSandbox.js](https://web-sandbox.js.org)），使得我们可以创造独立且安全的第三方组件运行环境

## 范例

### 简单使用

```html
<web-widget src="widget.js"></web-widget>
```

### 使用插槽

```html
<web-widget src="widget.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

### 使用沙盒隔离环境

```html
<web-widget src="widget.js" sandbox>
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

### 载入并使用 Web Components

```html
<web-widget is="my-element" src="widget.js" sandbox>
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

## 和 WebComponents 的差异

TODO

## 运行在沙箱环境中

TODO

## WebWidget 描述

TODO

## 生命周期

TODO

## 声明对外提供的服务

* API
* 属性
* 插槽
* 事件

TODO

## 打开其他 WebWidget

TODO

## 其他

本章节非规范内容。

### 加载 WebWidget

WebWidget 是一种和特定技术栈、加载器无关的格式，可以自行实现或者使用社区已有的方案来完成它的加载与运行。

* 使用 WebSandbox 来加载
* 使用 single-spa

TODO

### 发布 WebWidget

WebWidget 可以发布到任何地方，例如企业的私有 CDN，如果你想让所有人都可以使用到，推荐发布到 Npm 或者 Github，这样使用者可以通过公共 CDN 加载它。 
