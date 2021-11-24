# 容器 >> 接口 >> WebWidgetDependencies || 2

WebWidgetDependencies 是[应用标准接口](../../application/interface.md)实现，可以通过扩展此接口来实现应用的依赖注入。

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

应用用于渲染 DOM 的节点（只读）。可以通过 `appendChild()` 、`removeChild()`、`innerHTML` 接口来操作 DOM 渲染。通过 [createRenderRoot()](./html-web-widget-element.md#createrenderroot) 勾子可以定义默认的插入点。

## context

应用容器的上下文 API（只读）（实验性特性）。包含如下三个 API：

* [`mount()`](./html-web-widget-element.md#mount)
* [`update()`](./html-web-widget-element.md#update)
* [`unmount()`](./html-web-widget-element.md#unmount)

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

应用的数据（只读）。

## parameters

应用的启动参数（只读）。它默认会返回 Web Widget 容器的所有属性的 map 结构。

## sandboxed

应用是否处于 WebSandbox DOM 沙箱中（只读）。

## ownerElement

`<web-widget>` 元素实例（只读）。