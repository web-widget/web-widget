# 容器化 >> 优化 || 10

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

应用通过 `:host()` 选择器可以实现主题的定义，容器可以控制切换主题。例如使用 `theme` 属性来切换主题：

```html
<web-widget theme="my-theme" src="app.widget.js"></web-widget>
```

```js
// app.widget.js
export default () => ({
  async mount({ container }) {
    container.innerHTML = `
      <style>
        :host([theme=my-theme]) h3 {
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

## 预加载

应用将在 `bootstrap` 的生命周期完成挂载前的准备工作，例如样式、图片、数据的加载，因此我们可以使用容器的 `bootstrap()` 方法来完成应用的预加载。

```js
const preload = (async () => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.src = 'app.widget.js';
  document.body.appendChild(widget);
  await widget.bootstrap();
  return widget;
})();
```