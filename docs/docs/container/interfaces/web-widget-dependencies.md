# 容器 >> 接口 >> WebWidgetDependencies || 2

WebWidgetDependencies 接口是应用的生命周期函数接收的参数，因此可以扩展它给应用注入 API。

使用例子：

```html
<editor-plugin src="plugin.widget.js"></editor-plugin>
<script type="module">
  class PluginDependencies extends WebWidgetDependencies {
    setDocumentTitle(title) {
      document.title = title;
    }
  }
  class HTMLEditorPluginElement extends HTMLWebWidgetElement {
    createDependencies() {
      return new PluginDependencies(this);
    }
  }
  customElements.define('editor-plugin', HTMLEditorPluginElement);
</script>
```

```js
// plugin.widget.js
export default () => ({
  async mount(properties) {
    properties.setDocumentTitle('hello world');
  }
});
```

## container

应用用于渲染 DOM 的节点（只读）。可以通过 `appendChild()` 、`removeChild()`、`innerHTML` 接口来操作 DOM 渲染。

## context

应用容器的上下文 API（只读）（实验性特性）。包含如下三个 API：

* [`mount()`](./html-web-widget-element.md#mount)
* [`update()`](./html-web-widget-element.md#update)
* [`unmount()`]./html-web-widget-element.md(#unmount)

## createPortal()

将应用传送到容器外面挂载。

```js
const context = createPortal(webWidgetElement, destination)
```

### 参数

* `webWidgetElement` Web Widget 容器
* `destination` 目的地名称

### 返回值

一个 [`context`](#context) 对象。

示例：

```js
// app.widget.js
export async function mount({ createPortal }) {
  const app = document.createElement('web-widget');
  app.src = './lit-element-todomvc.widget.js';
  createPortal(app, 'dialog')
    .mount()
    .then(() => {
      console.log('dialog is open');
    });
}
```

> 目的地必须先定义才能被使用，例如通过 [HTMLWebWidgetElement.portalDestinations](./html-web-widget-element.md#portaldestinations) 来定义目的地。
>
> 这是试验性特性。

## name

应用名称（只读）。

## data

应用的初始化数据（只读）。

## sandboxed

应用是否处于 WebSandbox DOM 沙箱中（只读）。