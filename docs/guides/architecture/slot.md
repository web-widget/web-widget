# 容器化 >> 使用插槽 || 40

通常情况下，一个 Web Widget 应用的内部 DOM 是完全封闭的，大部分情况下这是优点，但也带来一些不便，一方面是对搜索引擎不利，另一方面是难以和元素或者其他应用组合——应用插槽解决了这样的问题：既做到了 DOM 的封闭，也允许开放 DOM。

下述 Web Widget 应用提供了两个插槽：`title` 与 `content`。

```js
// app.widget.js
export default () => ({
  async mount({ container }) {
    container.innerHTML = `
      <h3><slot name="title">Default title</slot></h3>
      <div><slot name="content">Default content</slot></div>
    `;
  },

  async unmount({ container }) {
    container.innerHTML = '';
  }
});
```

我们可以通过容器来使用应用提供的插槽，将其他元素渲染在应用提供的插槽所在位置：

```html
<web-widget src="./app.widget.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

Web Widget 的插槽就是 Web Components `slot`，更多插槽信息可以访问 <https://developer.mozilla.org/en-US/docs/Web/Web_Components>。