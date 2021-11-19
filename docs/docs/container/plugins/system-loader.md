# 容器 >> 插件 >> System-loader || 4

这是 Web Widget 的 `system` 格式插件。

## 安装

```bash
npm install --save systemjs
npm install --save @web-widget/container
npm install --save @web-widget/system-loader
```

## 使用

```html
<web-widget type="system" src="app.widget.js"></web-widget>
```

```js
import 'systemjs/s.js';
import '@web-widget/container';
import '@web-widget/system-loader';
```

## 导入映射

在 `<head>` 中部署导入映射配置。

```html
<script type="systemjs-importmap">
{
  "imports": {
    "@org/app": "https://cdn.jsdelivr.net/npm/@org/app/dist/system/main.js",
    "hello": "/system/hello.js"
  }
}
</script>
```

## 使用裸模块加载应用

Web Widget 应用自身也可以和“裸模块”一样，都通过导入映射来管理它，你只需要使用 import 属性代替 src 属性来加载应用。

```html
<web-widget import="@org/app"></web-widget>
```

Web Widget 容器的 import 与 src 属性的不同：import 属性不会自动补全路径，加载器会优先读取它的原始值去加载模块。

## 支持沙盒模式

System-loader 支持 Web Widget [沙盒模式](./sandbox.md)，在这个模式下配置少许有些不同：每个沙盒都是独立的，同样每个 [SystemJS](https://github.com/systemjs/systemjs) 实例也是不同的，因此 System-loader 需要知道它的 URL，你需要在 `systemjs-importmap` 中声明 `systemjs` 的地址。

```html
<script type="systemjs-importmap">
  {
    "imports": {
      "systemjs": "https://cdn.jsdelivr.net/npm/systemjs@6/dist/s.js",
      "@org/app": "https://cdn.jsdelivr.net/npm/@org/app/dist/system/main.js",
      "hello": "/system/hello.js"
    }
  }
</script>

<web-widget sandboxed type="system" import="@org/app"></web-widget>

<script type="module">
  import 'systemjs/s.js';
  import '@web-widget/container';
  import '@web-widget/system-loader';
  import '@web-widget/sandbox';
</script>
```

## 更多功能

[SystemJS](https://github.com/systemjs/systemjs) 更多的功能请前往其[官方文档](https://github.com/systemjs/systemjs)。