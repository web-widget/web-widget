# 架构 >> 入门

不同于传统的组件系统，Web Widget 的应用是建立在明确范式上的，因此我们有机会通过部署统一的前端容器化架构去管理、优化它们，更容易的构建符合最佳的用户体验的产品。

## 实施容器化架构之前

Web Widget 是有明确的限制的，希望你能知晓它的适用范围，而不会因为不恰当的引入它产生副作用。

### 它不是组件

我们很容易将服务与组件混淆，以至于我们试图用组件的思路来建设服务体系，这会放大服务的缺点，而得不到任何好处。

服务和组件的关键区别：服务是可以独立运行的，而组件是需要组装才能运行。因此，Web Widget 应用没有提供事件机制、没有提供对外的接口（除了生命周期函数）。

### 容器化是手段而不是目标

当你想考虑如何延长软件的生命的问题，或者架设无代码编程的物料体系的时候，通过服务的抽象是一种非常好的解决问题手段。如果我们发现 Web Widget 应用确实需要与外部交互才能解决具体业务问题，你可以先尝试改进现有的代码：

* 将需要频繁交互的模块 `import` 到 Web Widget 应用里，在内部解决耦合问题
* 将需要相互交互的 Web Widget 应用合并成一个单一应用

如果依然无法解决问题，你可能需要认真考虑是否应当继续实施服务化。

## 安装

通过 NPM 安装到你的工程中：

```bash
npm install --save @web-widget/container
```

在页面中引入应用容器的运行时文件：

```js
import '@web-widget/container';
```

## 性能优先

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

## 搜索引擎优化

因为 Web Widget 容器是一个标准的 Web Component，因此它的 SEO 问题本质上是 JavaScript 和 Web Component 的 SEO 问题。社区中有两种实践方式：

* 使用 [Light DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom#lightdom) 来描述关键内容
* 使用 [JSON-LD](https://json-ld.org/) 描述关键内容