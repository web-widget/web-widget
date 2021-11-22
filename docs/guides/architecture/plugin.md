# 容器化 >> 构建插件系统 || 60

当你需要为你的应用实现专有的插件体系的时候，我们推荐你扩展 Web Widget 容器来实现你的需求，这样你可以不用花精力建设插件开发的工具链，你要做的事情只有两点：

* 扩展 Web Widget 容器，实现专有的插件容器标签，以便和常规的 Web Widget 应用区分
* 设计插件的 API，并且通过插件容器注入依赖

## 示例

为某个 Web 编辑器应用开发一个插件系统，它支持插件操作编辑器的文档格式。我们通过 3 个步骤为你演示达成目标的关键的环节：

### 1. 制作插件的容器

Web Widget 容器是一个 Web components，它的 `class` 是 `HTMLWebWidgetElement`，通过继承它创建一个新的插件容器自定义标签，这样可以更好的识别它：

```js
import { WebWidgetDependencies, HTMLWebWidgetElement } from '@web-widget/container';

class HTMLEditorPluginElement extends HTMLWebWidgetElement {
  createDependencies() {
    return new PluginDependencies(this);
  }
}
customElements.define('editor-plugin', HTMLEditorPluginElement);
```

于是你有了一个 `<editor-plugin>` 标签：

```html
<editor-plugin src="./main.plugin.js"></editor-plugin>
```

### 2. 实现插件依赖注入

通过扩展 `WebWidgetDependencies` 类，可以为插件注入运行所需的依赖，例如允许插件使用 `setDocumentTitle()` 方法来操作文档的标题：

```js
class PluginDependencies extends WebWidgetDependencies {
  setDocumentTitle(title) {
    editor.module.title = title;
  }
}
```

### 3. 开发第一个插件

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

你可以通过[编写插件文档](../../docs/container/writing-plugins/overview.md)了解细节。