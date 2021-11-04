# 容器 >> 标签 || 10

```html
<web-widget src="app.widget.js"></web-widget>
```

## 占位符

`<placeholder>` 元素将充当 Web Widget 容器的占位符号。用途：

* 预览图片或文本
* 骨架占位或 loading 动画

```html
<web-widget src="app.widget.js">
  <placeholder>
    <img src="preview.jpg" />
  </placeholder>
</web-widget>
```

## 后备

`<fallback>` 元素将充当 Web Widget 容器的后备占位符号。用途：

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

当 Web Widget 应用变更为以下任意状态将会触发 `fallback` 元素显示：

* `load-error`
* `bootstrap-error`
* `mount-error`

## 插槽

如果 Web Widget 应用支持插槽，那么可以直接使用 `slot` 属性来指定插入的位置：

```html
<web-widget src="app.widget.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

插槽源自于 Web Component，更多插槽信息可以访问 <https://developer.mozilla.org/en-US/docs/Web/Web_Components>。

## 数据

通过 `data` 或 `data-*` 属性可以为 Web Widget 应用传递静态的数据：

```html
<web-widget
  src="app.widget.js"
  data-username="web-widget"
  data-email="web-widget@web-widget.js.org"
>
</web-widget>
```

Web Widget 应用可以通过生命周期函数获的 `data` 参数获取到数据。

```js
// app.widget.js
export default () => ({
  async mount({ data }) {
    console.log(data);
  }
});
```

> 通过 `data-*` 只能传递 `string` 类型的值；使用 `data` 属性可以使用 JSON 字符串，它将自动解析成 `object`。

## 沙盒

给 Web Widget 容器增加 `sandboxed` 属性即可启用沙盒。一旦沙盒被开启，能够让 Web Widget 应用的所有的操作限制在 `<web-widget>` 视图内，它的网络、本地存储等都将被管控，让不可信代码能够安全的运行。

```html
<web-widget src="app.widget.js" sandboxed csp="script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net;">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

沙盒需要通过安装 [sandbox](./plugins/sandbox.md) 插件才能生效。

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

## 懒加载

类似 `<img>` 标签，使用 `loading="lazy"` 属性可以让元素进入视图才加载。

```html
<web-widget src="app.widget.js" loading="lazy"></web-widget>
```