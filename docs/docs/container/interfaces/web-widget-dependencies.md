# 容器 >> 接口 >> WebWidgetDependencies || 2

WebWidgetDependencies 是[应用标准接口](../../application/overview.md#props)的实现，可以通过扩展此接口来实现应用的依赖注入。

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

## data

应用的数据（只读）。

## env

应用的启动参数（只读）。它默认会返回 Web Widget 容器的所有属性的 map 结构。

## ownerElement

`<web-widget>` 元素实例（只读）。