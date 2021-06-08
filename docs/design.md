# WebWidget 设计背后演化

## 方案一：基于 [single-spa](https://single-spa.js.org/)

[single-spa](https://single-spa.js.org/) 定义了 Applications 与 Parcels 两个概念，其中 Parcels 是通过 Applications 内部的 `mountParcel()` 来挂载的。

```js
define({
  async mount(properties) {
    const {
      name,
      mountParcel,
      container
    } = properties;

    mountParcel(parcelConfig, parcelProps);
  }
));
```

### 我们为什么要改进

[single-spa](https://single-spa.js.org/) 的生命周期函数设计非常优秀，它的目标解决路由驱动场景下微前端的架构，这和我们目标上有一些差异：

* 应用的挂载采用了单实例模型设计，而组件模型通常应该默认支持多实例的
* 它的目标是尽可能保证主应用能够被成功挂载或卸载，子应用的异常通常会被拦截掉，这会导致难错误难以被发现、修复
* single-spa 在应用生命周期参数注入了它自己的业务接口，应用对宿主有依赖会导致日后产生兼容性问题（如果宿主（single-spa）本身能够成为标准并且稳定下来，那么这个问题不会存在）
* 在 single-spa 的文档中，Parcels 似乎是一个被“冷遇”的接口，一方面是文档明确提出不应该被广泛使用，因为它会加重应用复杂度；另一方面是 Parcels 的文档非常难以理解

## 方案二：将挂载应用、挂载子应用、传送门挂载应用抽象为同一个接口

### 在自身容器中挂载应用

```js
define({
  async mount({ container, WebWidget }) {
    const div = document.createElement('div');
    const userWidget = new WebWidget(div, './users.widget.js');
    container.appendChild(div);
  })
});
```

生成的 DOM：

```html
<web-widget>
  #shadow-root (closed)
    <div>
      #shadow-root (closed)
    </div>
</web-widget>
```

### 应用之间嵌套

将 `WebWidget` 作为另外一个 `WebWidget` 的容器：

```js
define({
  async mount({ container, WebWidget }) {
    const div = document.createElement('div');
    const cardWidget = new WebWidget(div, './card.widget.js');
    const userWidget = new WebWidget(cardWidget, './users.widget.js', {}, {
      slot: 'main'
    });
    cardWidget.mount().then(() => userWidget.mount());
  })
});
```

生成的 DOM：

```html
<web-widget>
  #shadow-root (closed)
    <div>
      #shadow-root (closed)
        <slot name="main">...</slot>
      <web-widget-slot slot="main">
        #shadow-root (closed)
      </web-widget-slot>
    </div>
</web-widget>
```

## 方案三：基于 Web Components 抽象

无论是主文档还是应用、子应用内，均可以使用 HTML 标签进行声明：

```html
<web-widget src="./users.widget.js"></web-widget>
```

### 在自身容器中挂载应用

```js
define({
  async mount({ container }) {
    const userWidget = document.createElement('web-widget');
    userWidget.src = './users.widget.js';
    container.appendChild(userWidget);
  })
});
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
define({
  async mount({ container }) {
    const cardWidget = document.createElement('web-widget');
    cardWidget.src = './card.widget.js';
    const userWidget = document.createElement('web-widget');
    userWidget.slot = 'main';
    userWidget.src = './user.widget.js';
    container.appendChild(cardWidget);
    cardWidget.appendChild(userWidget);
  })
});
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
define({
  async mount({ container, createPortal }) {
    const userWidget = document.createElement('web-widget');
    userWidget.slot = 'main';
    userWidget.src = './user.widget.js';
    // 传送应用
    const cardWidget = createPortal(userWidget, 'dialog');
    cardWidget.unmount();
  })
});
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
* 得到一个接近理想的 Web Components 模块导入方案+++++