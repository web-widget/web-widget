---
eleventyNavigation:
  key: 应用 >> 概述
  title: 概述
  parent: 应用
  order: 1
---

# Web Widget 应用

应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的入口文件。

Web Widget 应用被设计为一种独立的格式，它是一种和具体 UI 框架无关的设计模式层面的抽象，这样的设计模式被流行的微前端 [single-spa](https://single-spa.js.org/) 框架在多种项目中深入的实践，它足够的稳定，经得起时间的考验。

应用格式不仅仅抽象了不同的前端框架，也不和具体的应用容器绑定，包括 Web Widget、[single-spa](https://single-spa.js.org/)，因此你完全可以根据此抽象实现自己的应用容器而不必依赖 Web Widget 的容器。

## 格式范式

### 入口文件

JavaScript 文件作为应用的入口文件，它导出了符合约定的生命周期函数：

```js
export default (props) => ({
  async bootstrap() {},
  async mount() {},
  async update() {},
  async unmount() {},
  async unload() {}
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
* 生命周期函数第一个 `props` 是应用生命周期参数

### 执行顺序

应用容器负责执行应用，它严格遵循生命周期的顺序进行调用：

```
      Start
        ▼
    ┌───┴──┐
    │ load │
    └───┬──┘
        ▼
  ┌─────┴─────┐
  │ bootstrap │
  └─────┬─────┘
┌──────►┤
│       ▼ 
│   ┌───┴───┐
│   │ mount │
│   └───┬───┘ 
│       │   ┌───────┐
│       │   │       ▼
│       ▼   ▲   ┌───┴────┐
│       ├───┤   │ update │
│       │   ▲   └───┬────┘
│       │   │       ▼                 
│       │   └───────┘
│       ▼
│  ┌────┴────┐
└─◄┤ unmount │
   └────┬────┘
        ▼ 
   ┌────┴───┐
   │ unload │
   └────┬───┘ 
        ▼
       End
```

## props

应用除了可以使用 BOM 环境提供的 Web 标准接口之外，也有自己的专属接口，应用专属的接口将通过生命周期函数参数进行注入。

```js
export default ({ container, data, env, ...customProps }) => ({
  async bootstrap() {},
  async mount() {},
  async update() {},
  async unmount() {},
  async unload() {}
});
```

`container`、`data` 与 `env` 是应用容器必须实现的接口；`customProps` 是来自外部任意注入的接口。

#### container

`HTMLElement`

应用的容器。`container` 继承自 [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) 对象，可以使用如下 DOM 接口：

* [`container.appendChild()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild) 将节点插入到末尾处
* [`container.insertBefore()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore) 在参考节点之前插入一个拥有指定父节点的子节点
* [`container.hasChildNodes()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/hasChildNodes) 返回一个布尔值，表明容器是否包含有子节点
* [`container.removeChild()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/removeChild) 删除容器中某个节点
* [`container.innerHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML) 在容器中插入 HTML 字符串

除了上述 DOM 接口之外，还有如下容器相关的接口：

* [`container.mount()`](./#mount) 从容器上触发应用的挂载生命周期
* [`container.update(props)`](./#update) 从容器上触发应用的更新生命周期
* [`container.unmount()`](./#unmount) 从容器上触发应用的卸载生命周期

#### data

`object|array|null`

应用的数据。它是一个可以被序列化的数据结构，允许应用自己通过 `container.update({ data })` 方法来更新数据。

#### env

`object`

应用程序的启动参数。它是一个可以被序列化的数据结构，它视作一种环境变量。和 [`data`](#data) 区别：

* [`data`](#data) 被设计为应用的数据，应用开发者对其结构完全知晓；而 `env` 可能包含非常多宿主特有的额外环境信息，例如 `theme`、`lang` 等，应用程序可以遵循它们完成特定的一些操作，也可以完全忽视它们而不会引起故障
* 应用程序可以通过 `container.update({ data })` 来更新 [`data`](#data)

> `<web-widget>` 元素会将所有的属性都放在 env 中。

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

## 引导

### `bootstrap`

初始化生命周期函数会在应用第一次挂载前执行一次，可以用下载一些应用挂载之前必要的资源，例如外部 CSS 文件、重要的背景图片。

```js
export default () => ({
  async bootstrap(props) {
    // One-time initialization code goes here
    console.log('bootstrapped!')
  }
});
```

应用容器可能会对应用进行预加载，预加载的时候会依次执行 load 与 bootstrap，因此恰当的使用 bootstrap 可以有助于提高用户体验。

## 挂载

### `mount`

将自己渲染出来，通常会通过 [`container`](#container) 接口来插入自身 DOM。

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

当应用挂载完成后，外部的容器或者其他程序可能触发“更新”生命周期来更新数据，通常通过 [`data`](#data) 接口获取到更新后的数据。

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

---------------

[single-spa](https://single-spa.js.org/) 是一个非常优秀的微前端解决方案，它对 Web Widget 的应用格式设计产生了关键影响，经过充分的思考后我们对 [single-spa](https://single-spa.js.org/) 进行了一些改进。变更差异：

* 支持 `export default () => ({/* life cycle */})` 形式，并且作为推荐的方式——因为应用应当默认支持多实例运行
* 所有的生命周期函数都是可选的——我们认为这应该交给应用容器来进行容错处理
* 明确定义了获取渲染目标的接口 [`container`](#container)
* 明确定义获取数据的接口 [`data`](#data)——以便外部能够编辑、序列化、存储应用数据
* 没有 `singleSpa` 接口——因为它导致和具体的容器实现耦合
* 没有 `mountParcel` 接口——Web Widget 的应用格式抽象了 [single-spa](https://single-spa.js.org/) 中 `application` 与 `parcel` 的概念，因此无须再保留 `parcel` 概念
* 不支持 `timeouts` 配置——这是应用容器的职责
* 生命周期函数不支持数组形式——因为可以使用 `Promise.all()` 代替它
