---
eleventyNavigation:
  key: 应用 >> 概述
  title: 概述
  parent: 应用
  order: 1
---

# Web Widget 应用

应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的入口文件。

Web Widget 应用被设计为一种独立的格式，是一种和 UI 框架无关的的插件抽象，它和具体的应用容器、加载器也无关，包括 Web Widget 容器，因为我们认为通过抽象可以让软件具备更长的生命力。

## 格式

入口文件支持定义如下生命周期函数：

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

* 所有生命周期函数都是可选的
* 生命周期函数必须返回 `promise`（建议使用 `async` 函数保证这一点）
* 生命周期函数第一个 `props` 参数接收应用内置的[接口](./interface.md)

## 执行

应用容器负责执行应用，它会依次调用应用入口文件的定义的生命周期函数。

```
load ┐            ┌ <───────────────────────────┐
     └> bootstrap ┤                             │
     │            └> mount ┐                    │
     │                     └> update ┐          │
     │                               └> unmount ┤
     │                                          └> unload ┐
     │                                                    │
      <───────────── [ Hot-reloading ] ───────────────────┘
```

## 接口

应用除了可以使用 BOM 环境提供的 Web 标准接口之外，也有自己的专属接口，应用专属的接口将通过生命周期函数参数进行注入。

```js
export default () => ({
  async mount({ name, container }) {
    const element = document.createElement('div');
    element.innerHTML = `The application named '${name}' has been mounted`;
    container.appendChild(element);
    console.log('mounted!')
  }
});
```

详情见[应用接口](./interface.md)。

## 下载

### `load`

在下载过程中，建议尽可能执行少的操作，可以在 `bootstrap` 生命周期之后再执行各项操作。若确实有在下载时需要执行的操作，可将代码放入应用入口文件中，但要放在各导出函数的外部。例如：

```js
console.log("The registered application has been loaded!");
export default () => ({
  async mount(props) {},
  async unmount(props) {}
});
```

## 初始化

### `bootstrap`

这个生命周期函数会在应用第一次挂载前执行一次，可以用来准备一些资源。

```js
export default () => ({
  async bootstrap(props) {
    // One-time initialization code goes here
    console.log('bootstrapped!')
  }
});
```

## 挂载

### `mount`

```js
export default () => ({
  async mount({ container }) {
    // Do framework UI rendering here
    container.appendChild(element);
    console.log('mounted!')
  }
});
```

## 更新

### `update`

当应用挂载完成后，外部的容器或者其他程序可能触发“更新”生命周期来更新数据。

```js
export default () => ({
  async update({ data }) {
    // Use a framework to update dom nodes
    console.log('updated!', data)
  }
});
```

## 卸载

### `unmount`

卸载函数被调用时，应当清理挂载应用时被创建的 DOM 元素、事件监听、内存、全局变量和消息订阅等。

```js
export default () => ({
  async unmount({ container }) {
    // Do framework UI unrendering here
    container.removeChild(element);
    console.log('unmounted!', data)
  }
});
```

## 移除

### `unload`

应用被删除前将会调用。

```js
export default () => ({
  async unload(props) {
    // Hot-reloading implementation goes here
    console.log('unloaded!');
  }
});
```

## 超时

### `timeouts`

默认情况下，所有的应用遵循容器定义的超时配置，但对于每个应用也可以通过导出一个 `timeouts` 对象来重新定义超时时间。如：

```js
export default () => ({
  async bootstrap(props) {},
  async mount(props) {},
  async update(props) {},
  async unmount(props) {},
  async unload(props) {},
  timeouts: {
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
    }
  }
});
```

----------

*感谢：*

[single-spa](https://single-spa.js.org/) 是一个非常优秀的微前端解决方案，它对 Web Widget 的应用格式设计产生了关键影响：生命周期函数沿用了 [single-spa](https://single-spa.js.org/) 的设计。

对 [single-spa](https://single-spa.js.org/) 应用格式主要的改进：

* 支持多例的形式 `export default () => {}`，并且作为推荐的方式。因为 Web Widget 应用将允许多个实例存在
* 定义了获取渲染目标的接口 [`container`](./interface.md#container)
* 定义获取数据的接口 [`data`](./interface.md#data)
* 删除了接口 `singleSpa`。应用应当作为独立的格式，和具体的容器实现无关
* 删除了接口 `mountParcel`。Web Widget 的应用格式抽象了 [single-spa](https://single-spa.js.org/) 中 `application` 与 `parcel` 的概念，因此无须再保留 `parcel` 概念
