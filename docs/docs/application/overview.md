---
eleventyNavigation:
  key: 应用 >> 概述
  title: 概述
  parent: 应用
  order: 1
---

# Web Widget 应用

应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的入口文件。

Web Widget 应用被设计为一种独立的格式，它是一种和 UI 框架无关的的插件抽象、和具体的应用容器没有直接关系，你甚至可以根据此文档定义的格式来实现自己的应用容器，而不必引入 Web Widget。

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

应用容器负责执行应用，它遵循生命周期函数调用的顺序：

```
                    ┌───────────────────┐
                    │                   │
┌> load > bootstrap ┴> mount ┬> unmount ┴> unload ┐
│                            │                    │
│                           ┌┴> update ┐          │
│                           │          │          │
│                           └──────────┘          │
│                                                 │
└─────────────────────────────────────────────────┘
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

在下载过程中建议尽可能执行少的操作，可以在 `bootstrap` 生命周期之后再执行各项操作。若确实有在下载时需要执行的操作，可将代码放入应用入口文件中，但要放在各导出函数的外部。例如：

```js
console.log("The registered application has been loaded!");
export default () => ({
  async mount(props) {},
  async unmount(props) {}
});
```

## 初始化

### `bootstrap`

初始化生命周期函数会在应用第一次挂载前执行一次，可以用下载一些必要的资源。

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

将自己渲染出来，通常会通过 [`container`](./interface.md#container) 接口来插入自身 DOM。

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

当应用挂载完成后，外部的容器或者其他程序可能触发“更新”生命周期来更新数据，通常通过 [`data`](./interface.md#data) 接口获取到更新后的数据。

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

----------

*感谢：*

[single-spa](https://single-spa.js.org/) 是一个非常优秀的微前端解决方案，它对 Web Widget 的应用格式设计产生了关键影响。相对于 [single-spa](https://single-spa.js.org/) 应用格式的差异：

* 支持 `export default () => ({/* life cycle */})` 形式，并且作为推荐的方式。因为容器通常支持多实例运行
* 所有的生命周期函数都是可选的
* 明确定义了获取渲染目标的接口 [`container`](./interface.md#container)
* 明确定义获取数据的接口 [`data`](./interface.md#data)。以便外部能够编辑、序列化、存储应用数据
* 没有 `singleSpa` 接口。因为它导致和具体的容器实现耦合
* 没有 `mountParcel` 接口。Web Widget 的应用格式抽象了 [single-spa](https://single-spa.js.org/) 中 `application` 与 `parcel` 的概念，因此无须再保留 `parcel` 概念
* 不支持 `timeouts` 配置
* 生命周期函数不支持数组形式
