# 应用容器 >> 接口 || 1

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

HTMLWebWidgetElement 是 `<web-widget>` 标签的接口。

## application

`function`

设置应用的工厂函数。这是一种本地应用的注册方式。

```js
const widget = document.createElement('web-widget');
widget.application = () => ({
  async bootstrap(props) {},
  async mount(props) {},
  async update(props) {},
  async unmount(props) {},
  async unload(props) {}
});
document.body.appendChild(widget);
```

## src

`string`

设置应用的 URL。

```js
const widget = document.createElement('web-widget');
widget.src = './app.widget.js';
document.body.appendChild(widget);
```

## import

设置应用的模块名。和 [src](#src) 的差异：它不会自动的根据 `this.baseURI` 补全路径，加载器会优先读取它的原始值去加载模块，这意味着它可以支持[裸模块](https://github.com/WICG/import-maps)的导入。

```html
<script type="importmap">
{
  "imports": {
    "@org/app": "https://cdn.jsdelivr.net/npm/@org/app/dist/esm/main.js"
  }
}
</script>
```

```js
const widget = document.createElement('web-widget');
widget.import = '@org/app';
document.body.appendChild(widget);
```

## data

`object`

应用的数据。应用脚本可以通过生命周期的 `props.data` 访问到。

```js
widget.data = { a: 'hello' };
```

等价于：

```html
<web-widget data="{&quot;a&quot;:&quot;hello&quot;}" src="app.widget.js"></web-widget>
```

## inactive

`boolean`

取消 DOM 的生命周期与应用生命周期的绑定。如果为元素包含 `inactive` 属性，元素插入 DOM 树或移除的时候都不会自动触发应用生命周期函数，应用的生命周期只能手动调用，例如外部路由管理库来调用。

```js
const widget = document.createElement('web-widget');
widget.src = './app.widget.js';
widget.inactive = true;
document.body.appendChild(widget);

// 手动挂载
widget.mount();
```

## loading

`string`

指示浏览器应当如何加载。允许的值：

* `"auto"` 自动
* `"eager"` 立即加载，不管它是否在可视视口（visible viewport）之外
* `"lazy"` 延迟加载，直到它和视口接近的距离

## type

`string`

脚本的模块类型，默认值为 `"module"`。

## renderTarget

渲染目标，默认值为 `"shadow"`（实验性特性）。允许的值：

* `"shadow"` 使用 shadow DOM 渲染
* `"light"` 使用 light DOM 渲染

<inline-notification type="warning">

关闭 light DOM 后，Web Widget 容器的插槽特性将无法工作。

</inline-notification>

## customProperties

自定义应用的生命周期参数成员。

```js
const widget = document.createElement('web-widget');
widget.customProperties = {
  a: 1,
  b: 2
};
widget.application = () => {
  async mount({ a, b }) {
    console.log(a); // 1
    console.log(b); // 2
  }
};
document.body.appendChild(widget);
```

## state

`string`

应用的状态（只读）。

| 状态值               | 常量名             | 说明                            |
| ------------------- | ----------------- | -------------------------------|
| `"initial"`         | `INITIAL`         | 应用未加载                       |
| `"loading"`         | `LOADING`         | 应用加载中                       |
| `"loaded"`          | `LOADED`          | 应用已加载但未初始化               |
| `"bootstrapping"`   | `BOOTSTRAPPING`   | 应用初始化中                     |
| `"bootstrapped"`    | `BOOTSTRAPPED`    | 应用已初始化但未挂载               |
| `"mounting"`        | `MOUNTING`        | 应用挂载中                       |
| `"mounted"`         | `MOUNTED`         | 应用已挂载                       |
| `"updating"`        | `UPDATING`        | 应用更新数据中                    |
| `"unmounting"`      | `UNMOUNTING`      | 应用卸载中                       |
| `"unloading"`       | `UNLOADING`       | 应用移除中                       |
| `"load-error"`      | `LOAD_ERROR`      | 应用的加载功能返回了被拒绝的承诺     |
| `"bootstrap-error"` | `BOOTSTRAP_ERROR` | 应用的初始化功能返回了被拒绝的承诺   |
| `"mount-error"`     | `MOUNT_ERROR`     | 应用的挂载功能返回了被拒绝的承诺     |
| `"update-error"`    | `UPDATE_ERROR`    | 应用的更新功能返回了被拒绝的承诺     |
| `"unmount-error"`   | `UNMOUNT_ERROR`   | 应用的卸载功能返回了被拒绝的承诺     |
| `"unload-error"`    | `UNLOAD_ERROR`    | 应用的移除功能返回了被拒绝的承诺     |

> 可以通过构造器的静态相属性访问状态常量，例如 `"load-error"` 等价于 `HTMLWebWidgetElement.LOAD_ERROR`。

## load()

手动加载应用。

返回值：`Promise`

## bootstrap()

手动触发应用 `bootstrap` 生命周期函数。

返回值：`Promise`

## mount()

手动触发应用 `mount` 生命周期函数。

返回值：`Promise`

## update()

手动触发应用 `update` 生命周期函数。

```js
widget.update(props);
```

返回值：`Promise`

## unmount()

手动触发应用 `unmount` 生命周期函数。

返回值：`Promise`

## unload()

手动触发应用 `unload` 生命周期函数。

返回值：`Promise`

## createApplication()

创建应用的加载器的勾子函数。它默认行为是调用 `import()` 加载 ES module，覆盖它可以加载其他格式的模块。

例如支持 system 模块格式：

```js
function defineHook(target, name, callback) {
  return Reflect.defineProperty(
    target,
    name,
    callback(Reflect.getOwnPropertyDescriptor(target, name))
  );
}

defineHook(HTMLWebWidgetElement.prototype, 'createApplication', ({ value }) => ({ 
  value() {
    if (this.type !== 'system') {
      return value.apply(this, arguments);
    }

    return async () => System.import(this.import || this.src)
      .then(module => module.default || module);
  }
}));
```

```html
<web-widget src="app.widget.js" type="system"></web-widget>
```

## createProperties()

创建应用生命周期参数的钩子函数。

## createContainer()

创建应用生命周期参数 `container` 成员的钩子函数。它默认行为是根据 [`renderTarget`](#renderTarget) 创建应用的渲染节点，覆盖它可以重新定义此行为。

## createData()

创建应用生命周期参数 `data` 成员的钩子函数。

## createParameters()

创建应用生命周期参数 `parameters` 成员的钩子函数。

## timeouts

`object`

全局超时配置（实验性特性）。这是一个**静态属性**。

```js
HTMLWebWidgetElement.timeouts = {
  load: 12000,
  bootstrap: 4000,
  mount: 3000,
  update: 3000,
  unmount: 3000,
  unload: 3000
}
```