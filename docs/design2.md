## 标准化微前端容器— WebWidget 设计过程

最近我们解决了一个前所未有的工程化挑战：在 Web 中设计一个支持可被可视化编辑编组件系统，并且允许安全运行来自用户的代码。例如通过可视化编辑器对组件的布局或者配置进行调整、运行来自 Npm 或者 Github 的远程代码等。

我们的编辑器是通过 Web 技术构建的，我们使用了 Vue 来构建用户界面，因此借助 Vue 或者 React 的组件系统会很容易实现组件的动态注入，这也是我们旧组件系统的技术方案。

对于新一代的编辑器，我们希望能够编排更多的前端组件，这些组件可能来自不同的技术栈实现，它们可能通过本地导入或者直接使用 CDN 加载。这个目标真正的挑战在于：这些组件不再像过去一样都经过我们内部的开发人员的精心的设计，它们很有可能无法运行甚至包含恶意代码。

我们的目标可以归结于两个问题：

1. 如何安全的运行代码
2. 如何让组件支持可视化编排

关于如何安全运行代码（JavaScript）这个大课题上，无论 微软、Google、Facebook、Figma 等公司都有提出过不同的解决方案，但是它们的都无法解决我们面临的问题，因此我们使用了新的安全模型与虚拟化技术来达到这一目标：

* JS 语言安全——Realm: 基于 TC39 最新草案实现
* CSS 安全——Shadow DOM: Web 正式标准
* HTML 安全——Sanitizer: 基于 W3C 草案实现
* 内容安全策略——CSP: 基于 W3C 正式标准实现

这个运行用户代码的可信环境实现了大部分浏览器 BOM 接口，它拥有完整的 DOM 树结构：

```html
<web-sandbox>         ——— window
  #shadow-root        ——— document
    <html>            ——— document.documentElement
      <head></head>   ——— document.head
      <body></body>   ——— document.body
    </html>
</web-sandbox>
```

为了确保我们新的组件系统足够的信心被用户采用，因此我们内部也将使用同样的机制来进行组件开发。内部与外部组件的差别仅仅在于权限的范围差异，这一点很像 iOS 的应用系统：官方开发的应用将有更多的权限以实现更加强大的功能，第三方的应用将运行在沙盒下以确保用户的安全。

这项技术被称作 WebSandbox，它的原理更多内容可以在 [WebSandbox.js](https://github.com/web-sandbox-js/web-sandbox) 仓库中找到。而当前文章的重点是描述第 2 个问题：如何让组件支持可视化编排。

 ## NoCode 的组件提供的是服务

传统的 UI 组件的设计大多数是面向过程的，它们必须通过胶水代码以及特定的框架才能运行起来，而实现这些 UI 组件的可视化编排难以摆脱对胶水代码的依赖。要想组件能够运行在 NoCode 模式下，这要求组件提供的是服务。就像客户端调用服务一样，都通过 HTTP 标准化的协议来调用，所有和服务交互的过程都被高度标准化。

我们考虑了很多不同的路线和方法来实现组件的服务化抽象，在数月的尝试中找到了认为接近问题本质的设计方案，其中包含三个最核心的尝试。

## 尝试 1：直接使用 single-spa

[single-spa](https://single-spa.js.org/)  是我们找到最接近服务化理念的方法，它作为一个开源的 JavaScript 的库、较早的帮助社区中实践前端的微服务。它和我们的目标有共同之处：

* 应用之间独立开发、构建、部署
* 和技术栈无关

它抽象了应用的生命周期函数，要求应用实现带有生命周期的 js 作为应用入口：

```js
export default {
  bootstrap: async (properties) => {},
  mount: async (properties) => {},
  unmount: async (properties) => {},
  unload: async (properties) => {}
}
```

而应用的启动参数将通过 `properties` 获取到。

我们一开始对 [single-spa](https://single-spa.js.org/)  的方案抱有了较大的信心，如果完全兼容它意味着我们可以直接享受它社区给我们的资源，也能够给  [single-spa](https://single-spa.js.org/)  社区共享我们的力量。当我们深入到更多细节的时候，逐渐了发现了一些本质上的差异，这个差异决定我们需要在它基础上进行较大的改进。

[single-spa](https://single-spa.js.org/) 定义了 Applications 与 Parcels 两个概念，其中 Parcels 是通过 Applications 内部的 `mountParcel()` 来挂载的。

```js
export async function mount({ mountParcel }) {
  // more code..
  const parcel = mountParcel(parcelConfig, parcelProps);
}
```

[single-spa](https://single-spa.js.org/) 它的目标解决路由驱动场景下微前端的架构，路由直接驱动的是 Applications，因此 Applications  是一等公民。而 `mountParcel()`  作为 Applications 之间的模块共享方案却拥有另外一套皆然不同的 API 来管理它，并且文档非常难以理解。于此同时，官方也不推荐用户使用它，因为通过它共享组件会放大微前端的缺点。总之， `mountParcel()`  有点像一个补丁一样的存在，非良好的设计。

路由驱动场景下的目标是尽可能保服务之间不受影响，在 [single-spa](https://single-spa.js.org/)  的设计中，因此一些应用的异常会被它忽略，这会导致错误难以被捕获、被发现。

[single-spa](https://single-spa.js.org/)  在应用生命周期参数注入了它自己的业务接口，一旦应用对宿主的接口有依赖会导致日后产生兼容性问题。如果 [single-spa](https://single-spa.js.org/) 本身能够成为标准并且稳定下来，那么这个问题不会存在。

## 尝试 2：将挂载应用、挂载子应用、传送门挂载应用抽象为同一个接口

### 在自身容器中挂载应用

```js
export async function mount({ container, WebWidget }) {
  const div = document.createElement('div');
  const userWidget = new WebWidget(div, './users.widget.js');
  container.appendChild(div);
})
```

### 应用之间嵌套

将 `WebWidget` 作为另外一个 `WebWidget` 的容器：

```js
export async function mount({ container, WebWidget }) {
  const div = document.createElement('div');
  const cardWidget = new WebWidget(div, './card.widget.js');
  const userWidget = new WebWidget(cardWidget, './users.widget.js', {}, {
    slot: 'main'
  });
  cardWidget.mount().then(() => userWidget.mount());
})
```

## 尝试 3：基于 Web Components 抽象

无论是主文档还是应用、子应用内，均可以使用 HTML 标签进行声明：

```html
<web-widget src="./users.widget.js"></web-widget>
```

### 在自身容器中挂载应用

```js
export async function mount({ container }) {
  const userWidget = document.createElement('web-widget');
  userWidget.src = './users.widget.js';
  container.appendChild(userWidget);
})
```

生成的 DOM：

```html
<web-widget>
  #shadow-root (closed)
    <web-widget src="./users.widget.js">
      #shadow-root (closed)
    </web-widget>
</web-widget>
```

### 应用之间嵌套

```js
export async function mount({ container }) {
  const cardWidget = document.createElement('web-widget');
  cardWidget.src = './card.widget.js';
  const userWidget = document.createElement('web-widget');
  userWidget.slot = 'main';
  userWidget.src = './user.widget.js';
  container.appendChild(cardWidget);
  cardWidget.appendChild(userWidget);
})
```

生成的 DOM：

```html
<web-widget>
  #shadow-root (closed)
    <web-widget src="./card.widget.js">
      #shadow-root (closed)
        <slot name="main">...</slot>
      <web-widget slot="main" src="./user.widget.js">
        #shadow-root (closed)
      </web-widget>
    </web-widget>
</web-widget>
```

### 权限继承与生命周期顺序

* 父组件卸载之前会先卸载子应用、子应用创建的传送门
* 子应用会继承父应用的沙箱权限
* DOM 的插入与删除都会触发应用生命周期函数
* 应用通过传送门挂载之前，会先卸载上一个 slot 同名的应用

### 定义传送门

```js
webWidgetPortalRegistry.define('dialog', () => {
  const dialogWidget = document.createElement('web-widget');
  dialogWidget.src = './dialog.widget.js';
  document.body.appendChild(dialogWidget);
  return dialogWidget;
});
```

### 应用内创建送门

```js
export async function mount({ container, createPortal }) {
  const userWidget = document.createElement('web-widget');
  userWidget.slot = 'main';
  userWidget.src = './user.widget.js';
  // 传送应用
  const cardWidget = createPortal(userWidget, 'dialog');
  cardWidget.unmount();
})
```

生成的 DOM：

```html
<web-widget>
  #shadow-root (closed)
</web-widget>

<web-widget src="./card.widget.js">
  #shadow-root (closed)
    <slot name="main">...</slot>
  <web-widget slot="main" src="./user.widget.js">
    #shadow-root (closed)
  </web-widget>
</web-widget>
```

## 组合的力量

使用 Web Components 与 实现一个自定义元素只需要将使用到 `class` 语句并且注册，类似：

```js
class HTMLWebWidgetElement extends HTMLElement {
  constructor() {
    super();
    // ...
  }
}
customElements.define('web-widget', HTMLWebWidgetElement);
```

> 此章节未完成，观点：
>
> 1. 本质的东西会成为标准
> 2. 复杂问题解决方案会回到程序的设计模式

## 重写元素名称

通过继承 `HTMLWebWidgetElement` 接口可以使用不同标签名的 WebWidget，避免使用 `name` 属性区分。

```html
<hello-world src="./slot.widget.js" sandboxed>
  <p slot="main">hello wrold</p>
</hello-world>

<script type="module">
  import '../../src/HTMLWebWidgetElement.js';
  customElements.define('hello-world', class HelloWorld extends HTMLWebWidgetElement {});
</script>
```

## WebWidget HTML 模块化导入

通过继承 `HTMLWebWidgetElement` 接口如果仅仅只是重新定义标签名，那么这些需求使用标签来表达会更容易理解，就像 ECMAScript 的 `import` 语句一样。

```html
<web-widget.import as=tagName src=widgetUrl></web-widget.import>
```

这样还有一个好处是可以避免反复定义 csp 等复杂的配置：

```html
<web-widget.import
  as="hello-world"
  src="./slot.widget.js"
  sandboxed
  csp="
    default-src 'none';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net web-sandbox.js.org;
    style-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
    navigate-to 'self' web-sandbox.js.org;
  ">
</web-widget.import>

<hello-world>
  <p slot="main">hello wrold</p>
</hello-world>

<hello-world>
  <p slot="main">hello web-widget</p>
</hello-world>

<script type="module">
  import '../../src/HTMLWebWidgetElement.js';
  import '../../src/HTMLWebWidgetImportElement.js';
</script>
```

基于安全的考虑，通过 `<web-widget.import>` 载入的组件被设计为不允许重定义配置，例如 `sandboxed`、`csp`、`src` 等属性。

## Web Components HTML 模块化导入

```html
<web-component.import as=tagName src=webComponentsUrl></web-component.import>
```

它拥有和 `<web-widget.import>` 一样的属性，不同的是它只支持标准的 Web Components 模块格式。Web Components 模块无需打包成 UMD 规范，也无需遵循 WebWidget 的生命周期定义。只需要按照 Web Components 的要求实现自定义元素的构造器，并且使用 `customElements.define(name, Element)` 注册。例如：

```js
class MyElment extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot = `
      <main><slot name="main">hello wrold</slot></main>
    `;
  }
}
customElements.define('my-element', MyElment);
```

## 路由驱动

通常情况下 WebWidget 会基于 DOM 的生命周期来触发应用的生命周期函数，如果给容器添加一个`inactive` 属性即可关闭与 DOM 生命周期的绑定，以便交给程序来控制它，例如前端路由库。

```html
<web-widget id="home" src="./index.widget.js" inactive></web-widget>
<web-widget id="news" src="./news.widget.js" inactive></web-widget>
<web-widget id="about" src="./about.widget.js" inactive></web-widget>
<script type="module">
  import '../../src/HTMLWebWidgetElement.js';
  import { register, start } from  '../../src/WebWidgetRouter/index.js';

  register(
    document.querySelector('#home'),
    location => location.pathname === '/'
  );

  register(
    document.querySelector('#news'),
    location => location.pathname.startsWith('/news')
  );

  register(
    document.querySelector('#about'),
    location => location.pathname.startsWith('/about')
  );

  start();
</script>
```

## 总结

### WebWidget 与 single-spa 的应用主要兼容性差异

* WebWidget 应用运行在 ShadowDOM 中
* WebWidget 应用没有 `mountParcel()` 方法
* WebWidget 应用没有名为 `singleSpa` 的接口
* single-spa 在卸载应用的时候，子应用异常会被忽略，而 WebWidget 不会忽略错误
* WebWidget 增加了传送门概念，应用可使用 `createPortal()` 方法

### 我们得到了什么

* 组件即应用的编程模型
* 基于远程、异步载入，即插即用，无需通过源代码构建
* 让第三方未知组件的权限可控、可信任
* 易于进行 SEO 优化
* 易于进行性能优化，例如自动实施懒加载与优先加载
* 可被组合，被扩展形成新的解决方案。例如通过配合路由库创建企业级业务微前端架构
* 得到一个接近理想的 Web Components 模块导入方案