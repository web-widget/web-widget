# WebWidget 标准

## 什么是 WebWidget

WebWidget 是一种用于网页的小挂件标准，和传统的前端命令式的 UI Library 不同，它提供的是服务抽象，能够适应于可视化编排、跨技术栈的需要。

## 为什么要设计 WebWidget

建设 WebWidget 规范的直接动机来自于构建 NoCode 产品中的组件系统需要，例如可视化页面搭建编辑器的组件系统。

### 问题

1. 开源社区大量的组件只能在特定的技术框架中才能运行，甚至一些组件依赖了特定的技术框架版本
2. 开发者需要花大量的时间研究每一个接口与服务、写很多胶水代码、测试胶水代码后才能让应用运行起来
3. 开源组件组件以及其依赖的安全问题、和应用的兼容性问题通常难以被察觉

### 契机

1. 在 NoCode/LowCode 理念流行下，可视化 Web 应用搭建系统层出不求，这样的体系下需要大量的、开箱即用的组件才能满足客户的需求
2. 微前端成为流行的技术理念，[single-spa](https://single-spa.js.org/) 定义的生命周期格式让 Web 应用跨技术栈、标准化接口提供很好的实践范例
3. Npm 成为了一个托管资源庞大的前端组件的大仓库，基于它有多个开箱即用的公共 CDN 服务
4. Web Components 成为面向未来的组件标准，几乎所有流行开源框架都支持它
5. [AMP](https://amp.dev) 提供了极致的网页载入性能优化思路，它提出了工业化的解决方案
6. 虚拟化技术延伸到了 Web 前端领域（例如 [WebSandbox.js](https://web-sandbox.js.org)），可以创建安全的第三方组件运行的容器化环境

### 愿景

1. 更多的人可以使用 WebWidget 来搭建产品，不仅仅是开发者
2. 不和技术栈无关，能够兼容所有的前端框架
3. 所有的前端组件，都可轻松变成 WebWidget
4. 所有的 NoCode 产品，都可兼容 WebWidget
5. Npm 或 Github 成为 WebWidget 的开放应用市场，使用公共 CDN 随时分发

## 标准化内容

* 加载器
  * [x] 标签
  * [x] 接口
  * [x] 沙盒
* 应用入口
  * [x] 生命周期
  * [x] 属性配置数据
  * [ ] 动作或方法
  * [ ] 唤起其他 WebWidget
  * [ ] 主题适应
* 应用描述
  * [x] 名称
  * [x] 简介
  * [x] 图标
  * [x] 关键字
  * [x] 说明文档
  * [x] 入口文件地址

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

你可以在某元素上指定 `fallback` 属性，以便指明出现以下情况时采取的后备行为：

* 浏览器不支持某个元素
* 内容未能加载（例如，推文被删除）
* 图片类型不受支持（例如，并非所有浏览器都支持 WebP）
* 你可以在任何 HTML 元素（而不仅仅是 WebWidget 元素）上设置 `fallback` 属性。如果指定，则 `fallback` 元素必须是 WebWidget 元素的直接子级

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

受限于 HTML5 的约束，通过 `data-*` 只能传递 `string` 类型的值，如果想要传递 JSON 数据，你通过一个子元素指定 `is="data-source"` 属性来写 JSON 数据：

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

### 自定义元素模式

如果入口文件是一个标准的 Web Component，那么使用 `custom-element` 属性可以简化 Web Component 的加载与使用。

```html
<web-widget custom-element="my-element" src="my-element.js">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

```js
// my-element.js
export default class MyElement extends HTMLElement {
  // ...
}
```

在这个模式下，入口文件不需要生命周期函数（也不会运行）。 

> 💡 自定义元素模式它不要求入口文件实现生命周期函数，这意味着将失去标准 WebWidget 应用拥有的主要能力，它更像是 Web Component 加载器。因此我们需要评估是否将其纳入 WebWidget v1.0.0 规范中。

### 沙盒

给 WebWidget 增加 `sandboxed` 属性即可启用沙盒。一旦沙盒被开启，能够让 WebWidget App 的所有的操作限制在 `<web-widget>` 视图内，它的网络、本地存储等都将被管控，让不可信代码能够安全的运行。除此之外，还能以更简单的方式解决不同前端框架共存、版本兼容的问题。

```html
<web-widget src="app.widget.js" sandboxed csp="script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net;">
  <span slot="title">hello</span>
  <span slot="content">Let's have some different text!</span>
</web-widget>
```

开启沙盒后，如果应用没有实现生命周期函数，也能确保它能够正常被渲染的同时也不会对主文档产生副作用，这可以用来快速迁移一些旧的组件。

关于沙盒环境的限制，具体可以参考 [WebSandbox.js](https://web-sandbox.org.js)。

## 接口

```js
const widget = document.createElement('web-widget');
widget.src = 'app.widget.js';
document.body.appendChild(widget);
```

### `src`

应用入口文件。

### `name`

应用名称。应用脚本可以通过生命周期的 `properties` 访问到。

### `hidden`

显示与隐藏应用。不同于 CSS `display: none`，`hidden` 会触发应用的生命周期。

### `sandboxed`

沙盒化。启用后，WebWidget 应用将被强制容器化，避免影响主文档。

### `csp`

内容安全策略。只有开启 `sandboxed` 属性后才有效。

### `contentWindow`

容器的内部 `window` 对象。只有开启 `sandboxed` 属性后才有效。

### `contentDocument`

容器的内部 `document` 对象。只有开启 `sandboxed` 属性后才有效。

### `evaluate(source, context)`

运行 JavaScript 代码。开启 `sandboxed` 后，它将在沙盒环境中执行。

### `loading`

指示浏览器应当如何加载。允许的值：

* `"eager"` 立即加载，不管它是否在可视视口（visible viewport）之外（默认值）
* `"lazy"` 延迟加载，直到它和视口接近的距离

### `status`

应用的加载状态（只读），可能出现的值：

* `"pending"`
* `"fulfilled"`
* `"rejected"`

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

// 触发 unload
document.body.revmoeChild(widget);

// 触发 bootstrap
document.body.appendChild(widget);

// 触发 mount
widget.hidden = true;
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
* `sandboxed`: 应用是否处于 WebSandbox DOM 沙箱中

> 💡 应用生命周期来自于微前端框架 [single-spa](https://single-spa.js.org/) 的定义，这样可以确保 WebWidget 的应用能够被 [single-spa](https://single-spa.js.org/) 或其兼容的加载器加载。

## 应用描述文件

使用 pageckage.json 来描述应用，相关的字段：

| 名称                                                         | 必须  | 类型                                     | 详细                                                         |
| ------------------------------------------------------------ | ---- | --------------------------------------- | ------------------------------------------------------------ |
| `name`                                                       | Y    | `string`                                | 应用的名称必须用全小写无空格的字母组成                             |
| `main`                                                       | Y    | `string`                                | 应用入口                                                      |
| `web-widget`                                                 | Y    | `string`                                | 应用采用的 WebWidget 规范版本。当前为 `1.0.0`                    |
| `version`                                                    | Y    | `string`                                | [SemVer](https://semver.org/) 版本模式兼容                     |
| `license`                                                    |      | `string`                                | 参考 [npm's documentation](https://docs.npmjs.com/files/package.json#license)。如果你在应用根目录已经提供了 `LICENSE` 文件。那么 `license` 的值应该是 `"SEE LICENSE IN <filename>"` |
| `displayName`                                                |      | `string`                                | 应用市场所显示的应用名称                                          |
| `description`                                                |      | `string`                                | 简单地描述应用是做什么的                                          |
| `categories`                                                 |      | `string[]`                              | 应用分类                                                       |
| `keywords`                                                   |      | `array`                                 | **关键字**（数组），这样用户可以更方便地找到你的应用。到时候会和市场上的其他应用以**标签**筛选在一起 |
| `icon`                                                       |      | `string`                                | icon 的文件路径，最小 128x128 像素 (视网膜屏幕则需 256x256)          |

你还可以参考 [npm 的 `package.json`](https://docs.npmjs.com/files/package.json)。

## 其他

本章节非规范内容。

### SEO

因为 WebWidget 是一个标准的 Web Component，因此它的 SEO 问题本质上是 JavaScript 和 Web Component 的 SEO 问题。社区中有两种实践方式：

* 使用 [Light DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom#lightdom) 来描述关键内容
* 使用 [JSON-LD](https://json-ld.org/) 描述关键内容

### 发布 WebWidget 应用

WebWidget 可以发布到任何地方，例如企业的私有 CDN，如果你想让所有人都可以使用到，推荐发布到 Npm 或者 Github，这样使用者可以通过公共 CDN 加载它。 

### WebWidget 应用自动升级

一些公共 CDN 提供了自动更新的机制，例如 [jsdelivr](https://www.jsdelivr.com)，你可以通过它实现 WebWidget 应用的自动升级。

始终使用最新版本：

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget"></web-widget>
```

使用 2.x.x 的最新版本：

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget@2"></web-widget>
```

锁定版本：

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget@1.0.0"></web-widget>
```
