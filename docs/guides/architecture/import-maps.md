# 容器化 >> 部署导入映射 || 41

[import maps](https://github.com/WICG/import-maps) 这样的标准将允许浏览器理解这些类型的导入，而无需转换步骤，这使得我们可以在浏览器中实现版本管理与共享依赖，而不需要 package.json 文件与构建工具。

## 导入映射

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

### 应用内部裸模块

javascript 项目中的常见做法是使用所谓的“裸模块导入”。这些是 imports 语句，它仅指定包的名称或包内的文件。

例如：

```js
import Vue from 'vue';
```

### 使用裸模块加载应用

Web Widget 应用自身也可以和“裸模块”一样，都通过导入映射来管理它，你只需要使用 `import` 属性代替 `src` 属性来加载应用。

```html
<web-widget import="@org/app"></web-widget>
```

Web Widget 容器的 `import` 与 `src` 属性的不同：`import` 属性不会自动补全路径，加载器会优先读取它的原始值去加载模块。

## 解决兼容性问题

`system` 格式被设计为 `esm` 的过渡格式，它解决了 `esm` [import maps](https://github.com/WICG/import-maps) 浏览器兼容性的问题。几乎所有的构建工具都支持输出 `system` 格式，因此我们推荐在生产环境中使用它，以便未来能够无缝过渡到 Web 标准。

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

Web Widget 提供了 [System loader](../../docs/container/plugins/system-loader.md) 插件来支持 `system` 格式。
