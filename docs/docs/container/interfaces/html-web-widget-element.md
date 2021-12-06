# 容器 >> 接口 >> HTMLWebWidgetElement || 1

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
  async bootstrap(properties) {},
  async mount(properties) {},
  async update(properties) {},
  async unmount(properties) {},
  async unload(properties) {}
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

## text

`string`

设置应用的代码。这是一种本地应用的注册方式。

```js
const widget = document.createElement('web-widget');
widget.text = `export default () => ({
  async bootstrap(properties) {},
  async mount(properties) {},
  async update(properties) {},
  async unmount(properties) {},
  async unload(properties) {}
})`;
document.body.appendChild(widget);
```

## data

`object`

应用的数据。应用脚本可以通过生命周期的 `properties.data` 访问到。

```js
widget.data = { a: 'hello' };
```

等价于：

```html
<web-widget data="{&quot;a&quot;:&quot;hello&quot;}" src="app.widget.js"></web-widget>
```

## name

`string`

应用名称。应用脚本可以通过生命周期的 `properties.name` 访问到。

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

## sandboxed

`boolean`

沙盒化应用。启用后 Web Widget 应用将使用虚拟化环境来运行 JS（实验性特性）。虚拟化环境来自 [WebSandbox](https://web-sandbox.js.org)。

此特性需要引入 [sandbox](../plugins/sandbox.md) 插件才能生效。

## csp

`string`

内容安全策略。只有开启 `sandboxed` 属性后才有效（实验性特性）。

## loading

`string`

指示浏览器应当如何加载。允许的值：

* `"auto"` 自动
* `"eager"` 立即加载，不管它是否在可视视口（visible viewport）之外
* `"lazy"` 延迟加载，直到它和视口接近的距离

## type

`string`

脚本的模块类型，默认值为 `"module"`。

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

## createDependencies()

应用的依赖注入勾子函数（实验性特性）。它默认行为是执行 `return new WebWidgetDependencies(this)` 覆盖它可以自定义注入到应用的 API。

详情见：[WebWidgetDependencies](./web-widget-dependencies.md)

## createLoader()

应用的加载器勾子函数（实验性特性）。它默认行为是调用 `import()` 加载 ES module，覆盖它可以加载其他格式的模块。

例如支持 system 模块格式：

```js
function defineHook(target, name, callback) {
  return Reflect.defineProperty(
    target,
    name,
    callback(Reflect.getOwnPropertyDescriptor(target, name))
  );
}

defineHook(HTMLWebWidgetElement.prototype, 'createLoader', ({ value }) => ({ 
  value() {
    const { src, text, type } = this;

    if (type !== 'system') {
      return value.apply(this, arguments);
    }

    if (src) {
      return System.import(src).then(module => module.default || module);
    }

    src = URL.createObjectURL(
      new Blob([text], { type: 'application/javascript' })
    );

    return () => System.import(src).then(
      module => {
        URL.revokeObjectURL(src);
        return module.default || module;
      },
      error => {
        URL.revokeObjectURL(src);
        throw error;
      }
    );
  }
}));
```

```html
<web-widget src="app.widget.js" type="system"></web-widget>
```

## createRenderRoot()

应用的挂载节点勾子函数（实验性特性）。它默认行为是创建 shadow DOM 节点，覆盖它可以重新定义此行为。

```js
function defineHook(target, name, callback) {
  return Reflect.defineProperty(
    target,
    name,
    callback(Reflect.getOwnPropertyDescriptor(target, name))
  );
}

defineHook(HTMLWebWidgetElement.prototype, 'createRenderRoot', ({ value }) => ({ 
  value() {
    const { src, text, type } = this;

    if (this.hasAttribute('noshadow')) {
      return this;
    }

    return value.apply(this, arguments);
  }
}));
```

```html
<web-widget src="app.widget.js" noshadow></web-widget>
```

<inline-notification type="warning">

关闭 shadow DOM 后，Web Widget 容器的沙箱、插槽特性都将无法工作。

</inline-notification>

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
widget.update(properties);
```

返回值：`Promise`

## unmount()

手动触发应用 `unmount` 生命周期函数。

返回值：`Promise`

## unload()

手动触发应用 `unload` 生命周期函数。

返回值：`Promise`

## \#portalDestinations

`object`

全局传送门注册表（实验性特性）。这是一个**静态属性**。

它有两个方法：

* `get(name)`
* `define(name, factory)`

定义传送门目的地：

```js
import { HTMLWebWidgetElement } from '@web-widget/container';

let dialog, dialogWidget;
HTMLWebWidgetElement.portalDestinations.define('dialog', () => {
  // Single instance
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialogWidget = document.createElement('web-widget');

    document.body.appendChild(dialog);
    dialog.appendChild(dialogWidget);

    dialogWidget.name = 'dialog';
    dialogWidget.application = () => ({
      async bootstrap({ container, context }) {
        const dialogMain = document.createElement('slot');
        const dialogCloseButton = document.createElement('button');

        dialogCloseButton.innerText = 'close';
        dialogCloseButton.onclick = () => context.unmount();

        container.appendChild(dialogCloseButton);
        container.appendChild(dialogMain);
        dialog.addEventListener('close', () => {
          context.unmount();
        });
      },
      async mount() {
        dialog.showModal();
      },
      async unmount() {
        dialog.close();
      }
    });
  }

  return dialogWidget;
});
```

传送门定义好后，应用可以通过 [`createPortal()`](../../application/interface.md#createportal) 将子 WevWidget 容器传送到指定的位置渲染：

```js
// app.widget.js
export async function mount({ container, createPortal }) {
  const userWidget = document.createElement('web-widget');
  userWidget.slot = 'main';
  userWidget.src = './user.widget.js';
  // 传送应用
  const cardWidget = createPortal(userWidget, 'dialog');
})
```

## \#timeouts

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

## Events

### statechange

当应用的状态变更后，每次都将触发 `statechange` 事件。

```js
const widget = document.createElement('web-widget');
widget.src = "./app.widget.js";
widget.addEventListener('statechange', () => {
  console.log('State', widget.state);
});
document.body.appendChild(widget);
```

