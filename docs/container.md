# WebWidget 容器

WebWidget 容器是一个标准的 Web Component 组件，标签名为 `<web-widget>`，其 `src` 属性为[应用](application.md)的 URL。

```html
<web-widget src="app.widget.js"></web-widget>
```

为了不影响主页面的加载性能，WebWidget 应用是异步载入的。为了符合渐进式增强的体验，最佳做法是使用占位符与后备。

## 占位符

`placeholder` 元素将充当 WebWidget 容器的占位符号。用途：

* 预览图片或文本
* 骨架占位或 loading 动画

```html
<web-widget src="app.widget.js">
  <placeholder>
    <img src="preview.jpg" />
  </placeholder>
</web-widget>
```

## 后备

`fallback` 元素将充当 WebWidget 容器的后备占位符号。用途：

* 浏览器不支持某个元素
* 内容未能加载（例如，推文被删除）
* 图片类型不受支持（例如，并非所有浏览器都支持 WebP）

```html
<web-widget src="video.js">
  <fallback hidden>
    <p>This browser does not support the video element.</p>
  </fallback>
</web-widget>
```

当 WebWidget 应用变更为以下任意状态将会触发 `fallback` 元素显示：

* `load-error`
* `bootstrap-error`
* `mount-error`

## 插槽

如果 WebWidget 应用支持插槽，那么可以直接使用 `slot` 属性来指定插入的位置：

```html
<web-widget src="app.widget.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

插槽源自于 Web Component，更多插槽信息可以访问 <https://developer.mozilla.org/en-US/docs/Web/Web_Components>。

## 配置数据

通过 `data` 或 `data-*` 属性可以为 WebWidget 应用传递静态的数据：

```html
<web-widget
  src="app.widget.js"
  data="{&quot;a&quot;:&quot;hello&quot;}"
  data-username="web-widget"
  data-email="web-widget@web-sandbox.js.org"
>
</web-widget>
```

WebWidget 应用可以通过生命周期函数获的 `data` 参数获取到数据。

> 通过 `data-*` 只能传递 `string` 类型的值。

## 沙盒

给 WebWidget 容器增加 `sandboxed` 属性即可启用沙盒。一旦沙盒被开启，能够让 WebWidget 应用的所有的操作限制在 `<web-widget>` 视图内，它的网络、本地存储等都将被管控，让不可信代码能够安全的运行。

```html
<web-widget src="app.widget.js" sandboxed csp="script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net;">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

如果应用没有实现生命周期函数，开启沙盒后也能确保它能够正常被渲染的同时也不会对主文档产生副作用，因此可以使用沙盒特性来快速迁移一些旧的代码。

关于沙盒环境的限制可以参考 [WebSandbox.js](https://web-sandbox.org.js)。

## 接口

* [HTMLWebWidgetElement](#HTMLWebWidgetElement)
* [WebWidgetDependencies](#WebWidgetDependencies)

## HTMLWebWidgetElement

HTMLWebWidgetElement 是 `<web-widget>` 元素的接口。

### application

设置应用的工厂函数。这是一种本地应用的注册方式，通常用于测试。

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

### src

设置应用入口文件。

```js
const widget = document.createElement('web-widget');
widget.src = './app.widget.js';
document.body.appendChild(widget);
```

### text

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

### data

应用的数据。应用脚本可以通过生命周期的 `properties.data` 访问到。

```js
widget.data = { a: 'hello' };
```

等价于：

```html
<web-widget data="{&quot;a&quot;:&quot;hello&quot;}" src="app.widget.js"></web-widget>
```

### name

应用名称。应用脚本可以通过生命周期的 `properties.name` 访问到。

### inactive

取消 DOM 的生命周期与应用生命周期的绑定。如果为元素包含 `inactive` 属性，元素插入 DOM 树或移除的时候都不会自动触发应用生命周期函数，应用的生命周期只能手动调用，例如外部路由管理库来调用。

```js
const widget = document.createElement('web-widget');
widget.src = './app.widget.js';
widget.inactive = true;
document.body.appendChild(widget);

// 手动挂载
widget.mount();
```

### sandboxed

沙盒化应用。启用后 WebWidget 应用将使用虚拟化环境来运行 JS。虚拟化环境来自 [WebSandbox](https://web-sandbox.js.org)。

> 由于 TC39 Realms API 发生了重大变更，因此此特性暂时无法使用。

### csp

内容安全策略。只有开启 `sandboxed` 属性后才有效。

### loading

指示浏览器应当如何加载。允许的值：

* `"auto"` 自动
* `"eager"` 立即加载，不管它是否在可视视口（visible viewport）之外
* `"lazy"` 延迟加载，直到它和视口接近的距离

### importance

指示下载资源时相对重要性，或者说优先级。允许的值：

* `"auto"` 不指定优先级
* `"high"` 在下载时优先级较高
* `"low"` 在下载时优先级较低

### type

脚本的模块类型，默认值为 `"module"`。

### state

应用的状态（只读）。

| 状态值               | 常量名             | 说明                             |
| ------------------- | ----------------- | ------------------------------- |
| `"initial"`         | `INITIAL`         | 应用未加载                        |
| `"loading"`         | `LOADING`         | 应用加载中                        |
| `"loaded"`          | `LOADED`          | 应用已加载但未初始化                |
| `"bootstrapping"`   | `BOOTSTRAPPING`   | 应用初始化中                      |
| `"bootstrapped"`    | `BOOTSTRAPPED`    | 应用已初始化但未挂载                |
| `"mounting"`        | `MOUNTING`        | 应用挂载中                        |
| `"mounted"`         | `MOUNTED`         | 应用已挂载                        |
| `"updating"`        | `UPDATING`        | 应用更新数据中                     |
| `"unmounting"`      | `UNMOUNTING`      | 应用卸载中                        |
| `"unloading"`       | `UNLOADING`       | 应用移除中                        |
| `"load-error"`      | `LOAD_ERROR`      | 应用程序的加载功能返回了被拒绝的承诺   |
| `"bootstrap-error"` | `BOOTSTRAP_ERROR` | 应用程序的初始化功能返回了被拒绝的承诺 |
| `"mount-error"`     | `MOUNT_ERROR`     | 应用程序的挂载功能返回了被拒绝的承诺   |
| `"update-error"`    | `UPDATE_ERROR`    | 应用程序的更新功能返回了被拒绝的承诺   |
| `"unmount-error"`   | `UNMOUNT_ERROR`   | 应用程序的卸载功能返回了被拒绝的承诺   |
| `"unload-error"`    | `UNLOAD_ERROR`    | 应用程序的移除功能返回了被拒绝的承诺   |

> 可以通过构造器的静态相属性访问状态常量，例如 `"load-error"` 等价于 `HTMLWebWidgetElement.LOAD_ERROR`。

### createDependencies()

应用的依赖注入勾子函数。它默认行为是执行 `return new WebWidgetDependencies(this)` 覆盖它可以自定义注入到应用的 API。

详情见：[WebWidgetDependencies](#WebWidgetDependencies)

### createLoader()

应用的加载器勾子函数。它默认行为是调用 `import()` 加载 ES module，覆盖它可以加载其他格式的模块。

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

    return System.import(src).then(
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

### load()

手动加载应用。

返回值：`Promise`

### bootstrap()

手动触发应用 `bootstrap` 生命周期函数。

返回值：`Promise`

### mount()

手动触发应用 `mount` 生命周期函数。

返回值：`Promise`

### update()

手动触发应用 `update` 生命周期函数。

```js
widget.update(properties);
```

返回值：`Promise`

### unmount()

手动触发应用 `unmount` 生命周期函数。

返回值：`Promise`

### unload()

手动触发应用 `unload` 生命周期函数。

返回值：`Promise`

### HTMLWebWidgetElement.portalDestinations

全局传送门注册表。这是一个静态属性。

它有两个方法：

* `get(name)`
* `define(name, factory)`

定义传送门目的地：

```js
HTMLWebWidgetElement.portalDestinations.define('dialog', () => {
  const dialogWidget = document.createElement('web-widget');
  dialogWidget.src = './dialog.widget.js';
  document.body.appendChild(dialogWidget);
  return dialogWidget;
});
```

传送门定义好后，应用可以通过 [`createPortal()`](#createPortal) 将子 WevWidget 容器传送到指定的位置渲染：

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

### 事件

#### statechange

当应用的状态变更后，每次都将触发 `statechange` 事件。

```js
const widget = document.createElement('web-widget');
widget.src = "./app.widget.js";
widget.addEventListener('statechange', () => {
  console.log('State', widget.state);
});
document.body.appendChild(widget);
```

## WebWidgetDependencies

WebWidgetDependencies 接口是应用的生命周期函数接收的参数，因此可以扩展它给应用注入 API。

使用例子：

```html
<editor-plugin src="plugin.widget.js"></editor-plugin>
<script type="module">
  class PluginDependencies extends WebWidgetDependencies {
    setDocumentTitle(title) {
      document.title = title;
    }
  }
  class HTMLEditorPluginElement extends HTMLWebWidgetElement {
    createDependencies() {
      return new PluginDependencies(this);
    }
  }
  customElements.define('editor-plugin', HTMLEditorPluginElement);
</script>
```

```js
// plugin.widget.js
export default () => ({
  async mount(properties) {
    properties.setDocumentTitle('hello world');
  }
});
```

### container

应用用于渲染 DOM 的节点（只读）。它至少拥有 `appendChild()` 、`innerHTML` 接口。

### context

应用容器的上下文 API（只读）。包含如下三个 API：

* [`mount()`](#mount)
* [`update()`](#update)
* [`unmount()`](#unmount)

### createPortal()

将应用传送到容器外面挂载。

```js
const context = createPortal(webWidgetElement, destination)
```

#### 参数

* `webWidgetElement` WebWidget 容器
* `destination` 目的地名称

#### 返回值

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

> 目的地必须先定义才能被使用，例如通过 [HTMLWebWidgetElement.portalDestinations](#HTMLWebWidgetElement.portalDestinations) 来定义目的地。
>
> 这是试验性特性。

### name

应用名称（只读）。

### data

应用的初始化数据（只读）。

### sandboxed

应用是否处于 WebSandbox DOM 沙箱中（只读）。

## 例子

### CSS 区分元素是否定义

可以通过 CSS `:defined` 伪类处理元素定义之前的样式。

```css
web-widget:not(:defined) {
  display: none;
}

web-widget:defined {
  display: block;
}
```

### JS 区分元素是否定义

```html
<web-widget src="app.widget.js"></web-widget>

<script type="module">
  console.log('not defined');
  customElements.whenDefined('web-widget').then(() => {
    console.log('defined');
  });

  import('@web-sandbox.js/web-widget');
</script>
```

