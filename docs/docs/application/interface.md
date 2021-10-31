# 应用 >> 接口 || 20

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

本文描述的是应用运行依赖的标准接口，应用容器的实现者必须实现这些标准接口。

## 获取接口

生命周期函数第一个参数是一个 `object`，它属于应用运行的接口：

```js
export default () => ({
  async bootstrap(props) {},
  async mount(props) {},
  async update(props) {},
  async unmount(props) {},
  async unload(props) {}
});
```

## container

`Node`

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

应用的初始化数据。它是一个可以被序列化的数据结构。

## sandboxed

`boolean`

应用是否处于沙盒模式中（实验性特性）。

## 示例

<inline-notification type="tip">

示例不是规范的一部分。

</inline-notification>

### 挂载其他应用

你可以在 Web Widget 应用嵌套或者在另外的地方新打开其他 Web Widget 应用。

```js
export async function mount({ container }) {
  const userWidget = document.createElement('web-widget');
  userWidget.src = './users.widget.js';
  container.appendChild(userWidget);
})
```

生成的 DOM：

```html
<web-widget>
  #shadow-root (closed)
    <web-widget src="./users.widget.js">
      #shadow-root (closed)
    </web-widget>
</web-widget>
```

### 应用外打开子应用

通过 `createPortal()` 可以创建一个传送门来传输应用到指定位置（实验性特性）。

在主文档注册一个名为 `"dialog"` 的传送门：

```js
HTMLWebWidgetElement.portalDestinations.define('dialog', () => {
  const dialogWidget = document.createElement('web-widget');
  dialogWidget.src = './dialog.widget.js';
  document.body.appendChild(dialogWidget);
  return dialogWidget;
});
```

传送门注册好后，应用就可以使用它了：

```js
export async function mount({ container, createPortal }) {
  const appContainer = document.createElement('web-widget');
  appContainer.slot = 'main';
  appContainer.src = './user.widget.js';
  // 传送应用
  const cardWidget = createPortal(appContainer, 'dialog');
  cardWidget.unmount();
})
```

生成的 DOM：

```html
<web-widget>
  #shadow-root (closed)
</web-widget>

<web-widget src="./card.widget.js">
  #shadow-root (closed)
    <slot name="main">...</slot>
  <web-widget slot="main" src="./user.widget.js">
    #shadow-root (closed)
  </web-widget>
</web-widget>
```