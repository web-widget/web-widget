# 应用 >> 接口 || 20

本文描述的是应用运行依赖的标准接口，应用容器的实现者必须实现这些标准接口。

## 获取接口

生命周期函数第一个参数是一个 `object`，它属于应用运行的接口：

```js
export default (props) => ({
  async bootstrap(props) {},
  async mount(props) {},
  async update(props) {},
  async unmount(props) {},
  async unload(props) {}
});
```

## container

`HTMLElement`

应用用于渲染 DOM 的节点。可以通过 `appendChild()` 、`removeChild()`、`innerHTML` 接口来操作 DOM 渲染。

## context

`object`

应用容器的上下文对象。包含如下三个 API：

* [`mount()`](../container/interfaces/html-web-widget-element.md#mount)
* [`update()`](../container/interfaces/html-web-widget-element.md#update)
* [`unmount()`](../container/interfaces/html-web-widget-element.md#unmount)

## createPortal()

`function`

将应用传送到容器外面挂载（实验性特性）。

```js
const context = createPortal(appContainer, destination)
```

### 参数

* `appContainer` 运行应用的[容器](../container/overview.md)
* `destination` 目的地名称

### 返回值

一个 [`context`](#context) 对象。

示例：

```js
// app.widget.js
export async function mount({ createPortal }) {
  const appContainer = document.createElement('web-widget');
  appContainer.src = './lit-element-todomvc.widget.js';
  createPortal(appContainer, 'dialog')
    .mount()
    .then(() => {
      console.log('dialog is open');
    });
}
```

> 目的地必须先定义才能被使用，例如通过 [HTMLWebWidgetElement.portalDestinations](../container/interfaces/html-web-widget-element.md#portaldestinations) 来定义目的地。

## name

`string`

注册到主文档的应用名称。

## data

`object`

应用的数据。它是一个可以被序列化的数据结构，允许应用自己通过 [`context`](#context) 的 `update({ data })` 方法来更新数据。

## parameters

`object`

应用程序的启动参数。它是一个可以被序列化的数据结构，它视作一种环境变量。和 [`data`](#data) 区别：

* [`data`](#data) 被设计为应用的数据，应用开发者对其结构完全知晓；而 `parameters` 可能包含非常多宿主特有的额外环境信息，例如 `theme`、`lang` 等，应用程序可以遵循它们完成特定的一些操作，也可以完全忽视它们而不会引起故障
* `parameters` 是只读的，应用程序自己不能修改它

## sandboxed

`boolean`

应用是否处于沙盒模式中（实验性特性）。