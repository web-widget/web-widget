# 容器 >> 插件 >> System-loader || 4

这是 WebWidget 的 system 格式插件。

## 安装

```bash
npm install --save systemjs
npm install --save @web-widget/system-loader
```

## 使用

```html
<web-widget type="system" src="app.widget.js"></web-widget>
```

```js
import 'systemjs/s.js';
import '@web-widget/core';
import '@web-widget/system-loader';
```

## 依赖共享

```html
<script type="systemjs-importmap">
{
  "imports": {
    "lodash": "https://unpkg.com/lodash@4.17.10/lodash.js"
  }
}
</script>
```

具体请查看 [SystemJS](https://github.com/systemjs/systemjs) 官方文档。