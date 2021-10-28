# 架构 >> 入门

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

不同于传统的组件，Web Widget 的应用是建立在明确设计模式下的，因此我们有机会通过部署统一的架构去管理、优化它们，使我们更容易的构建符合最佳的用户体验的产品。

## 安装

除了使用 CDN 来安装 Web Widget 运行时之外，常见做法是通过 NPM 安装到你的工程中。

```bash
npm install --save @web-widget/core
```

## 权衡

### 首屏性能优先

[AMP](https://amp.dev) 的性能优先的工程设计为 Web Widget 的诞生提供了很多灵感，它的优化策略对采用 Web Widget 的网站也同样有效，一些推荐设置：

* HTML 中的布局、文本等关键元素通过服务器渲染，而 Web Widget 应用由浏览器渲染
* HTML 中的布局、文本等关键元素的 CSS 样式内嵌入在页面中
* 文本等需要支持 SEO 的内容使用插槽
* 为 Web Widget 容器预设置尺寸，避免渲染回流
* 为 Web Widget 容器开启懒加载
* 为 Web Widget 容器提供占位符
* 为 Web Widget 容器提供后备
* 为 Web Widget 容器的运行时文件采用异步加载

更多相关信息可以参考 [AMP](https://amp.dev) 的官网。

### 容器化是手段，不是目的

Web Widget 被设计为容器化的 UI 服务，它和传统的 Library 的有着明显的区别，因此应用事件机制、应用的对外接口并非 Web Widget 的要素，如果我们发现 Web Widget 应用需要频繁的与外部交互，一些解决问题的建议：

* 使用传统 Library 来共享代码
* 将需要相互交互的 Web Widget 应用合并成一个

## 懒加载

类似 `<img>` 标签，使用 `loading="lazy"` 属性可以让元素进入视图才加载。

```html
<web-widget src="./app.widget.js" loading="lazy"></web-widget>
```

## 占位符

`<web-widget>` 元素的直接子元素 `<placeholder>` 标签将充当占位符。

```html
<web-widget src="./app.widget.js">
  <placeholder>
    loading..
  </placeholder>
</web-widget>
```

## 后备

`fallback` 元素将充当 Web Widget 容器的后备占位符号。用途：

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

## 插槽

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

## 主题

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

<inline-notification type="tip">

欢迎提供帮助：如何让可视化编辑器中够发现小挂件的支持的主题列表，以便用户能够切换。

</inline-notification>

## SEO

因为 Web Widget 是一个标准的 Web Component，因此它的 SEO 问题本质上是 JavaScript 和 Web Component 的 SEO 问题。社区中有两种实践方式：

* 使用 [Light DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom#lightdom) 来描述关键内容
* 使用 [JSON-LD](https://json-ld.org/) 描述关键内容

## 多语言

<inline-notification type="tip">

这部分没有完成，欢迎提供帮助。

</inline-notification>

## 服务器渲染

<inline-notification type="tip">

这部分没有完成，欢迎提供帮助。

</inline-notification>