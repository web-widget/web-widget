
- 开始日期：2021-07-05
- 作者：糖饼
- 类型：技术

# 目标

WebWidget 沿用了 single-spa 提出的应用生命周期，但是它的接口设计是面向单例应用的，因此本 RFC 将在其应用生命周期的基础上，提出多实例的应用生命周期接口，以便统一沙盒模式与非沙盒模式、es5 module 模块与 script 标签载入 js 应用实例上的区别。

# 动机

为了描述问题，以现有的 single-spa 应用生命周期为例：

```js
let element;
console.log('loaded');
export default {
  async bootstrap() {
    element = document.createElement('div');
    element.innerHTML = `hello wrold`;
  },
  async mount({ container }) {
    container.appendChild(element);
  },
  async unmount({ container }) {
    container.removeChild(element);
  }
}
```

可以看到 single-spa 应用生命周期的函数是面向单例设计的，而单例能够准确的适应这种场景；而 WebWidget 的颗粒度是组件级，而组件天然要求支持多实例。当前 WebWidget 容器通过动态运行代码的手段实现了应用默认在多例模式下运行，但随着 WebWidget 容器支持 es6 模块提案的探讨发现，我们不得不承认通过容器来实现多例会面临兼容性的问题：

- 在 es6 module 模式下，加载相同入口文件，入口文件永远只会只会有一次的初始化
- 如果构建成 AMD 模块，其本质是通过动态 script 标签引入，加载相同的入口文件会有多次的初始化；而 AMD `define(factory)` 接受一个工厂函数，这意味着可以由开发者决定应用的实例模式
- 如果 WebWidget 容器开启了 `sandboxed` 模式，加载相同的入口文件会有多次的初始化，应用被强制在多实例下运行

这样的问题在前端库——Vue 中也遇到，Vue 把组件的 `data` 配置设置为一个 `function` 而不是 `object` 就是为了在语言层面处理多实例，而不是由框架来特殊处理。由于容器的运行模式是应用开发者无法控制的，并且难以理解这些行为上的细微差异，因此我们应设计一个在语言层面明确的多实例接口标准，避免让应用运行出现兼容性的问题。

# 产出

- 提出面向多例的应用/组件接口格式
- 保持对现有的应用格式兼容

# 提议内容

应用导出接口的类型支持 `function`，并且作为首选的方式：

```js
export default () => ({
  async bootstrap(properties) {},
  async mount(properties) {},
  async update(properties) {},
  async unmount(properties) {},
  async unload(properties) {}
});
```

## 替代方案对比

备用方案 1：通过应用周期参数中复用现有的 `context` 参数来操作实例

```js
export default {
  async bootstrap({ container, context }) {
    context.element = document.createElement('div');
    context.element.innerHTML = `hello wrold`;
    instances.set(container, context);
  },
  async mount({ container, context }) {
    const { element } = context;
    container.appendChild(element);
  },
  async unmount({ container, context }) {
    const { element } = context;
    container.removeChild(element);
  }
}
```

值得说明的是 `context` 字段并不是本次 RFC 中新增的概念，它拥有 `mount()` 与 `unmount()` 方法，因此它的语义就是用来引用应用实例。

## 指引和例子

以模态对话框为例，这些组件通常会管理自己的实例，以确保页面只有一个在运行。通过工厂实现单例：

```js
const modalDialog = {
  async bootstrap(properties) {},
  async mount(properties) {},
  async update(properties) {},
  async unmount(properties) {},
  async unload(properties) {}
};
export default () => modalDialog;
```

或者使用原来 single-spa 定义的方案：

```js
export default {
  async bootstrap(properties) {},
  async mount(properties) {},
  async update(properties) {},
  async unmount(properties) {},
  async unload(properties) {}
}
```

## 兼容性

兼容现有 single-spa 设计的应用生命周期格式，但 single-spa 无法兼容本次 RFC 扩展的格式。

# 需要讨论的问题

是否有更好的方案？