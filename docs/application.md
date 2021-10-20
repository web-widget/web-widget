# WebWidget 应用

## 应用入口文件

应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的入口文件，它包含生命周期函数：

```js
export default () => ({
  async bootstrap(properties) {},
  async mount(properties) {},
  async update(properties) {},
  async unmount(properties) {},
  async unload(properties) {}
});
```

或者使用单例模式：

```js
export async function bootstrap(properties) {}
export async function mount(properties) {}
export async function update(properties) {}
export async function unmount(properties) {}
export async function unload(properties) {}
```

### 构建打包

入口文件首选的格式为 ES Module，为了有更好的兼容性，同时还应当提供一份 system 格式版本。

> * `.widget.js` 后缀名是一个约定而非规范内容，它的目的是让开发工具能够更好识别 WebWidget 应用
> * 受沙盒的实现影响，ES Module 格式在沙盒下暂时无法工作，因此推荐使用 system 作为沙盒模式下的模块方案


## 应用生命周期

应用容器（加载器）会依次调用应用入口文件的定义的生命周期函数。

注:

* 生命周期函数必须有返回值，可以是 `promise` 或者 `async` 函数
* 如果导出的是函数数组而不是单个函数，这些函数会被依次调用，对于 `promise` 函数，会等到 resolve 之后再调用下一个函数
* 如果应用只被预加载，各个应用会被下载，但不会被初始化、挂载或卸载

> 应用生命周期来自于微前端框架 [single-spa](https://single-spa.js.org/) 的定义，这样可以确保 WebWidget 容器可以加载 [single-spa](https://single-spa.js.org/) 的应用。

WebWidget 元素会在不同的阶段主动触发这些应用生命周期：

```js
const widget = document.createElement('web-widget');
widget.src = 'app.widget.js';

// 触发 load -> bootstrap -> mount
document.body.appendChild(widget);

// 触发 update
widget.update({ name: 'demo' });

// 触发 unmount -> unload
document.body.removeChild(widget);
```

## 生命周期参数

生命周期函数使用 "properties" 传参：

```js
export async function bootstrap(properties) {
  const {
    container       // 应用的 DOM 容器
  } = properties;
}
```

每个生命周期函数的入参都会保证有如下参数：

### container

应用用于渲染 DOM 的节点。它至少拥有 `appendChild()` 、`innerHTML` 接口。

### context

应用容器的上下文 API。包含如下三个 API：

* [`mount()`](#mount)
* [`update()`](#update)
* [`unmount()`](#unmount)

### createPortal()

将应用传送到容器外面挂载。

```js
const context = createPortal(webWidgetElement, destination)
```

#### 参数

* `webWidgetElement` WebWidget [容器](application.md)
* `destination` 目的地名称

#### 返回值

一个 [`context`](#context) 对象（实验性特性）。

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

> 目的地必须先定义才能被使用，例如通过 [HTMLWebWidgetElement.portalDestinations](application.md#HTMLWebWidgetElement.portalDestinations) 来定义目的地。

### name

注册到主文档的应用名称。

### data

应用的初始化数据。

### sandboxed

应用是否处于 WebSandbox DOM 沙箱中（实验性特性）。

## 挂载子应用

你可以在 WebWidget 应用嵌套或者在另外的地方新打开其他 WebWidget 应用。

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

## 应用外打开子应用

通过 `createPortal()` 可以创建一个传送门来传输应用到指定位置（实验性特性）。

在主文档注册一个名为 `"dialog"` 的传送门：

```js
WebWidget.portalDestinations.define('dialog', () => {
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

> 💡 文档编写者注释
>
> 应用如果在外面打开键盘焦点管理非常重要，这里需要补充解决方案。

## 生命周期函数

### 下载

注册的应用会被懒加载，这指的是该应用的代码会从服务器端下载并执行。在下载过程中，建议尽可能执行少的操作，可以在 `bootstrap` 生命周期之后再执行各项操作。若确实有在下载时需要执行的操作，可将代码放入子应用入口文件中，但要放在各导出函数的外部。例如：

```js
console.log("The registered application has been loaded!");
export async function bootstrap(props) {...}
export async function mount(props) {...}
export async function unmount(props) {...}
```

### 初始化

这个生命周期函数会在应用第一次挂载前执行一次。

```js
export function bootstrap(props) {
  return Promise
    .resolve()
    .then(() => {
      // One-time initialization code goes here
      console.log('bootstrapped!')
    });
}
```

### 挂载

```js
export function mount(props) {
  return Promise
    .resolve()
    .then(() => {
      // Do framework UI rendering here
      console.log('mounted!')
    });
}
```

### 更新

如果两个应用相互调用、传递数据，这时候可能会触发“更新”生命周期。

```js
export function update(props) {
  return Promise
    .resolve()
    .then(() => {
      // Do framework UI rendering here
      console.log('mounted!')
    });
}
```

### 卸载

卸载函数被调用时，会清理在挂载应用时被创建的 DOM 元素、事件监听、内存、全局变量和消息订阅等。

```js
export function unmount(props) {
  return Promise
    .resolve()
    .then(() => {
      // Do framework UI unrendering here
      console.log('unmounted!');
    });
}
```

### 移除

“移除”生命周期函数的实现是可选的。如果一个已注册的应用没有实现这个生命周期函数，则假设这个应用无需被移除。

移除的目的是各应用在移除之前执行部分逻辑，一旦应用被移除，它的状态将会变成 `initial`，下次激活时会被重新初始化。

移除函数的设计动机是对所有注册的应用实现“热下载”，不过在其他场景中也非常有用，比如想要重新初始化一个应用，且在重新初始化之前执行一些逻辑操作时。

```js
export function unload(props) {
  return Promise
    .resolve()
    .then(() => {
      // Hot-reloading implementation goes here
      console.log('unloaded!');
    });
}
```

### 超时

默认情况下，所有注册的应用遵循全局超时配置，但对于每个应用，也可以通过在主入口文件导出一个 `timeouts` 对象来重新定义超时时间。如：

```js
export function bootstrap(props) {...}
export function mount(props) {...}
export function unmount(props) {...}
export const timeouts = {
  bootstrap: {
    millis: 5000,
    dieOnTimeout: true,
    warningMillis: 2500,
  },
  mount: {
    millis: 5000,
    dieOnTimeout: false,
    warningMillis: 2500,
  },
  unmount: {
    millis: 5000,
    dieOnTimeout: true,
    warningMillis: 2500,
  },
  unload: {
    millis: 5000,
    dieOnTimeout: true,
    warningMillis: 2500,
  },
};
```
