---
eleventyNavigation:
  key: 应用 >> 概述
  title: 概述
  parent: 应用
  order: 1
---

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

# Web Widget 应用

应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的入口文件，它支持如下生命周期函数：

## 入口

```js
export default () => ({
  async bootstrap(props) {},
  async mount(props) {},
  async update(props) {},
  async unmount(props) {},
  async unload(props) {}
});
```

或者使用单例模式：

```js
export async function bootstrap(props) {}
export async function mount(props) {}
export async function update(props) {}
export async function unmount(props) {}
export async function unload(props) {}
```

应用容器会依次调用应用入口文件的定义的生命周期函数，并且注入应用[接口](./api.md)依赖。

* 所有生命周期函数都是可选的
* 生命周期函数必须有返回值，可以是 `promise` 或者 `async` 函数
* 如果导出的是函数数组而不是单个函数，这些函数会被依次调用，对于 `promise` 函数，会等到 resolve 之后再调用下一个函数

<inline-notification type="tip">

大多数情况下推荐使用多例格式，而单例模式似乎只适合路由驱动的模式。

</inline-notification>

## 下载

注册的应用会被懒加载，这指的是该应用的代码会从服务器端下载并执行。在下载过程中，建议尽可能执行少的操作，可以在 `bootstrap` 生命周期之后再执行各项操作。若确实有在下载时需要执行的操作，可将代码放入子应用入口文件中，但要放在各导出函数的外部。例如：

```js
console.log("The registered application has been loaded!");
export async function bootstrap(props) {...}
export async function mount(props) {...}
export async function unmount(props) {...}
```

## 初始化

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

## 挂载

```js
export function mount(props) {
  props.container.innerHTML = 'hello wrold';
  return Promise
    .resolve()
    .then(() => {
      // Do framework UI rendering here
      console.log('mounted!')
    });
}
```

## 更新

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

## 卸载

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

## 移除

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

## 超时

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