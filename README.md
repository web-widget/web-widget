# WebWidget 白皮书

本规范定义了一种通用的网页小挂件标准格式，它可以集成在不同的 Web 技术开发的应用中。

## 什么是 WebWidget

WebWidget 是一种和技术栈无关的小挂件标准，和传统的前端 UI Library 不同，它提供的是服务。

## 为什么要设计 WebWidget

### 问题

1. 开源社区大量的组件只能在特定的技术框架中才能运行，甚至一些组件依赖了特定的技术框架版本
2. 开发者需要花大量的时间研究每一个接口与服务、写很多胶水代码、测试胶水代码后才能让应用运行起来
3. 开源组件组件以及其依赖的安全问题、和应用的兼容性问题通常难以被察觉

### 契机

1. 在 NoCode/LowCode 理念流行下，可视化 Web 应用搭建系统层出不求，这样的体系下需要大量的、开箱即用的组件才能满足客户的需求
2. 微前端成为流行的技术理念，single-spa 定义的生命周期格式让 Web 应用跨技术栈、标准化接口提供很好的实践范例
3. Npm 成为了一个托管资源庞大的前端组件的大仓库，基于它有多个开箱即用的公共 CDN 服务
4. WebComponents 成为面向未来的组件标准，几乎所有流行开源框架都支持它
5. 虚拟化技术延伸到了 Web 前端领域（例如 [WebSandbox.js](https://web-sandbox.js.org)），使得我们可以创建安全的第三方组件运行环境

### 愿景

基于上述问题与契机，建设 WebWidget 规范的直接动机来自于 NoCode 产品中的组件系统，例如可视化页面搭建编辑器。

1. 所有人都可以使用 WebWidget，而非只有开发者
2. 和技术栈无关，兼容所有前端框架
3. 所有的前端组件，都可轻松变成 WebWidget
4. 所有的 NoCode 产品，都可兼容 WebWidget
5. Npm 或 Github 可以作为 WebWidget 的应用市场，使用公共 CDN 随时分发

## 标准化目标

* WebWidget 加载器
  * 标签
  * 接口
* WebWidget 入口文件
  * 生命周期
  * 插槽
  * 属性配置
  * 动作/方法
  * 唤起其他 WebWidget
  * 主题适应
  * ……
* WebWidget 描述文件
  * 名称
  * 简介
  * 图标
  * 关键字
  * 说明文档
  * 入口文件地址
  * ……

## WebWidget 标签使用范例

### 载入组件

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

### 传入数据

本地：

```html
<web-widget src="widget.js">
  <script type="data-source">
    {
      "web": "widget"
    }
  </script>
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

远程：

```html
<web-widget src="widget.js">
  <script type="data-source" src="https://api.com/?data"></script>
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

### 使用 Web Components 扩展

```html
<web-widget is="my-element" src="widget.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

### 使用沙盒隔离环境

```html
<web-widget src="widget.js" sandboxed csp="script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net;">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

## 其他

本章节非规范内容。

### SEO

TODO

### 加载 WebWidget

WebWidget 是一种和特定技术栈、加载器无关的格式，可以自行实现或者使用社区已有的方案来完成它的加载与运行。

* 使用 WebSandbox 来加载
* 使用 single-spa

TODO

### 发布 WebWidget

WebWidget 可以发布到任何地方，例如企业的私有 CDN，如果你想让所有人都可以使用到，推荐发布到 Npm 或者 Github，这样使用者可以通过公共 CDN 加载它。 
