## 标准化微前端容器— WebWidget 设计过程

最近我们解决了一个前所未有的工程化挑战：在 Web 中设计一个支持可被可视化编辑编组件系统，并且允许安全运行来自用户的代码。例如通过可视化编辑器对组件的布局或者配置进行调整、运行来自 Npm 或者 Github 的远程代码等。

我们在构建一个下一代的网页可视化编辑器，我们希望能够让设计师和开发者能够分工协作：设计师是编辑器的核心用户，开发者通过组件系统为设计师提供支持可视化编排的组件。这些组件可能来自不同的技术栈实现，它们可能通过本地导入或者直接使用 CDN 加载。这个目标真正的挑战在于：这些组件不再像过去一样都经过我们内部的开发人员的精心的设计，它们很有可能无法运行甚至包含恶意代码。

我们的目标可以归结于两个问题：

1. 如何安全的运行代码
2. 如何让组件支持可视化编排

这两个问题涵盖了当今最热门的几个话题：微前端、沙箱、插件系统、NodeCode，你可以通过这篇文章的指引来设计一个接近问题本质的解决方案。

关于如何安全运行代码（JavaScript）这个大课题上，无论 微软、Google、Facebook、Figma 等公司都有提出过不同的解决方案，但是它们的都无法解决我们的问题：我们要提供安全且高效的 DOM 运行环境，并且最大程度的保持与真实环境的一致性。最终我们实现了一个令人激动的技术方案，我们利用 Web 中已有的标准或者实现草案构建了一个安全模型，并且通过虚拟化技术完成对资源的分配：

* JS 语言安全——Realm: 基于 TC39 最新草案实现
* CSS 安全——Shadow DOM: Web 正式标准
* HTML 安全——Sanitizer: 基于 W3C 草案实现
* 内容安全策略——CSP: 基于 W3C 正式标准实现

这个可信环境实现了大部分浏览器 BOM 接口，它拥有完整的 DOM 树结构：

```html
<web-sandbox>         ——— window
  #shadow-root        ——— document
    <html>            ——— document.documentElement
      <head></head>   ——— document.head
      <body></body>   ——— document.body
    </html>
</web-sandbox>
```

这项技术被称作 `WebSandbox`，它的原理更多内容可以在 [WebSandbox.js](https://github.com/web-sandbox-js/web-sandbox) 仓库中找到，而当前文章的重点是描述第 2 个问题：如何让组件支持可视化编排。

> `WebSandbox` 在筹划开源的阶段。

## NoCode 的组件是服务

传统的 UI 组件的设计大多数是面向过程的，它们必须通过胶水代码以及特定的框架才能运行起来，这些组件 NoCode 编辑器模式下难以被直接使用。要实现 NoCode 阶段的可视化编排，组件提供的必须是开箱即用的服务，而编程接口。

我们考虑了很多不同的路线和方法来实现组件的服务化抽象，在数月的尝试中找到了认为接近问题本质的设计方案，其中包含四个最核心的尝试。

## 尝试 1：直接使用 WebSandbox

`WebSandbox` 为组件提供了独立的虚拟化环境，它的脚本操作都被限制在分配的视图中，它的本地存储、定时器、网络等有副作用的操作都能够被管控，移除它也会将定时器等资源进行销毁——这已经非常接近一个 iframe 的特性，它俨然是一个随时可用的微服务组件，我们似乎什么都不用做就达到了目标。

```html
<web-sandbox src="./tabs.js"></web-sandbox>
```

正因 `WebSandbox` 可以确保它不会有副作用，所以设计师可以通过编辑器把它放在任意的位置、对它的 `style` 进行设置。如果需要对组件的参数进行调节，那么可能需要增加类似 `postMessage()` 与 `onmessage`  之类的 API 以确保组件自己可以获取到配置数据。

经过一些探讨，我们意识到这个方案的局限：

* message 中可能包含事件与回调，组件需要很多胶水代码才能完成对 `onmessage`  的解析拿到数据，虽然我们可以将这个协议标准化，例如采用 JSON-RPC 等。无论如何这过于复杂，我们希望保持简单
* 为了确保我们新的组件系统足够的信心被用户采用，我们希望内部也将使用同样的机制来进行组件开发，但是内部组件要求更少的限制，这一点很像 iOS 的应用系统：官方开发的应用将有更多的权限以实现更加强大的功能，第三方的应用将运行在沙盒下以确保用户的安全。因此我们的组件系统的沙盒特性必须是可选的

## 尝试 2：直接使用 single-spa

[single-spa](https://single-spa.js.org/) 是一个开源的 JavaScript 的库，它较早的将后端微服务的理念引入到前端工程，即——微前端。它的成果中包含了我们想要的关键部分：

* 将应用的概念具像化
* 应用之间独立开发、构建、部署
* 应用与技术栈无关

它抽象了应用的生命周期函数，要求应用的入口文件实现对应接口：

```js
export default {
  // 初始化
  bootstrap: async (properties) => {},
  // 挂载
  mount: async (properties) => {},
  // 卸载
  unmount: async (properties) => {},
  // 移除
  unload: async (properties) => {}
}
```

应用最终会按照一定顺序分别触发应用生命周期，并且传入参数完成通讯。

我们一开始对 single-spa  的方案抱有了较大的信心，如果完全兼容它意味着我们可以直接享受它社区给我们的资源，也能够给 single-spa 社区共享我们的力量。但是当我们深入到更多细节的时候，发现它的设计离我们可视化组件系统的预期还有一些距离。

single-spa 有两个大概念，一个是 Applications，另外一个是 Parcels。它们直接的区别是：Applications 内部要挂载其他 Applications 的时候，这个就是 Applications 就是 Parcels，它比 Applications 多了一个生命周期函数 `update()`，以供手动更新应用数据。

```js
export async function mount({ mountParcel }) {
  const parcelApi = mountParcel(import('./child-app'), parcelProps);
}
```

负责加载 Applications 的是 single-spa 路由系统，负责管理 Parcels 的是 Applications 生命周期里的 `mountParcel()` 函数或者 `mountRootParcel()`。加载应用的方式有如此多种，并且每一个都有很大的不同——这就是令我们非常疑惑的地方，这种疑惑也反映在 single-spa 的官方文档上，它对 Parcels  的描述非常难以理解，我们也花了足够多的时间并且通过阅读源代码才真正理解它创建的概念。

当抽象难以理解的时候，或许是还不够抽象。

## 尝试 3：创建应用容器抽象

single-spa 它核心解决的问题是路由驱动的、单实例应用场景，而我们场景是多实例的。我们期望自己设计的组件系统格式能够接近最本质的东西，因此我们尝试合并Applications  与 Parcels  概念并且将路由管理从概念中剥离，拆分两个维度进行设计：

* 应用标准格式
* 应用标准容器（或加载器）

最终我们应用标准格式保持 single-spa 的定义，并且对 `properties` 默认成员进行更明确定义，删除 `mountParcel()` 以及 single-spa 注入的自身实例；应用的标准容器概念被命名为——`WebWidget`，这个名字我们借鉴了 iOS、Android 对应的概念，它的核心职责完成应用加载、初始化、挂载、更新、卸载、移除的抽象，不包括路由管理等多余的东西。

### 在主文档中挂载应用

```js
new WebWidget(document.body, './main.widget.js', data, { sandboxed: true });
```

应用的脚本被设计为 url 而非加载函数，这是为了能够通过 `WebSandbox` 来执行脚本，从而实现沙盒化。

### 在应用中挂载子应用

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

## 尝试 4：基于 Web Components 抽象

`WebWidget` 接口提供了对应用生命周期的管理抽象，但它缺乏对视图的抽象，例如位置、尺寸等，而后者对可视化网页编辑器而言非常重要，因此我们尝试最重要的设计改进措施：采用  Web Components。

无论是主文档还是应用、子应用内，均可以使用 HTML 标签进行声明：

```html
<web-widget src="./users.widget.js" sandboxed></web-widget>
```

也可以通过接口进行命令式操作：

```js
const widget = document.createElement('web-sandbox');
widget.src = './users.widget.js';
widget.sandboxed = true;
widget.csp = `script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net`;
document.body.appendChild(widget);
```

我们在 Web Components 的到的新能力：

* `<web-widget>` 标签可以被其他前端框架直接使用
* DOM 的插入、删除能够自动触发 ``<web-widget>` ` 对应的生命周期
* Shadow DOM 可以帮助 ``<web-widget>` ` 隔离 CSS 污染（WebSandbox 也采用了它）
* 基于 JavaScript 的 `class` 组织代码的方式可以让开发者扩展 ``<web-widget>` ` 的功能，提高灵活性

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

const cardWidget = document.createElement('web-widget');
cardWidget.src = './card.widget.js';
const userWidget = document.createElement('web-widget');
userWidget.slot = 'main';
userWidget.src = './user.widget.js';
document.body.appendChild(cardWidget);
cardWidget.appendChild(userWidget);
```

生成的 DOM：

```html
<web-widget src="./card.widget.js">
  #shadow-root (closed)
    <slot name="main">...</slot>
  <web-widget slot="main" src="./user.widget.js">
    #shadow-root (closed)
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

## 可扩展性

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
> 1. 复杂问题解决方案会回到程序的设计模式

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

它拥有和 `<web-widget.import>` 一样的属性，不同的是它只支持标准的 Web Components 模块格式。Web Components 模块无需打包成 UMD 规范，也无需遵循 WebWidget 的生命周期定义，只需要按照 Web Components 的要求定义单文件组件。例如：

```js
// my-element.js
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

```html
<web-component.import as="slot-demo" src="./my-element.js"></web-component.import>

<slot-demo>
  <p slot="main">Hello Wrold</p>
</slot-demo>

<script type="module">
  import '../../src/HTMLWebWidgetElement.js';
  import '../../src/HTMLWebWidgetImportElement.js';
  import '../../src/HTMLWebComponentImportElement.js';
</script>
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

> TODO
>
> 1. 阐述为什么不是以 HTML 作为入口
> 2. 阐述为什么是使用生命周期接口，而不是全局对象