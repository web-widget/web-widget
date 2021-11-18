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

```html
<script type="systemjs-importmap">
{
  "imports": {
    "@org/app": "https://cdn.jsdelivr.net/npm/@org/app/dist/system/main.js"
  }
}
</script>
```

## 沙盒模式

System-loader 支持 Web Widget [沙盒模式](./sandbox.md)，在这个模式下配置少许有些不同：每个沙盒都是独立的，同样每个 [SystemJS](https://github.com/systemjs/systemjs) 实例也是不同的，因此 System-loader 需要知道它的 URL，你需要在 `systemjs-importmap` 中声明 `systemjs` 的地址。

```html
<script type="systemjs-importmap">
  {
    "imports": {
      "systemjs": "https://cdn.jsdelivr.net/npm/systemjs@6/dist/s.js",
      "hello": "/system/hello.js",
      "@main": "/system/index.widget.js"
    }
  }
</script>

<web-widget type="system" src="./index.widget.js" data-id="01"></web-widget>
<web-widget sandboxed type="system" import="@main" data-id="02"></web-widget>

<script type="module">
  import 'systemjs/s.js';
  import '@web-widget/container';
  import '@web-widget/system-loader';
  import '@web-widget/sandbox';
</script>
```

## 更多功能

[SystemJS](https://github.com/systemjs/systemjs) 更多的功能请前往其[官方文档](https://github.com/systemjs/systemjs)。