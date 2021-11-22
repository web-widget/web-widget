- 开始日期：2021-07-07
- 作者：糖饼

# 目标

提高 Web Widget 容器的可扩展性，让其支撑构建应用的插件系统需求。

# 动机

小挂件、微应用本质上也是一种插件的设计模式，我们可以使用相同的设计模式来描述它们的入口文件：

```js
export default () => ({
  async bootstrap(properties) {},
  async mount(properties) {},
  async update(properties) {},
  async unmount(properties) {},
  async unload(properties) {}
});
```

一旦定义了标准入口文件格式，对于容器而言，无论是管理小挂件、微应用还是插件，所依赖的能力几乎都相同，因此 Web Widget 有望成为基于上述标准的可扩展前端微服务运行容器。

通常情况下，插件需要依赖宿组提供的 API 才能运行，然而目前 Web Widget 容器规范中并没有定义向应用注入依赖的接口，因此这是为什么要提出本 REC 的原因。

# 产出

- 开发者可以通过 Web Widget 来作为底层构建应用的插件系统
- 基于低级的接口设计可让 Web Widget 能够适应更多不可预测的需求，并且保持较长的稳定性

# 提议内容

- 提出使用生命周期函数的参数注入 API 依赖，而不是全局对象或者使用事件监听器传入
- 增加一个全新的全局接口 `WebWidgetDependencies`，用于注入插件文件所依赖的 API
- `HTMLWebWidgetElement` 类增加 `createDependencies` 钩子，它默认会调用 `new WebWidgetDependencies(this)`，而开发者可以覆盖它

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
2. `HTMLWebWidgetElement.prototype.dependencies` 是一个 `array` 对象，这意味通过操作实例 `dependencies` 属性的时候需要特别小心，否则它会影响所有的实例；由于标准的 Web 接口原型中几乎没有使用对象，因此这样的设计也不符合既定的接口风格

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

如果直接在 `WebWidgetDependencies.prototype` 进行扩展会影响所有的插件，而通过继承可以实现多态进行隔离。

```js
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

### 给所有的 Web Widget 容器增加 ShadowDOM 的开关

由于 Web Widget 应用默认工作在 Shadow DOM 中，一些情况我们需要关闭 Shadow DOM。最好的做法是将其设计为一个可选的开关，一旦包含 `noshadow` 属性就不开启 Shadow DOM：

```js
// 更改内置的 container getter 行为
const containerDescriptor = Reflect.getOwnPropertyDescriptor(WebWidgetDependencies.prototype, 'container');
const containerGetter = containerDescriptor.get;
containerDescriptor.get = function get() {
  // this.ownerElement 为容器元素的引用
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

* 是否有比 `WebWidgetDependencies` 更符合语义的命名方式
* 与 TC39 Realms 提案的兼容性问题