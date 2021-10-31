# 架构 >> 插件系统 || 60

Web Widget 容器以及应用格式是建立在插件的设计模式之上，因此也可以通过扩展容器而实现 Web 应用中的插件机制。

## 示例

为某个 Web 编辑器应用开发一个插件系统，它支持插件操作文档，允许插件使用 `setDocumentTitle()` 方法。

### 开发插件系统

```js
import { WebWidgetDependencies, HTMLWebWidgetElement } from '@web-widget/container';
```

首先，我们通过扩展 `WebWidgetDependencies` 来设计插件所依赖的接口：

```js
class PluginDependencies extends WebWidgetDependencies {
  setDocumentTitle(title) {
    editor.module.title = title;
  }
}
```

然后，通过继承 `HTMLWebWidgetElement` 创建一个新的插件容器自定义标签，它的目的是为插件注入上面实现的 `PluginDependencies` 类：

```js
class HTMLEditorPluginElement extends HTMLWebWidgetElement {
  createDependencies() {
    return new PluginDependencies(this);
  }
}
customElements.define('editor-plugin', HTMLEditorPluginElement);
```

最后，在 Web 编辑器中插入刚才设计的插件容器标签：

```html
<editor-plugin src="./main.plugin.js"></editor-plugin>
```

### 开发第一个插件

```js
// main.plugin.js
export default () => ({
  async mount({
    container,
    setDocumentTitle
  }) {
    const button = document.createElement('button');
    button.innerText = 'Change document title';

    button.onclick = () => {
      setDocumentTitle('hello wrold');
    };
  }
});
```

## 了解更多

Web Widget 容器提供了良好的扩展抽象，你可以通过[编写插件文档](../../docs/container/writing-plugins/overview.md)了解细节。