- 开始日期：2021-07-07
- 作者：糖饼
- 类型：技术

# 目标

提高 WebWidget 容器的可扩展性。

# 动机

WebWidget 是一种前端容器化的技术，它除了可以通过路由驱动而实现一个微前端的应用，也可以作为插件容器，无论是应用还是插件都可以用如下生命周期表示：

```js
export default () => ({
  async bootstrap(properties) {},
  async mount(properties) {},
  async update(properties) {},
  async unmount(properties) {},
  async unload(properties) {}
});
```

插件相对于应用的核心区别是它需要依靠宿主提供的 API 才能运行，而通生命周期的参数注入是一种较好的编程方式，因为它没有副作用。然而目前 WebWidget 容器并没有标准的可以向应用注入依赖的接口，因此这是为什么要提出本 REC 的原因。

# 产出

- 开发者可以通过 WebWidget 来构建应用的插件系统
- 基于低级的接口设计可让 WebWidget 能够保持长远的稳定的同时应对未来的需求

# 提议内容

- 增加一个全新的全局接口 `WebWidgetDependencies`，而生命周期的参数即等于它的实例，开发者可以随时通过它注入新的特性
- `HTMLWebWidgetElement` 增加一个原型 `createDependencies()` 方法，它默认会创建 `WebWidgetDependencies` 的实例，而开发者可以覆盖它

```js
WebWidgetDependencies.prototype.setDocumentTitle = function(title) {
  document.title = title;
}
```

```js
// ./plugin.widget.js
export default () => ({
  async mount({ setDocumentTitle }) {
    setDocumentTitle('hello wrold');
  }
});
```

## 替代方案对比

替代方案 1:

使用 `HTMLWebWidgetElement` 作为 `properties` 的扩展目标，并且通过配置来决定插件允许哪些属性可以被使用，例如：

```js
HTMLWebWidgetElement.prototype.dependencies.push('setDocumentTitle');
HTMLWebWidgetElement.prototype.setDocumentTitle = function(title) {
  document.title = title;
}
```

此方案弊端：

1. `HTMLWebWidgetElement` 是 `<web-widget>` 自定义标签的接口，它是视图的实现，而插件并不关心视图，因此用它作为插件扩展接口与职责不相符
2. `HTMLWebWidgetElement.prototype.dependencies` 是一个数组对象，这意味通过操作实例 `dependencies` 属性的时候需要特别小心，否则它会影响所有的实例。标准的 Web 接口原型中几乎没有使用对象

代替方案 2:

使用全局对象注入 API，例如：

```js
const widget = document.createElement('web-widget');
widget.src = './plugin.widget.js';
widget.contentWindow.setDocumentTitle = function(title) {
  document.title = title;
}
```

```js
// ./plugin.widget.js
export default () => ({
  async mount(properties) {
    setDocumentTitle('hello wrold');
  }
});
```

此方案的弊端：

* 非沙箱环境下，插件没有自己的全局对象
* 全局对象注入容易引起沙箱的安全隐患

## 指引和例子

### 提供插件专属的接口

如果直接在 `WebWidgetDependencies.prototype` 进行扩展会影响所有的插件，而通过继承可以实现多态，进行隔离。

```js
class PluginDependencies extends WebWidgetDependencies {
  setDocumentTitle() {
    document.title = title;
  }
}
class HTMLEditorPluginElement extends HTMLWebWidgetElement {
  createDependencies() {
    return new PluginDependencies(this);
  }
}
customElements.define('editor-plugin', HTMLEditorPluginElement);
```

```html
<editor-plugin src="./main.plugin.js"></editor-plugin>
```

```js
// main.plugin.js
export default {
  async mount({
    setDocumentTitle
  }) {
    setDocumentTitle('hello wrold');
  }
}
```

### 给所有的 WebWidget 容器增加 ShadowDOM 的开关

WebWidget 应用默认工作在 Shadow DOM 中，我们可以设计成配置开关。一旦包含 `noshadow` 属性就不开启 Shadow DOM：

```js
const containerDescriptor = Reflect.getOwnPropertyDescriptor(WebWidgetDependencies.prototype, 'container');
const containerGetter = containerDescriptor.get;
containerDescriptor.get = function get() {
  if (this.ownerElement.getAttribute('noshadow') !== null) {
    return this.ownerElement;
  }
  return containerGetter.apply(this, arguments);
};
Reflect.defineProperty(WebWidgetDependencies.prototype, 'container', containerDescriptor);
```

通过标签使用：

```html
<web-widget src="./hello-world.widget.js" noshadow></web-widget>
```

如果想通过 DOM 接口来操作 `noshadow`，这应当扩展 `HTMLWebWidgetElement`：

```js
// 为 HTMLWebWidgetElement 拓展一个 "noshadow" properties
Object.defineProperties(HTMLWebWidgetElement.prototype, {
  noshadow: {
    configurable: true,
    get() {
      return this.getAttribute('noshadow') !== null;
    },
    set(v) {
      return v
        ? this.setAttribute('noshadow', '')
        : this.removeAttribute('noshadow');
    }
  }
});
```

通过命令使用：

```js
const widget = document.createElement('web-widget');
widget.noshadow = true;
widget.src = './hello-world.widget.js';
document.body.appendChild(widget);
```

# 需要讨论的问题

* 是否有比 `WebWidgetDependencies` 更符合语义的命名方式？