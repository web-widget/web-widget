# 应用 >> 接口 || 20

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

生命周期函数第一个参数是一个 `object`，它属于应用运行的接口：

```js
export async function bootstrap(props) {
  console.log('api', props);
}
```

## container

应用用于渲染 DOM 的节点。你可以通过 `appendChild()` 、`removeChild()`、`innerHTML` 接口来操作 DOM 渲染。

## context

应用容器的上下文 API。包含如下三个 API：

* [`mount()`](../container/api.md#mount)
* [`update()`](../container/api.md#update)
* [`unmount()`](../container/api.md#unmount)

## createPortal

将应用传送到容器外面挂载（实验性特性）。

```js
const context = createPortal(webWidgetElement, destination)
```

### 参数

* `webWidgetElement` Web Widget [容器](../container/overview.md)
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

> 目的地必须先定义才能被使用，例如通过 [HTMLWebWidgetElement.portalDestinations](../container/api.md#htmlwebwidgetelementportaldestinations) 来定义目的地。

## name

注册到主文档的应用名称。

## data

应用的初始化数据。

## sandboxed

应用是否处于 WebSandbox DOM 沙箱中（实验性特性）。

## 示例

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
  const userWidget = document.createElement('web-widget');
  userWidget.slot = 'main';
  userWidget.src = './user.widget.js';
  // 传送应用
  const cardWidget = createPortal(userWidget, 'dialog');
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

<inline-notification type="tip">

欢迎提供帮助：应用如果在外面打开键盘焦点管理非常重要，这里需要补充解决方案。

</inline-notification>