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

### ~~`data`~~

~~应用的数据。应用脚本可以通过生命周期的 `properties.data` 访问到。~~

### `inactive`

设置为非激活状态。如果为元素包含 `inactive` 属性，元素插入 DOM 树的时候将不再自动触发 `load`、`bootstrap`、`mount`，应用的生命周期只能手动调用或者给外部路由管理库来调用。

### `sandboxed`

沙盒化应用。启用后 WebWidget 应用将使用虚拟化环境来运行 JS。虚拟化环境来自 [WebSandbox](https://web-sandbox.js.org)。

### `csp`

内容安全策略。只有开启 `sandboxed` 属性后才有效。

### `contentWindow`

容器的内部 `window` 对象。只有开启 `sandboxed` 属性后才有效。

### `contentDocument`

容器的内部 `document` 对象。只有开启 `sandboxed` 属性后才有效。

### evaluate(string, context)

在沙箱中执行代码。只有开启 `sandboxed` 属性后才有效。

### 参数

* `string` 一个表示 JavaScript 表达式、语句或一系列语句的字符串。表达式可以包含变量与已存在对象的属性。
* `context` 定义在沙箱中的上下文对象。

### 返回值

返回字符串中代码的返回值。如果返回值为空，则返回 `undefined`。

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

### `status`

应用的状态。

 * `NOT_LOADED` 该应用程序已注册，但尚未加载
 * `LOADING_SOURCE_CODE` 正在获取应用的源代码
 * `NOT_BOOTSTRAPPED` 应用已加载但未初始化
 * `BOOTSTRAPPING` 应用正在初始化中
 * `NOT_MOUNTED` 应用已经初始化，但未挂载
 * `MOUNTING` 应用挂载中
 * `MOUNTED` 应用挂载完成
 * `UPDATING` 应用正在更新数据
 * `UNMOUNTING` 应用正在卸载中
 * `UNLOADING` 应用正在移除中
 * `LOAD_ERROR` 应用程序的加载功能返回了被拒绝的承诺
 * `BOOTSTRAPP_ERROR` 应用程序的初始化功能返回了被拒绝的承诺
 * `MOUNT_ERROR` 应用程序的挂载功能返回了被拒绝的承诺
 * `UPDAT_ERROR` 应用程序的更新功能返回了被拒绝的承诺
 * `UNMOUNT_ERROR` 应用程序的卸载功能返回了被拒绝的承诺
 * `UNLOAD_ERROR` 应用程序的移除功能返回了被拒绝的承诺
 * `SKIP_BECAUSE_BROKEN` 应用在加载，引导，安装或卸载期间抛出错误，并且由于行为不当而被跳过，因此已被隔离。其他应用将继续正常运行

### `load()`

手动加载应用。

返回值：`Promise`

### `bootstrap()`

手动触发应用 `bootstrap` 生命周期函数。

返回值：`Promise`

### `mount()`

手动触发应用 `mount` 生命周期函数。

返回值：`Promise`

### `update(properties)`

手动触发应用 `update` 生命周期函数。

返回值：`Promise`

### `unmount()`

手动触发应用 `unmount` 生命周期函数。

返回值：`Promise`

### `unload()`

手动触发应用 `unload` 生命周期函数。

返回值：`Promise`

### `WebWidget.portals`

全局传送门注册表。这是一个静态方法。

它有两个方法：

* `get(name)`
* `define(name, factory)`

定义传送门：

```js
WebWidget.portals.define('dialog', () => {
  const dialogWidget = document.createElement('web-widget');
  dialogWidget.src = './dialog.widget.js';
  document.body.appendChild(dialogWidget);
  return dialogWidget;
});
```

传送门定义好后，应用就可以使用它了：

```js
export async function mount({ container, createPortal }) {
  const userWidget = document.createElement('web-widget');
  userWidget.slot = 'main';
  userWidget.src = './user.widget.js';
  // 传送应用
  const cardWidget = createPortal(userWidget, 'dialog');
  cardWidget.unmount();
})
```

## 事件

* `load`
* `error`