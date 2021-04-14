# WebWidget 规范草案

本规范定义了一种通用的网页小挂件标准格式，它可以集成在不同的 Web 技术开发的应用中。

## 什么是 WebWidget

WebWidget 是一种和技术栈无关的小挂件标准，和传统的前端 UI Library 不同，它提供的是服务。

## 为什么要设计 WebWidget

### 问题

1. 开源社区大量的组件只能在特定的技术框架中才能运行，甚至一些组件依赖了特定的技术框架版本
2. 开发者需要花大量的时间研究每一个接口与服务、写很多胶水代码、测试胶水代码后才能让应用运行起来
3. 开源组件组件以及其依赖的安全问题、和应用的兼容性问题通常难以被察觉

### 契机

1. 在 NoCode/LowCode 理念流行下，可视化 Web 应用搭建系统层出不求，这样的体系下需要大量的、开箱即用的组件才能满足客户的需求
2. 微前端成为流行的技术理念，[single-spa](https://single-spa.js.org/) 定义的生命周期格式让 Web 应用跨技术栈、标准化接口提供很好的实践范例
3. Npm 成为了一个托管资源庞大的前端组件的大仓库，基于它有多个开箱即用的公共 CDN 服务
4. Web Components 成为面向未来的组件标准，几乎所有流行开源框架都支持它
5. [AMP](https://amp.dev) 提供了极致的网页载入性能优化思路
6. 虚拟化技术延伸到了 Web 前端领域（例如 [WebSandbox.js](https://web-sandbox.js.org)），使得我们可以创建安全的第三方组件运行环境

### 愿景

基于上述问题与契机，建设 WebWidget 规范的直接动机来自于 NoCode 产品中的组件系统，例如可视化页面搭建编辑器。

1. 所有人都可以使用 WebWidget，而非只有开发者
2. 和技术栈无关，兼容所有前端框架
3. 所有的前端组件，都可轻松变成 WebWidget
4. 所有的 NoCode 产品，都可兼容 WebWidget
5. Npm 或 Github 可以作为 WebWidget 的应用市场，使用公共 CDN 随时分发

## 标准化目标

* WebWidget 加载器
  * 标签
  * 接口
* WebWidget 入口文件
  * 生命周期
  * 插槽
  * 属性配置
  * 动作/方法
  * 唤起其他 WebWidget
  * 主题适应
  * ……
* WebWidget 描述文件
  * 名称
  * 简介
  * 图标
  * 关键字
  * 说明文档
  * 入口文件地址
  * ……


## 标签

### 基本

WebWidget 是一个标准的 Web Component 组件，它作为一个容器，它的具体功能由 `src` 定义的脚本实现。

```html
<web-widget src="app.widget.js"></web-widget>
```

为了不影响主页面的加载性能，WebWidget 的脚本是异步载入的。为了符合渐进式增强的体验，最佳做法是使用占位符与后备。

### 占位符

标有 `placeholder` 属性的元素将充当 WebWidget 元素的占位符号。如果指定，则 `placeholder` 元素必须是 WebWidget 元素的直接子级。标记为 `placeholder` 的元素将始终 fill（填充）父级 WebWidget 元素。

```html
<web-widget src="app.widget.js">
  <img placeholder src="preview.jpg" />
</web-widget>
```

### 后备

您可以在某元素上指定 `fallback` 属性，以便指明出现以下情况时采取的后备行为：

* 浏览器不支持某个元素
* 内容未能加载（例如，推文被删除）
* 图片类型不受支持（例如，并非所有浏览器都支持 WebP）
* 您可以在任何 HTML 元素（而不仅仅是 WebWidget 元素）上设置 `fallback` 属性。如果指定，则 `fallback` 元素必须是 WebWidget 元素的直接子级

```html
<web-widget src="video.js">
  <div fallback>
    <p>This browser does not support the video element.</p>
  </div>
</web-widget>
```

### 插槽

如果 WebWidget App 支持插槽，那么可以直接使用 `slot` 属性来指定插入的位置：

```html
<web-widget src="app.widget.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

插槽源自于 Web Component，更多插槽信息可以访问 <https://developer.mozilla.org/en-US/docs/Web/Web_Components>。

### 数据

通过 `data-*` 属性可以为 WebWidget App 传递静态的数据：

```html
<web-widget
  src="app.widget.js"
  data-username="web-widget"
  data-email="web-widget@web-sandbox.js.org"
>
</web-widget>
```

WebWidget App 可以通过生命周期函数获的 `properties` 参数获取到数据：

```json
{
  "data": {
    "username": "web-widget",
    "email": "web-widget@web-sandbox.js.org"
  }
}
```

受限于 HTML5 的约束，通过 `data-*` 只能传递 `string` 类型的值，如果想要传递 JSON 数据，您通过一个子元素指定 `is="data-source"` 属性来写 JSON 数据：

```html
<web-widget src="app.widget.js">
  <script is="data-source" type="json">
    {
      "username": "web-widget",
      "email": "web-widget@web-sandbox.js.org"
    }
  </script>
</web-widget>
```

如果同时存在 `is="data-source"` 与 `data-*` 定义的数据，最终会进行合并。

### 自定义元素

```html
<web-widget custom-element="my-element" src="my-element.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

### 沙盒

给 WebWidget 增加 `sandboxed` 属性即可启用沙盒。一旦沙盒被开启，能够让 WebWidget App 的所有的操作限制在 `<web-widget>` 视图内，网络、本地存储等都将被限制。

```html
<web-widget src="app.widget.js" sandboxed csp="script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net;">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

关于沙盒环境的限制，具体可以参考 [WebSandbox.js](https://web-sandbox.org.js)。

## 接口

```js
const widget = document.createElement('web-widget');
widget.src = 'app.widget.js';
document.body.appendChild(widget);
```

* `src` 应用入口文件。必须支持跨域访问
* `status` 应用的加载状态（只读）
  * `null` 默认状态
  * `"pending"` 正在加载
  * `"fulfilled"` 加载成功
  * `"rejected"` 加载失败
* `name` 应用名称。应用脚本可以通过生命周期的 `properties` 访问到
* `hidden` 显示与隐藏应用。不同于 CSS `display: none`，`hidden` 会触发应用的生命周期
* `sandboxed` 沙盒化。启用后，WebWidget 应用将被强制容器化，避免影响主文档
* `csp` 内容安全策略。只有开启 `sandboxed` 属性后才有效
* `contentWindow` 容器的内部 `window` 对象。只有开启 `sandboxed` 属性后才有效
* `contentDocument` 容器的内部 `document` 对象。只有开启 `sandboxed` 属性后才有效
* `evaluate(source, context)` 运行 JavaScript 代码。开启 `sandboxed` 后，它将在沙盒环境中执行

## 应用入口文件

应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的入口文件，入口文件必须实现下面提到的应用生命周期函数。

适配有有生命周期的入口文件。

```js
export default {
  async bootstrap: (properties) => {},
  async mount: (properties) => {},
  async unmount: (properties) => {},
  async unload: (properties) => {}
}
```

由于浏览器等限制，应用必须打包为 UMD 格式。

> 💡 `.widget.js` 后缀名是一个约定，它的目的是让开发工具能够更好识别 WebWidget 应用。

## 应用生命周期

生命周期函数是加载器在注册的应用上调用的一系列函数，加载器会在各应用的主文件中，查找对应的函数名并进行调用。

注:

* `bootstrap`、 `mount` 与 `unmount` 的实现是必须的，`unload` 则是可选的
* 生命周期函数必须有返回值，可以是 `promise` 或者 `async` 函数
* 如果导出的是函数数组而不是单个函数，这些函数会被依次调用，对于 `promise` 函数，会等到 resolve 之后再调用下一个函数
* 如果应用只被预加载，各个应用会被下载，但不会被初始化、挂载或卸载

WebWidget 元素会在不同的阶段主动触发这些应用生命周期：

```js
const widget = document.createElement('web-widget');

// 触发 bootstrap
widget.src = 'app.widget.js';

// 触发 mount
document.body.appendChild(widget);

// 触发 unmount
widget.hidden = false;

// 触发 mount
widget.hidden = true;

// 触发 unload
document.body.revmoeChild(widget);

// 触发 bootstrap
document.body.appendChild(widget);
```

### 生命周期参数

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

### 内置参数

每个生命周期函数的入参都会保证有如下参数：

* `name`: 注册到主文档的应用名称
* `data`: 应用初始化的数据。这是一个只读、可被序列化的数据结构。[参考](https://developer.mozilla.org/zh-CN/docs/Web/Guide/API/DOM/The_structured_clone_algorithm)
* `container`: 应用 DOM 元素的容器。这是一个 HTMLElement 对象实例，拥有 `appendChild()` 、`removeChild()`、`innerHTML`
* `addEventListener()`: 添加事件。[参考](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener)
* `dispatchEvent()`: 派发事件。[参考](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/dispatchEvent)
* `sandboxed`: 应用是否处于 WebSandbox DOM 沙箱中

## 应用描述文件

使用 pageckage.json 来描述应用，相关的字段：

| 必须                                                         | 类型 | 详细                                    |                                                              |
| ------------------------------------------------------------ | ---- | --------------------------------------- | ------------------------------------------------------------ |
| `name`                                                       | Y    | `string`                                | 应用的名称必须用全小写无空格的字母组成。                     |
| `web-widget`                                                 | Y    | `string`                                | WebWidget 规范版本。当前为 `1.0.0`                     |
| `version`                                                    | Y    | `string`                                | [SemVer](https://semver.org/) 版本模式兼容。                  |
| `publisher`                                                  | Y    | `string`                                | [发行方名称](https://liiked.github.io/VS-Code-Extension-Doc-ZH/#/extension-authoring/publish-extension?id=创建一个发行方) |
| `license`                                                    |      | `string`                                | 参考 [npm's documentation](https://docs.npmjs.com/files/package.json#license)。如果你在应用根目录已经提供了 `LICENSE` 文件。那么 `license` 的值应该是 `"SEE LICENSE IN <filename>"`。 |
| `displayName`                                                |      | `string`                                | 应用市场所显示的应用名称。                                   |
| `description`                                                |      | `string`                                | 简单地描述一下你的应用是做什么的。                           |
| `categories`                                                 |      | `string[]`                              | 你想要使用的应用分类 |
| `keywords`                                                   |      | `array`                                 | **关键字**（数组），这样用户可以更方便地找到你的应用。到时候会和市场上的其他应用以**标签**筛选在一起。 |
| `preview`                                                    |      | `boolean`                               | 在市场中会显示 Preview 标记。                                  |
| `main`                                                       |      | `string`                                | 你的应用入口                                                 |
| `markdown`                                                   |      | `string`                                | 控制市场中使用的 Markdown 渲染引擎。可以是 `github` (默认) 或 `standard`。 |
| `qna`                                                        |      | `marketplace` (默认), `string`, `false` | 控制市场中的 **Q & A** 链接。 设置成 `marketplace` 时，自动使用市场默认的 Q & A 网址。或者提供一个URL转跳到你的 Q & A 地址。设置为 `false` 时禁用。 |
| `icon`                                                       |      | `string`                                | icon 的文件路径，最小 128x128 像素 (视网膜屏幕则需 256x256)。 |

你还可以参考 [npm 的 `package.json`](https://docs.npmjs.com/files/package.json)。

## 其他

本章节非规范内容。

### SEO

因为 WebWidget 是一个标准的 Web Component，因此它的 SEO 问题本质上是 JavaScript 和 Web Component 的 SEO 问题。社区中有两种实践方式：

* 使用 [Light DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom#lightdom) 来描述关键内容
* 使用 [JSON-LD](https://json-ld.org/) 描述关键内容

### 发布 WebWidget

WebWidget 可以发布到任何地方，例如企业的私有 CDN，如果你想让所有人都可以使用到，推荐发布到 Npm 或者 Github，这样使用者可以通过公共 CDN 加载它。 
