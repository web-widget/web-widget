# WebWidget 应用

## 应用入口文件

应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的入口文件，入口文件必须实现下面提到的应用生命周期函数。

适配有有生命周期的入口文件。

```js
export default {
  async bootstrap: (properties) => {},
  async mount: (properties) => {},
  async update: (properties) => {},
  async unmount: (properties) => {},
  async unload: (properties) => {}
}
```

由于浏览器等限制，应用必须打包为 UMD 格式。

> 💡 `.widget.js` 后缀名是一个约定，它的目的是让开发工具能够更好识别 WebWidget 应用。

## 应用生命周期

生命周期函数是加载器在注册的应用上调用的一系列函数，加载器会在各应用的主文件中，查找对应的函数名并进行调用。

注:

* `bootstrap`、 `mount` 与 `unmount` 的实现是必须的， `update` 与 `unload` 则是可选的
* 生命周期函数必须有返回值，可以是 `promise` 或者 `async` 函数
* 如果导出的是函数数组而不是单个函数，这些函数会被依次调用，对于 `promise` 函数，会等到 resolve 之后再调用下一个函数
* 如果应用只被预加载，各个应用会被下载，但不会被初始化、挂载或卸载

> 💡 应用生命周期来自于微前端框架 [single-spa](https://single-spa.js.org/) 的定义，这样可以确保 WebWidget 的应用能够被 [single-spa](https://single-spa.js.org/) 或其兼容的加载器加载。

WebWidget 元素会在不同的阶段主动触发这些应用生命周期：

```js
const widget = document.createElement('web-widget');

// 触发 bootstrap
widget.src = 'app.widget.js';

// 触发 mount
document.body.appendChild(widget);

// 触发 unmount
widget.hidden = false;

// 触发 unload
document.body.removeChild(widget);

// 触发 bootstrap
document.body.appendChild(widget);

// 触发 mount
widget.hidden = true;
```

## 生命周期参数

生命周期函数使用"properties" 传参：

```js
function bootstrap(properties) {
  const {
    name,         // 应用名称
    data,         // 应用静态数据
    container     // 应用的 DOM 容器
  } = properties;
  return Promise.resolve();
}
```

每个生命周期函数的入参都会保证有如下参数：

### `name`

注册到主文档的应用名称。

### `data`

应用初始化的数据。这是一个只读、可被序列化的数据结构。[参考](https://developer.mozilla.org/zh-CN/docs/Web/Guide/API/DOM/The_structured_clone_algorithm)。

### `container`

应用 DOM 元素的容器。这是一个 HTMLElement 对象实例，至少拥有 `appendChild()` 、`removeChild()`、`innerHTML` 填充容器内容接口。

### `sandboxed`

应用是否处于 WebSandbox DOM 沙箱中。

### `mountParcel(parcelConfig, parcelProps)`

手动挂载的函数。你可以在 WebWidget 应用中打开或者嵌套其他 WebWidget 应用，并且支持通讯。

#### 参数

##### parcelConfig

parcelConfig 是你想调用的 WebWidget 的生命周期对象：

```js
import('app.widget.js').then(lifecycle => {
  mountParcel(lifecycle, parcelProps);
});
```

或者：

```js
mountParcel(import('app.widget.js'), parcelProps);
```

##### parcelProps

结构等同于 WebWidget 应用 properties。

如果你想在应用里嵌套其他应用，需要指定一个新的 `container`；如果你想在应用外打开其他应用，需要指定 `slot` 字段，这个字段是宿主所提供的插槽名称。举个例子，你想为自己的应用提供可以设置面板并且使用外部的对话框打开：

```js
mountParcel(import('app-settings-panel.widget.js'), {
  slot: 'dialog',
  //...
});
```

> 💡 需要补充描述 WebWidget 的接口是如何支持应用 `slot` 的请求。
>
> 💡 single-spa 的 Parcel 明确要求使用 `domElement` 字段作为挂载容器，否则它会报错。我们没有使用 single-spa 使用的 `domElement` 而是 `container` 的原因是：`domElement` 它更像描述一个对象的类型而非用途，这样语义不够明确。这里会引发一个新的问题：我们是否要 100% 兼容 single-spa？

#### 返回值

返回一个 Parcel 对象，包含如下方法：

* `mount`
* `unmount`
* `update`
* `getStatus`
* `loadPromise`
* `bootstrapPromise`
* `mountPromise`
* `unmountPromise`

##### `unmount`

`parcel.unmount()` 返回一个 promise，当 parcel 卸载成功后 resolve。promise 可能会抛出异常，需进行处理。

##### `mount`

`parcel.unmount()` 返回一个 promise，当 parcel 卸载成功后 resolve。promise 可能会抛出异常，需进行处理。

##### `update`

`parcel.update(props)` 允许你改变传给 parcel 的参数。注意不是所有的 parcel 都支持 update 方法。`update` 方法返回一个 promise，更新成功后 resolve。

```js
const parcel = singleSpa.mountRootParcel(parcelConfig, parcelProps);
parcel.update(newParcelProps);
```

##### `getStatus`

`parcel.getStatus()` 返回一个字符串代表 parcel 的状态。所有状态如下：

- `NOT_BOOTSTRAPPED`: 未初始化
- `BOOTSTRAPPING`: 初始化中
- `NOT_MOUNTED`: 完成初始化，未挂载
- `MOUNTED`: 激活状态，且已挂载至DOM
- `UNMOUNTING`: 卸载中
- `UPDATING`: 更新中
- `SKIP_BECAUSE_BROKEN`: 在初始化、挂载、卸载或更新时发生异常。其他 parcel 可能会被正常使用，但当前 parcel 会被跳过。

##### `loadPromise`

`parcel.loadPromise()` 返回一个 promise，当 parcel 被装载 (loaded) 后 resolve。

##### `bootstrapPromise`

`parcel.bootstrapPromise()` 返回一个 promise，当 parcel 初始化后 resolve。

##### `mountPromise`

`parcel.mountPromise()` 返回一个 promise，当 parcel 加载后 resolve。通常用于检测 parcel 生成的 DOM 是否已经挂载。

##### `unmountPromise`

`parcel.unmountPromise()` 返回一个 promise，当 parcel 卸载后 resolve。

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
  return Promise
    .resolve()
    .then(() => {
      // Do framework UI rendering here
      console.log('mounted!')
    });
}
```

如果 `mount` 的 `Promise` 状态为 `reject`，那么 WebWidget 元素的子元素 `<fallback>` 将会显示。

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

移除的目的是各应用在移除之前执行部分逻辑，一旦应用被移除，它的状态将会变成 `NOT_LOADED`，下次激活时会被重新初始化。

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
