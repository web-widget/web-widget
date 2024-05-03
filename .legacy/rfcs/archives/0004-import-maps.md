- 开始日期：2021-11-08
- 作者：糖饼

# 目标

让 Web Widget 应用支持[导入映射](https://github.com/WICG/import-maps)。

# 动机

javascript 项目中的常见做法是使用所谓的“裸模块”。这些是 imports 语句，它仅指定包的名称或包内的文件。

例如：

```js
import foo from 'foo';
```

当 node_modules 文件夹中的依赖项需要引用其他包时，此类导入很有用。但浏览器不理解这种导入方式，需要某种形式的预处理来解析导入以引用实际文件位置，像[导入映射](https://github.com/WICG/import-maps)这样的标准将允许浏览器理解这些类型的导入，而无需转换步骤。

对于 Web Widget 而言，它默认支持 es module，因此应用内的“裸模块”可以通过[导入映射](https://github.com/WICG/import-maps)来获取到实际的文件，但 Web Widget 的应用**自身**却不支持裸模块，因为应用的 `src` 会自动补全路径，使加载器得到错误的地址。例如：

```html
<!--https://web-widget.js.org/demos/-->
<web-widget src="app-widget"></web-widget>
```

加载器通过 `src` 得到的是 `https://web-widget.js.org/demos/app-widget`。

当 Web Widget 应用自身也能够和普通 javascript 模块一样支持[导入映射](https://github.com/WICG/import-maps)后，我们会得到诸多的好处。其中之一就是版本管理。

在过去，只能通过诸如 [jsdelivr](https://www.jsdelivr.com) 一样的 NPM CDN 提供的自动更新能力或者修改 Web Widget 的 `src` 来实现版本管理，现在通过[导入映射](https://github.com/WICG/import-maps)可以将 Web Widget 应用也纳入到相同的版本管理方式中，开发者可以使用其一，或者同时使用两者。

- NPM CDN 则可以完全由应用开发者来提供更新，但是因为 CDN 和浏览器都有缓存，所以难以保证以最快的方式更新版本
- 通过导入映射是最快的切换模块版本的方式，但是它需要依赖工程额外的版本管理服务或者硬编码到页面里，应用开发者无法直接通过 NPM 来更新版本

# 产出

- 提供版本管理解决方案
- 让 Web Widget 更符合 Web 标准，有更好的生态支持

# 提议内容

为 Web Widget 容器增加 `import` 属性，它和 `src` 的区别：

`import` 属性不会自动补全路径，加载器会优先读取它的原始值去加载模块。

## 指引和例子

```html
<script type="importmap">
  {
    "imports": {
      "vue": "https://cdn.jsdelivr.net/npm/vue@3.2.22/dist/vue.runtime.esm-browser.prod.js",
      "@web-widget/container": "https://cdn.jsdelivr.net/npm/@web-widget/container/dist/esm/main.js",
      "@org/app": "https://cdn.jsdelivr.net/npm/@org/app/dist/esm/main.js"
    }
  }
</script>

<web-widget import="@org/app"></web-widget>

<script type="module">
  import '@web-widget/container';
</script>
```

## 兼容性

由于当前只有最新版本的 Chrome 浏览器支持[导入映射](https://github.com/WICG/import-maps)，通过一些现代化的开发工具配合，它能够提供较好的开发体验。对于生产环境，我们可以使用 `system` 格式来解决浏览器兼容问题。

`system` 格式被设计为 `esm` 的过渡格式，几乎所有的构建工具都支持输出它，通过 [SystemJS](https://github.com/systemjs/systemjs) 可以在浏览器中加载它。

```html
<script type="systemjs-importmap">
  {
    "imports": {
      "vue": "https://cdn.jsdelivr.net/npm/@org/vue@3.2.22/dist/system/vue.runtime.browser.prod.js",
      "@org/app": "https://cdn.jsdelivr.net/npm/@org/app/dist/system/main.js"
    }
  }
</script>

<web-widget type="system" import="@org/app"></web-widget>

<script src="dist/bootstrap.js"></script>
```

```js
// src/bootstrap.js
import 'systemjs/s.js';
import '@web-widget/container';
import '@web-widget/system-loader';
```

## 替代方案对比

[模块联邦](https://webpack.js.org/concepts/module-federation/) 是一种和[导入映射](https://github.com/WICG/import-maps)一样，能够实现运行时依赖共享的的解决方案，它和[导入映射](https://github.com/WICG/import-maps)并不冲突，甚至可以同时使用。

[模块联邦](https://webpack.js.org/concepts/module-federation/)是 Webpack5 私有格式，并且目前为止它还处于一个不稳定的状态中，同时 Webpack 没有正式支持 es module 的输出，这也限制了它的发展。
