# WebWidget 容器

WebWidget 是一个标准的 Web Component 组件，它也是一个容器，容器内的具体功能由 `src` 定义的脚本实现。

```html
<web-widget src="app.widget.js"></web-widget>
```

为了不影响主页面的加载性能，WebWidget 的脚本是异步载入的。为了符合渐进式增强的体验，最佳做法是使用占位符与后备。

## 占位符

`placeholder` 元素将充当 WebWidget 元素的占位符号。如果指定，则 `placeholder` 元素必须是 WebWidget 元素的直接子级。`placeholder` 元素将始终 fill（填充）父级 WebWidget 元素。

```html
<web-widget src="app.widget.js">
  <placeholder>
    <img src="preview.jpg" />
  </placeholder>
</web-widget>
```

## 后备

`fallback` 元素将充当 WebWidget 元素的后备占位符号，以便指明出现以下情况时采取的后备行为：

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

如果 WebWidget App 支持插槽，那么可以直接使用 `slot` 属性来指定插入的位置：

```html
<web-widget src="app.widget.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

插槽源自于 Web Component，更多插槽信息可以访问 <https://developer.mozilla.org/en-US/docs/Web/Web_Components>。

## 配置数据

通过 `data-*` 属性可以为 WebWidget App 传递静态的数据：

```html
<web-widget
  src="app.widget.js"
  data-username="web-widget"
  data-email="web-widget@web-sandbox.js.org"
>
</web-widget>
```

WebWidget App 可以通过生命周期函数获的 `properties.data` 参数获取到数据：

```json
{
  "data": {
    "username": "web-widget",
    "email": "web-widget@web-sandbox.js.org"
  }
}
```

受限于 HTML5 的约束，通过 `data-*` 只能传递 `string` 类型的值，如果想要传递 JSON 数据，你可以通过 `include-data` 属性指定包含目标 ID 元素节点的内容作为 JSON 数据：

```html
<web-widget src="app.widget.js" include-data="data-source">
  <script id="data-source" type="json">
    {
      "username": "web-widget",
      "email": "web-widget@web-sandbox.js.org"
    }
  </script>
</web-widget>
```

推荐使用带有 `type="json"` 属性的 `<script>` 标签作为 JSON 数据容器。原因：

* 浏览器不会渲染它的内容
* 有更好的语义

如果同时存在 `include-data` 与 `data-*`，只有 `include-data` 会生效。

## 自定义元素模式

如果入口文件是一个标准的 Web Component，那么使用 `custom-element` 属性可以简化 Web Component 的加载与使用。

```html
<web-widget custom-element="my-element" src="my-element.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

```js
// my-element.js
export default class MyElement extends HTMLElement {
  // ...
}
```

在这个模式下，入口文件不需要生命周期函数（也不会运行）。 

> 💡 注释
> 
> 自定义元素模式它不要求入口文件实现生命周期函数，这意味着将失去标准 WebWidget 应用拥有的主要能力，它更像是 Web Component 加载器。因此我们需要评估是否将其纳入 WebWidget v1.0.0 规范中。

## 沙盒

给 WebWidget 增加 `sandboxed` 属性即可启用沙盒。一旦沙盒被开启，能够让 WebWidget App 的所有的操作限制在 `<web-widget>` 视图内，它的网络、本地存储等都将被管控，让不可信代码能够安全的运行。

```html
<web-widget src="app.widget.js" sandboxed csp="script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net;">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

如果应用没有实现生命周期函数，开启沙盒后也能确保它能够正常被渲染的同时也不会对主文档产生副作用，因此可以使用沙盒特性来快速迁移一些旧的代码。

关于沙盒环境的限制可以参考 [WebSandbox.js](https://web-sandbox.org.js)。

## 接口

* [HTMLWebWidgetElement](#HTMLWebWidgetElement)
* [WebWidget](#HTMLWebWidgetElement)

## HTMLWebWidgetElement

通过 `document.createElement('web-widget')` 会返回一个 `HTMLWebWidgetElement` 实例：

```js
const widget = document.createElement('web-widget');
widget.data = {
  username: 'web-widget'
};
widget.src = 'app.widget.js';
document.body.appendChild(widget);
```

### `src`

应用入口文件。

### `name`

应用名称。应用脚本可以通过生命周期的 `properties.name` 访问到。

### `data`

应用的数据。应用脚本可以通过生命周期的 `properties.data` 访问到。

### `update(data)`

更新应用数据。调用此方法后，将会执行应用 `update` 生命周期函数。

### `hidden`

显示与隐藏应用。不同于 CSS `display: none`，`hidden` 会触发应用的生命周期 `mount` 与 `unmount` 函数。

### `sandboxed`

沙盒化。启用后，WebWidget 应用将被强制容器化，避免影响主文档。

### `csp`

内容安全策略。只有开启 `sandboxed` 属性后才有效。

### `contentWindow`

容器的内部 `window` 对象。只有开启 `sandboxed` 属性后才有效。

### `contentDocument`

容器的内部 `document` 对象。只有开启 `sandboxed` 属性后才有效。

### `loading`

指示浏览器应当如何加载。允许的值：

* `"eager"` 立即加载，不管它是否在可视视口（visible viewport）之外（默认值）
* `"lazy"` 延迟加载，直到它和视口接近的距离

### `importance`

指示下载资源时相对重要性，或者说优先级。允许的值：

* `"auto"` 不指定优先级
* `"high"` 在下载时优先级较高
* `"low"` 在下载时优先级较低

### `evaluate(source, context)`

运行 JavaScript 代码。开启 `sandboxed` 后，它将在沙盒环境中执行。

## WebWidget

### \#registerPortal(name, callback)

如果应用需要在外部打开一个子应用，那么必须知道它插入点，使用 `registerPortal()` 可以注册插入点。

```js
WebWidget.registerPortal('dialog', name => {
  return import('ui-dialog').then(dailog => {
    return dailog.container;
  });
});
```

应用可以通过 `getPortal(name)` 获取到插入点。

```js
// app.widget.js
function mount(properties) {
  const {
    mountParcel,
    getPortal
  } = properties;

  getPortal('dialog').then(container => {
    mountParcel(() => import('app-settings-panel.widget.js'), {
      container
      //...
    });
  });
}
```

## 事件

* `load`
* `error`

> 💡 注释
> 
> `contentWindow`、`contentDocument`、`loading`、`importance` 特性参考自 `<iframe>` 标签属性。
