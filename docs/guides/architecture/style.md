# 容器化 >> 管理样式 || 40

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

默认情况下，Web Widget 应用工作在 [shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM) 中。

## 作用域

shadow DOM 的好处是确保应用的 CSS 只影响自己，这是减少样式冲突问题的最佳技术。例如如下 Web Widget 应用设置了全局的 `<h3>` 标签的样式，但它只会在应用内部生效：

```js
export default () => ({
  async mount({ container }) {
    container.innerHTML = `
      <style>h3 { color: red }</style>
      <h3>hello wrold</h3>
    `;
  }
});
```

## 主题

在 shadow DOM 中，有三种方式可以从外部影响内部的样式，你可以只用其中之一，也可以同时使用三者：

* [:host](https://developer.mozilla.org/en-US/docs/Web/CSS/:host)
  * [`:host()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:host())
  * [`:host-context()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:host-context())
* [::part](https://developer.mozilla.org/en-US/docs/Web/CSS/::part)
* [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

例如使用 `theme` 属性来切换主题：

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

## 禁用 shadow DOM

```html
<web-widget src="app.widget.js" rendertarget="light"></web-widget>
```

<inline-notification type="warning">

关闭 shadow DOM 后，你需要自己管理应用可能造成的样式冲突的问题，并且 Web Widget 容器的插槽等众多高级特性都将无法工作。

</inline-notification>

